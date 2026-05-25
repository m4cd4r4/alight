// Serverless proxy for Ultimate Guitar. The browser cannot scrape UG directly
// (CORS + Cloudflare + a browser User-Agent are all required), so this server
// hop does it. It parses untrusted upstream HTML/JSON, so every read is guarded
// and no raw upstream error is ever reflected back to the client.
//
//   GET /api/chords?title=<song title>   search, pick the best chord version,
//                                         return its content + alternate versions
//   GET /api/chords?url=<ug tab url>      fetch one specific version (an alternate)
//
// Returns: { artist, song, capo, tuning, tonality, content, versions[] }
// The shared parser (src/music/parse.ts) turns `content` into a playable Song.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SEARCH_URL = "https://www.ultimate-guitar.com/search.php";
const TIMEOUT_MS = 8000;
const MAX_TITLE = 120;
const MAX_URL = 300;
const MAX_VERSIONS = 6;
const MAX_REDIRECTS = 4;
const MAX_BYTES = 3_000_000; // cap the upstream body; UG chord pages are far smaller
const STANDARD_TUNING = "E A D G B E";
const BLOCKED_MSG =
  "Ultimate Guitar is blocking automated requests right now. Paste the chord sheet to keep playing.";

const STORE_RE = /class="js-store"\s+data-content="([^"]*)"/;

// ---- Untrusted upstream shapes (everything optional, verified at runtime) ----

interface UgTuning {
  value?: string;
}
interface UgMeta {
  capo?: number | string;
  tuning?: UgTuning;
  tonality?: string;
}
interface UgTabView {
  wiki_tab?: { content?: string };
  meta?: UgMeta;
}
interface UgTab {
  artist_name?: string;
  song_name?: string;
  tonality_name?: string;
}
interface UgResult {
  type?: string;
  song_name?: string;
  artist_name?: string;
  tab_url?: string;
  votes?: number;
  rating?: number;
  version?: number;
  tonality_name?: string;
  marketing_type?: string;
}
interface UgData {
  results?: UgResult[];
  tab?: UgTab;
  tab_view?: UgTabView;
}
interface UgStore {
  store?: { page?: { data?: UgData } };
}

interface VersionRef {
  song: string;
  artist: string;
  url: string;
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
 * Fetch a UG URL with a browser User-Agent. Redirects are followed manually and
 * only when they stay on an Ultimate Guitar host, which closes the redirect-based
 * SSRF bypass (a UG open-redirect cannot bounce us to an internal/metadata host).
 * The caller must have already validated `startUrl` as a UG URL.
 */
async function fetchUgText(startUrl: string): Promise<{ status: number; ok: boolean; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let url = startUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
        redirect: "manual",
        signal: controller.signal,
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        const next = location ? toUgUrl(location, url) : null;
        if (!next) return { status: 502, ok: false, text: "" }; // redirect left the allowlist; refuse
        url = next;
        continue;
      }

      const declared = Number(res.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > MAX_BYTES) {
        return { status: 502, ok: false, text: "" };
      }
      const text = await res.text();
      return { status: res.status, ok: res.ok, text: text.slice(0, MAX_BYTES) };
    }
    return { status: 502, ok: false, text: "" }; // too many redirects
  } finally {
    clearTimeout(timer);
  }
}

// ---- UG parsing --------------------------------------------------------------

/** HTML-decode the js-store data-content attribute. `&amp;` resolves last. */
function decodeAttr(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function extractStore(html: string): UgData | null {
  const m = html.match(STORE_RE);
  if (!m) return null;
  try {
    const parsed = JSON.parse(decodeAttr(m[1])) as UgStore;
    return parsed.store?.page?.data ?? null;
  } catch {
    return null;
  }
}

/** A usable result is a text chord sheet (not Pro/Tab/Bass/Official) with a URL. */
function isUsable(r: UgResult): boolean {
  return typeof r.tab_url === "string" && r.type === "Chords" && !r.marketing_type;
}

function score(r: UgResult): number {
  return (Number(r.rating) || 0) * (Number(r.votes) || 0);
}

function byScoreDesc(a: UgResult, b: UgResult): number {
  const diff = score(b) - score(a);
  return diff !== 0 ? diff : (Number(b.votes) || 0) - (Number(a.votes) || 0);
}

function toVersionRef(r: UgResult, url: string): VersionRef {
  return {
    song: String(r.song_name ?? ""),
    artist: String(r.artist_name ?? ""),
    url,
    votes: Number(r.votes) || 0,
    rating: Number(r.rating) || 0,
    version: Number(r.version) || 0,
    tonality: typeof r.tonality_name === "string" && r.tonality_name ? r.tonality_name : null,
    type: String(r.type ?? "Chords"),
  };
}

/** Pull the playable content + metadata out of a tab page's store. */
function tabPayload(
  data: UgData | null,
  fallback?: { artist?: string; song?: string },
): Omit<ChordsPayload, "versions"> | null {
  const view = data?.tab_view;
  const content = view?.wiki_tab?.content;
  if (typeof content !== "string" || !content.trim()) return null;

  const tab = data?.tab ?? {};
  const meta = view?.meta ?? {};
  const tuning = typeof meta.tuning?.value === "string" ? meta.tuning.value : null;
  const tonality =
    (typeof meta.tonality === "string" && meta.tonality) ||
    (typeof tab.tonality_name === "string" && tab.tonality_name) ||
    null;

  return {
    artist: String(tab.artist_name || fallback?.artist || "Unknown"),
    song: String(tab.song_name || fallback?.song || "Untitled"),
    capo: Number(meta.capo) || 0,
    tuning: tuning && tuning !== STANDARD_TUNING ? tuning : null,
    tonality: tonality || null,
    content,
  };
}

/** Only https Ultimate Guitar hosts. Closes the open-relay hole. */
function isUltimateGuitarUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  return host === "ultimate-guitar.com" || host.endsWith(".ultimate-guitar.com");
}

