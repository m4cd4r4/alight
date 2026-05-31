// Gated proxy for YouTube search. Lets the app find videos in-app without
// leaving for youtube.com. Holds the YouTube Data API key server-side (never
// exposed to the browser) and calls search.list.
//
//   GET /api/youtube-search?q=<query>   (x-alight-gate header required)
//   -> { results: [{ id, title, channel, thumbnail }] }
//
// Gated with the same password as /api/analyze so the daily quota can't be
// burned by anyone who finds the endpoint. Only embeddable videos are returned,
// so the in-app preview always plays.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { maxDuration: 10 };

const GATE_PASSWORD = process.env.ALIGHT_PASSWORD || "alight2026";
const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const MAX_RESULTS = 12;
const MAX_QUERY = 100;
const REQUEST_TIMEOUT_MS = 9000;

interface YtThumb {
  url?: string;
}
interface YtSnippet {
  title?: string;
  channelTitle?: string;
  thumbnails?: { medium?: YtThumb; default?: YtThumb };
}
interface YtItem {
  id?: { videoId?: string };
  snippet?: YtSnippet;
}
interface YtSearch {
  items?: YtItem[];
}
interface Result {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

function setCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-alight-gate");
}

function fail(res: VercelResponse, status: number, code: string, message: string): void {
  res.status(status).json({ error: message, code });
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

// search.list returns titles with HTML entities (&amp;, &#39;); decode for display.
const ENTITIES: Record<string, string> = { amp: "&", "#39": "'", "#x27": "'", quot: '"', lt: "<", gt: ">" };
function decodeEntities(s: string): string {
  return s.replace(/&(amp|#39|#x27|quot|lt|gt);/g, (_m, e: string) => ENTITIES[e] ?? _m);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") return fail(res, 405, "bad_request", "Use GET.");
  if (String(req.headers["x-alight-gate"] || "") !== GATE_PASSWORD) {
    return fail(res, 401, "locked", "This tool is locked.");
  }
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return fail(res, 503, "not_configured", "YouTube search is not configured on this deployment.");

  const q = (firstParam(req.query.q) || "").trim();
  if (!q) return fail(res, 400, "bad_request", "Provide a ?q= search query.");
  if (q.length > MAX_QUERY) return fail(res, 400, "bad_request", `Query must be 1 to ${MAX_QUERY} characters.`);

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    maxResults: String(MAX_RESULTS),
    q,
    key,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(`${SEARCH_URL}?${params.toString()}`, { signal: controller.signal });
    if (!r.ok) {
      // 403 from the Data API is almost always quota exhaustion or a key problem.
      if (r.status === 403) return fail(res, 503, "quota", "YouTube search is unavailable right now (daily limit). Paste a link or try later.");
      return fail(res, 502, "upstream_error", "YouTube search failed.");
    }
    const json = (await r.json().catch(() => null)) as YtSearch | null;
    const results: Result[] = (json?.items ?? [])
      .filter((it) => typeof it.id?.videoId === "string")
      .map((it) => ({
        id: it.id!.videoId as string,
        title: decodeEntities(it.snippet?.title ?? ""),
        channel: decodeEntities(it.snippet?.channelTitle ?? ""),
        thumbnail: it.snippet?.thumbnails?.medium?.url ?? it.snippet?.thumbnails?.default?.url ?? "",
      }));

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    res.status(200).json({ results });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return fail(res, 504, "timeout", "YouTube search took too long.");
    }
    return fail(res, 502, "upstream_error", "YouTube search failed.");
  } finally {
    clearTimeout(timer);
  }
}
