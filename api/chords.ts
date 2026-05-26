// Serverless proxy for Ultimate Guitar. The browser cannot call UG directly
// (CORS), so this server hop signs and forwards requests to UG's mobile API.
//
//   GET /api/chords?title=<song title>   search, pick the best chord version,
//                                         return its content + alternate versions
//   GET /api/chords?id=<tab id>           load one specific version (an alternate)
//
// Returns: { artist, song, capo, tuning, tonality, content, versions[] }
// `content` is UG's [ch] wiki format; the shared parser (src/music/parse.ts)
// turns it into a playable Song.
//
// We talk to api.ultimate-guitar.com (UG's mobile API), not the Cloudflare-fronted
// website. It needs a signed request: X-UG-API-KEY = md5(deviceId + UTC date-hour +
// "createLog()") with a UGT_ANDROID user agent. There is no user-supplied URL or
// host here - only a numeric id or an encoded title against one hardcoded host - so
// there is no SSRF/open-relay surface.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, randomBytes } from "node:crypto";

const API_BASE = "https://api.ultimate-guitar.com/api/v1";
const UA = "UGT_ANDROID/4.11.1 (Pixel; 8.1.0)";
const SALT = "createLog()";
const CHORDS_TYPE = "Chords";
const REQUEST_BUDGET_MS = 9000; // total upstream budget for one request, under Vercel's function limit
const MAX_TITLE = 120;
const MAX_VERSIONS = 6;
const MAX_INFO_ATTEMPTS = 3; // try the best chord version, then fall back to the next-ranked ones
const HOUR_OFFSETS = [0, -1, 1]; // tolerate UG server-clock skew when signing (hours, UTC)

// Give the function a little headroom over the upstream budget.
export const config = { maxDuration: 15 };
const STANDARD_TUNING = "E A D G B E";
const BLOCKED_MSG =
  "Ultimate Guitar is not responding right now. Paste the chord sheet to keep playing.";

// ---- Untrusted upstream shapes (verified at runtime) -------------------------

interface UgTab {
  id?: number;
  song_name?: string;
  artist_name?: string;
  type?: string;
  version?: number;
  votes?: number;
  rating?: number;
  tonality_name?: string;
}
interface UgSearch {
  tabs?: UgTab[];
}
interface UgTabInfo {
  song_name?: string;
  artist_name?: string;
  tonality_name?: string;
  capo?: number;
  tuning?: string;
  content?: string;
}

interface VersionRef {
  id: number;
  song: string;
  artist: string;
  votes: number;
  rating: number;
  version: number;
  tonality: string | null;
  type: string;
}
interface ChordsPayload {
  artist: string;
  song: string;
  capo: number;
  tuning: string | null;
  tonality: string | null;
  content: string;
  versions: VersionRef[];
}

// ---- HTTP plumbing -----------------------------------------------------------

function setCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function fail(res: VercelResponse, status: number, code: string, message: string): void {
  res.status(status).json({ error: message, code });
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

/**
 * Build UG mobile-API auth headers for a given hour offset. The key is
 * md5(deviceId + "YYYY-MM-DD:HH" + salt), where the hour is UTC shifted by
 * `hourOffset`. UG's server clock is not exactly real UTC (observed ~1h behind
 * at the day boundary), so we retry adjacent hours - see HOUR_OFFSETS / apiGet.
 */
function ugHeaders(deviceId: string, hourOffset: number): Record<string, string> {
  const date = new Date(Date.now() + hourOffset * 3_600_000).toISOString().slice(0, 13).replace("T", ":");
  const apiKey = createHash("md5").update(deviceId + date + SALT).digest("hex");
  return {
    Accept: "application/json",
    "User-Agent": UA,
    "X-UG-CLIENT-ID": deviceId,
    "X-UG-API-KEY": apiKey,
  };
}

async function apiGet(path: string, signal: AbortSignal): Promise<{ status: number; json: unknown }> {
  const deviceId = randomBytes(8).toString("hex");
  let last: { status: number; json: unknown } = { status: 0, json: null };
  // 498 = "token expired/invalid": the signature hour did not match UG's clock.
  // Retry adjacent hours before giving up; the common case (offset 0) succeeds first.
  for (const offset of HOUR_OFFSETS) {
    const res = await fetch(`${API_BASE}${path}`, { headers: ugHeaders(deviceId, offset), signal });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    last = { status: res.status, json };
    if (res.status !== 498) return last;
  }
  return last;
}

/**
 * Map a non-200 upstream status to a client error; returns true if it sent one.
 * 404 means "no such song/tab" (not_found); 403/429/498 mean UG is refusing us
 * (blocked, drop to paste); anything else is a generic upstream error.
 */
function upstreamError(res: VercelResponse, status: number): boolean {
  if (status === 200) return false;
  if (status === 404) {
    fail(res, 404, "not_found", "No chord sheet found for that title.");
  } else if (status === 403 || status === 429 || status === 498) {
    fail(res, 503, "blocked", BLOCKED_MSG);
  } else {
    fail(res, 502, "upstream_error", "Could not reach Ultimate Guitar.");
  }
  return true;
}

// ---- UG mapping --------------------------------------------------------------

function isChordTab(t: UgTab): boolean {
  return t.type === CHORDS_TYPE && typeof t.id === "number";
}

function score(t: UgTab): number {
  return (Number(t.rating) || 0) * (Number(t.votes) || 0);
}

function byScoreDesc(a: UgTab, b: UgTab): number {
  const diff = score(b) - score(a);
  return diff !== 0 ? diff : (Number(b.votes) || 0) - (Number(a.votes) || 0);
}

function toVersionRef(t: UgTab): VersionRef {
  return {
    id: Number(t.id),
    song: String(t.song_name ?? ""),
    artist: String(t.artist_name ?? ""),
    votes: Number(t.votes) || 0,
    rating: Number(t.rating) || 0,
    version: Number(t.version) || 0,
    tonality: typeof t.tonality_name === "string" && t.tonality_name ? t.tonality_name : null,
    type: String(t.type ?? CHORDS_TYPE),
  };
}

function tabInfoToPayload(json: unknown): Omit<ChordsPayload, "versions"> | null {
  const t = (json ?? {}) as UgTabInfo;
  const content = t.content;
  if (typeof content !== "string" || !content.trim()) return null;
  const tuning =
    typeof t.tuning === "string" && t.tuning && t.tuning !== STANDARD_TUNING ? t.tuning : null;
  return {
    artist: String(t.artist_name || "Unknown"),
    song: String(t.song_name || "Untitled"),
    capo: Number(t.capo) || 0,
    tuning,
    tonality: (typeof t.tonality_name === "string" && t.tonality_name) || null,
    content,
  };
}

// ---- Route handlers ----------------------------------------------------------

async function handleTitle(res: VercelResponse, raw: string, signal: AbortSignal): Promise<void> {
  const title = raw.trim();
  if (!title || title.length > MAX_TITLE) {
    return fail(res, 400, "bad_request", `Title must be 1 to ${MAX_TITLE} characters.`);
  }

  const search = await apiGet(`/tab/search?title=${encodeURIComponent(title)}&page=1`, signal);
  if (upstreamError(res, search.status)) return;
  const tabs = (search.json as UgSearch | null)?.tabs;
  if (!Array.isArray(tabs)) {
    return fail(res, 502, "parse_error", "Could not read Ultimate Guitar's response.");
  }

  const chords = tabs.filter(isChordTab).sort(byScoreDesc);
  if (chords.length === 0) return fail(res, 404, "not_found", "No chord sheet found for that title.");

  // Load the best version; if an individual tab fails to load (a removed or
  // restricted tab still listed in search), fall back to the next-ranked one
  // rather than failing the whole request.
  let payload: Omit<ChordsPayload, "versions"> | null = null;
  let chosenId = -1;
  let sawLegalBlock = false;
  for (const tab of chords.slice(0, MAX_INFO_ATTEMPTS)) {
    const info = await apiGet(`/tab/info?tab_id=${tab.id}&tab_access_type=public`, signal);
    if (info.status === 403 || info.status === 429 || info.status === 498) {
      return fail(res, 503, "blocked", BLOCKED_MSG); // UG is refusing us; do not hammer
    }
    if (info.status === 200) {
      const candidate = tabInfoToPayload(info.json);
      if (candidate) {
        payload = candidate;
        chosenId = tab.id as number;
        break;
      }
    }
    // 451 = Unavailable For Legal Reasons: UG blocks this content from the
    // server's region (some labels are takedown-blocked in the US).
    if (info.status === 451) sawLegalBlock = true;
    console.warn(`chords: skipping tab ${tab.id} for "${title}" (info status ${info.status})`);
  }
  if (!payload) {
    if (sawLegalBlock) {
      return fail(res, 451, "region_blocked", "This song is not available from the server's region. Paste the chord sheet to keep playing.");
    }
    return fail(res, 502, "upstream_error", "Could not load a chord sheet for that title.");
  }

  const versions = chords
    .filter((t) => t.id !== chosenId)
    .slice(0, MAX_VERSIONS)
    .map(toVersionRef);

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({ ...payload, versions } satisfies ChordsPayload);
}

async function handleId(res: VercelResponse, raw: string, signal: AbortSignal): Promise<void> {
  if (!/^\d{1,12}$/.test(raw)) {
    return fail(res, 400, "bad_request", "Invalid tab id.");
  }

  const info = await apiGet(`/tab/info?tab_id=${raw}&tab_access_type=public`, signal);
  if (upstreamError(res, info.status)) return;
  const payload = tabInfoToPayload(info.json);
  if (!payload) return fail(res, 502, "parse_error", "The chord sheet had no readable content.");

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({ ...payload, versions: [] } satisfies ChordsPayload);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    return fail(res, 405, "bad_request", "Use GET.");
  }

  const id = firstParam(req.query.id);
  const title = firstParam(req.query.title);

  // One shared deadline across all upstream calls, so the fallback loop can
  // never exceed the function's time budget.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_BUDGET_MS);
  try {
    if (id) return await handleId(res, id, controller.signal);
    if (title) return await handleTitle(res, title, controller.signal);
    return fail(res, 400, "bad_request", "Provide a ?title= to search or an ?id= to load.");
  } catch (err) {
    if (isAbortError(err)) {
      return fail(res, 504, "timeout", "Ultimate Guitar took too long to respond.");
    }
    console.error("chords: upstream fetch threw", err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    return fail(res, 502, "upstream_error", "Could not reach Ultimate Guitar.");
  } finally {
    clearTimeout(timer);
  }
}