/**
 * Resolve a possibly-relative UG link against a base and return it only if the
 * result is a valid UG URL. Used to validate tab URLs that come from untrusted
 * upstream JSON before we fetch them.
 */
function toUgUrl(raw: string, base = "https://www.ultimate-guitar.com"): string | null {
  let resolved: string;
  try {
    resolved = new URL(raw, base).toString();
  } catch {
    return null;
  }
  return isUltimateGuitarUrl(resolved) ? resolved : null;
}

// ---- Route handlers ----------------------------------------------------------

async function handleTitle(res: VercelResponse, raw: string): Promise<void> {
  const title = raw.trim();
  if (!title || title.length > MAX_TITLE) {
    return fail(res, 400, "bad_request", `Title must be 1 to ${MAX_TITLE} characters.`);
  }

  const search = await fetchUgText(`${SEARCH_URL}?search_type=title&value=${encodeURIComponent(title)}`);
  if (search.status === 403) return fail(res, 503, "blocked", BLOCKED_MSG);
  if (!search.ok) return fail(res, 502, "upstream_error", "Ultimate Guitar search failed.");

  const data = extractStore(search.text);
  if (!Array.isArray(data?.results)) {
    return fail(res, 502, "parse_error", "Could not read Ultimate Guitar's response.");
  }

  const usable = data.results.filter(isUsable).sort(byScoreDesc);
  const best = usable[0];
  const bestUrl = best && typeof best.tab_url === "string" ? toUgUrl(best.tab_url) : null;
  if (!best || !bestUrl) {
    return fail(res, 404, "not_found", "No chord sheet found for that title.");
  }

  const page = await fetchUgText(bestUrl);
  if (page.status === 403) return fail(res, 503, "blocked", BLOCKED_MSG);
  if (!page.ok) return fail(res, 502, "upstream_error", "Could not load the chord sheet.");

  const payload = tabPayload(extractStore(page.text), {
    artist: best.artist_name,
    song: best.song_name,
  });
  if (!payload) return fail(res, 502, "parse_error", "The chord sheet had no readable content.");

  const versions: VersionRef[] = [];
  for (const r of usable) {
    if (versions.length >= MAX_VERSIONS) break;
    if (r === best || typeof r.tab_url !== "string") continue;
    const url = toUgUrl(r.tab_url);
    if (url) versions.push(toVersionRef(r, url));
  }

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({ ...payload, versions } satisfies ChordsPayload);
}

async function handleUrl(res: VercelResponse, raw: string): Promise<void> {
  if (raw.length > MAX_URL || !isUltimateGuitarUrl(raw)) {
    return fail(res, 400, "bad_request", "Only ultimate-guitar.com URLs are allowed.");
  }

  const page = await fetchUgText(raw);
  if (page.status === 403) return fail(res, 503, "blocked", BLOCKED_MSG);
  if (!page.ok) return fail(res, 502, "upstream_error", "Could not load the chord sheet.");

  const payload = tabPayload(extractStore(page.text));
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

  const url = firstParam(req.query.url);
  const title = firstParam(req.query.title);

  try {
    if (url) return await handleUrl(res, url);
    if (title) return await handleTitle(res, title);
    return fail(res, 400, "bad_request", "Provide a ?title= to search or a ?url= to fetch.");
  } catch (err) {
    if (isAbortError(err)) {
      return fail(res, 504, "timeout", "Ultimate Guitar took too long to respond.");
    }
    return fail(res, 502, "upstream_error", "Could not reach Ultimate Guitar.");
  }
}
