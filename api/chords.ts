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
const TIMEOUT_MS = 8000;
const MAX_TITLE = 120;
const MAX_VERSIONS = 6;
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

/** Build UG mobile-API auth headers. The key is valid for the current UTC hour. */
function ugHeaders(): Record<string, string> {
  const deviceId = randomBytes(8).toString("hex");
  const date = new Date().toISOString().slice(0, 13).replace("T", ":"); // YYYY-MM-DD:HH (UTC)
  const apiKey = createHash("md5").update(deviceId + date + SALT).digest("hex");
  return {
    Accept: "application/json",
    "User-Agent": UA,
    "X-UG-CLIENT-ID": deviceId,
    "X-UG-API-KEY": apiKey,
  };
}

async function apiGet(path: string): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: ugHeaders(), signal: controller.signal });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

/** Map an upstream status to a client error, or null when it is a clean 200. */
function upstreamError(res: VercelResponse, status: number): boolean {
  if (status === 200) return false;
  if (status === 403 || status === 429 || status === 498) {
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

async function handleTitle(res: VercelResponse, raw: string): Promise<void> {
  const title = raw.trim();
  if (!title || title.length > MAX_TITLE) {
    return fail(res, 400, "bad_request", `Title must be 1 to ${MAX_TITLE} characters.`);
  }

  const search = await apiGet(`/tab/search?title=${encodeURIComponent(title)}&page=1`);
  if (upstreamError(res, search.status)) return;
  const tabs = (search.json as UgSearch | null)?.tabs;
  if (!Array.isArray(tabs)) {
    return fail(res, 502, "parse_error", "Could not read Ultimate Guitar's response.");
  }

  const chords = tabs.filter(isChordTab).sort(byScoreDesc);
  const best = chords[0];
  if (!best) return fail(res, 404, "not_found", "No chord sheet found for that title.");

  const info = await apiGet(`/tab/info?tab_id=${best.id}&tab_access_type=public`);
  if (upstreamError(res, info.status)) return;
  const payload = tabInfoToPayload(info.json);
  if (!payload) return fail(res, 502, "parse_error", "The chord sheet had no readable content.");

  const versions = chords
    .filter((t) => t.id !== best.id)
    .slice(0, MAX_VERSIONS)
    .map(toVersionRef);

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({ ...payload, versions } satisfies ChordsPayload);
}

async function handleId(res: VercelResponse, raw: string): Promise<void> {
  if (!/^\d{1,12}$/.test(raw)) {
    return fail(res, 400, "bad_request", "Invalid tab id.");
  }

  const info = await apiGet(`/tab/info?tab_id=${raw}&tab_access_type=public`);
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

  try {
    if (id) return await handleId(res, id);
    if (title) return await handleTitle(res, title);
    return fail(res, 400, "bad_request", "Provide a ?title= to search or an ?id= to load.");
  } catch (err) {
    if (isAbortError(err)) {
      return fail(res, 504, "timeout", "Ultimate Guitar took too long to respond.");
    }
    return fail(res, 502, "upstream_error", "Could not reach Ultimate Guitar.");
  }
}
