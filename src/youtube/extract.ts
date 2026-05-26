// Browser-side YouTube audio extraction.
//
// YouTube has SABR-locked the VPS IP, so server-side yt-dlp returns only
// storyboard images for popular videos. The way out (same trick chordmini.me
// uses in production) is to run the extraction in the user's browser via the
// Vercel CORS relay - Vercel's IP pool is treated more leniently than a
// single static datacentre IP. Once we have the audio bytes in the browser,
// the existing /api/analyze base64-upload path takes over.

import { Innertube, UniversalCache } from "youtubei.js/web";
import { storedGate } from "../gate.ts";

const YT_HOSTS_RE = /^https?:\/\/([\w-]+\.)*(youtube\.com|googlevideo\.com|ytimg\.com|ggpht\.com|youtube-nocookie\.com)/i;

export interface YoutubeExtraction {
  audio: Uint8Array;
  ext: "m4a" | "webm";
  title: string;
  artist: string;
  duration: number;
}

/** Pull the 11-char video id from a watch / youtu.be / shorts URL. */
export function videoIdFromUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.hostname.replace(/^www\./, "") === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0] || "";
      return /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{6,}$/.test(v)) return v;
      const m = u.pathname.match(/^\/(shorts|embed|v|live)\/([\w-]+)/);
      if (m && /^[\w-]{6,}$/.test(m[2])) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Route every YouTube / googlevideo call through our gated CORS relay. The
 * relay overrides User-Agent + Referer server-side so YouTube sees a real
 * browser, and forwards Innertube auth headers (X-YouTube-Client-*) untouched.
 */
async function proxiedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // youtubei.js sometimes calls fetch with a Request object instead of (url, init).
  // We must lift method, headers and body off the Request - otherwise POSTs (notably
  // the Innertube /v1/player call) silently degrade to GETs and YouTube returns 405.
  const isRequest = typeof Request !== "undefined" && input instanceof Request;
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (!YT_HOSTS_RE.test(url)) return fetch(input, init);

  const reqHeaders = isRequest ? input.headers : new Headers();
  const headers = new Headers(reqHeaders);
  if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  headers.set("x-alight-gate", storedGate());

  const method = (init?.method || (isRequest ? input.method : "GET")).toUpperCase();
  const safeInit: RequestInit = { headers, method };
  if (method !== "GET" && method !== "HEAD") {
    // Prefer the explicit init.body; fall back to the Request's body stream.
    if (init && "body" in init && init.body != null) safeInit.body = init.body;
    else if (isRequest && input.body) safeInit.body = await input.arrayBuffer();
  }
  return fetch(`/api/yt-proxy?url=${encodeURIComponent(url)}`, safeInit);
}

function pickExt(mime: string | undefined): "m4a" | "webm" {
  return mime && /webm|opus/i.test(mime) ? "webm" : "m4a";
}

export async function extractYoutubeAudio(input: string): Promise<YoutubeExtraction> {
  const videoId = videoIdFromUrl(input);
  if (!videoId) throw new Error("That does not look like a YouTube link.");

  const yt = await Innertube.create({ fetch: proxiedFetch, cache: new UniversalCache(false) });
  const info = await yt.getInfo(videoId);

  // chooseFormat picks a single playable audio stream (m4a or webm/opus).
  const format = info.chooseFormat({ type: "audio", quality: "best" });
  if (!format || typeof format.decipher !== "function") {
    throw new Error("YouTube returned no playable audio format.");
  }
  const streamUrl = await format.decipher(yt.session.player);
  if (!streamUrl) throw new Error("YouTube returned no playable audio format.");

  const audioResp = await proxiedFetch(streamUrl);
  if (!audioResp.ok) throw new Error(`The audio download failed (HTTP ${audioResp.status}).`);
  const audio = new Uint8Array(await audioResp.arrayBuffer());
  if (audio.byteLength < 1024) throw new Error("The downloaded audio was empty.");

  const meta = info.basic_info;
  return {
    audio,
    ext: pickExt(format.mime_type),
    title: (meta.title || "").trim(),
    artist: (meta.author || "").trim(),
    duration: Number(meta.duration) || 0,
  };
}
