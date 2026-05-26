// Serverless proxy: Alight -> the self-hosted ChordMini backend.
//
//   POST /api/analyze   { "youtubeUrl": "https://..." }   (application/json)
//   POST /api/analyze   <raw audio bytes>                  (audio/* or octet-stream)
//                       with ?title=&artist= for the lyrics lookup
//
// Returns the ChordMini analysis the client's fromChordMini() maps to a Timeline:
//   { chords, beats, lyrics, meta: { title, artist, duration } }
//
// The browser cannot call the backend directly (the backend holds no auth of its
// own - the bearer token gates it at nginx, and that token must never reach the
// client). So this server hop holds CHORDMINI_TOKEN and talks to CHORDMINI_URL.
// The whole deploy sits behind Vercel Password Protection, so this route is only
// reachable by the authenticated owner.
//
// Flow (sequential - the backend runs a single worker):
//   YouTube: yt-download -> recognize-chords -> detect-beats -> lrclib-lyrics
//   Upload:  recognize-chords -> detect-beats  (lyrics only if title/artist given)
// Download + chords are required; beats + lyrics are best-effort.

import type { VercelRequest, VercelResponse } from "@vercel/node";

// Pro plan: allow a long synchronous analysis. yt-download caps song length, so
// this bounds a full-song CPU analysis comfortably.
export const config = { maxDuration: 300 };

const CHORD_DETECTOR = "chord-cnn-lstm";
const BEAT_DETECTOR = "madmom";
const DOWNLOAD_TIMEOUT_MS = 290_000;
const ANALYSE_TIMEOUT_MS = 250_000;
const LYRICS_TIMEOUT_MS = 20_000;
const MAX_UPLOAD_BYTES = 4_400_000; // just under Vercel's ~4.5MB body limit

interface YtDownload {
  audio_path: string;
  audioUrl?: string;
  title?: string;
  artist?: string;
  duration?: number;
}

function backendBase(): string | null {
  const url = process.env.CHORDMINI_URL;
  return url ? url.replace(/\/$/, "") : null;
}

function authHeader(): Record<string, string> {
  const token = process.env.CHORDMINI_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fail(res: VercelResponse, status: number, code: string, message: string): void {
  res.status(status).json({ error: message, code });
}

async function postJson(path: string, body: unknown, timeoutMs: number): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${backendBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let json: unknown = null;
    try {
      json = await r.json();
    } catch {
      json = null;
    }
    return { status: r.status, json };
  } finally {
    clearTimeout(timer);
  }
}

async function postForm(path: string, fields: Record<string, string>, timeoutMs: number): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    const r = await fetch(`${backendBase()}${path}`, {
      method: "POST",
      headers: authHeader(),
      body: form,
      signal: controller.signal,
    });
    let json: unknown = null;
    try {
      json = await r.json();
    } catch {
      json = null;
    }
    return { status: r.status, json };
  } finally {
    clearTimeout(timer);
  }
}

async function postAudio(path: string, audio: Buffer, fields: Record<string, string>, timeoutMs: number): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }), "upload.mp3");
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    const r = await fetch(`${backendBase()}${path}`, {
      method: "POST",
      headers: authHeader(),
      body: form,
      signal: controller.signal,
    });
    let json: unknown = null;
    try {
      json = await r.json();
    } catch {
      json = null;
    }
    return { status: r.status, json };
  } finally {
    clearTimeout(timer);
  }
}

/** chords + beats for an audio reference, plus lyrics when artist/title are known. */
async function analyse(
  res: VercelResponse,
  chordCall: () => Promise<{ status: number; json: unknown }>,
  beatCall: () => Promise<{ status: number; json: unknown }>,
  title: string,
  artist: string,
  duration: number,
): Promise<void> {
  const chords = await chordCall();
  if (chords.status !== 200 || !chords.json) {
    return fail(res, 502, "analysis_failed", "The chord analysis failed for that audio.");
  }

  // Beats and lyrics are best-effort; a missing piece still yields a usable timeline.
  let beats: unknown = null;
  try {
    const b = await beatCall();
    if (b.status === 200) beats = b.json;
  } catch {
    /* keep beats null */
  }

  let lyrics: unknown = null;
  if (title) {
    try {
      const l = await postJson("/api/lrclib-lyrics", { artist, title }, LYRICS_TIMEOUT_MS);
      if (l.status === 200) lyrics = l.json;
    } catch {
      /* keep lyrics null */
    }
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ chords: chords.json, beats, lyrics, meta: { title, artist, duration } });
}

async function handleYoutube(res: VercelResponse, youtubeUrl: string): Promise<void> {
  const dl = await postJson("/api/alight/yt-download", { url: youtubeUrl }, DOWNLOAD_TIMEOUT_MS);
  if (dl.status !== 200 || !dl.json || typeof (dl.json as YtDownload).audio_path !== "string") {
    const detail = (dl.json as { error?: string } | null)?.error;
    return fail(res, 502, "download_failed", detail || "Could not fetch audio for that link.");
  }
  const d = dl.json as YtDownload;
  const audioPath = d.audio_path;
  await analyse(
    res,
    () => postForm("/api/recognize-chords", { audio_path: audioPath, detector: CHORD_DETECTOR }, ANALYSE_TIMEOUT_MS),
    () => postForm("/api/detect-beats", { audio_path: audioPath, detector: BEAT_DETECTOR }, ANALYSE_TIMEOUT_MS),
    d.title || "",
    d.artist || "",
    Number(d.duration) || 0,
  );
}

async function handleUpload(res: VercelResponse, audio: Buffer, title: string, artist: string): Promise<void> {
  if (audio.length === 0) return fail(res, 400, "bad_request", "Empty upload.");
  if (audio.length > MAX_UPLOAD_BYTES) {
    return fail(res, 413, "too_large", "That file is too large to upload here (about 4MB max). Use a YouTube link instead.");
  }
  await analyse(
    res,
    () => postAudio("/api/recognize-chords", audio, { detector: CHORD_DETECTOR }, ANALYSE_TIMEOUT_MS),
    () => postAudio("/api/detect-beats", audio, { detector: BEAT_DETECTOR }, ANALYSE_TIMEOUT_MS),
    title,
    artist,
    0,
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return fail(res, 405, "bad_request", "Use POST.");
  if (!backendBase() || !process.env.CHORDMINI_TOKEN) {
    return fail(res, 503, "not_configured", "Audio analysis is not configured on this deployment.");
  }

  const contentType = String(req.headers["content-type"] || "");
  try {
    if (contentType.includes("application/json")) {
      const body = (req.body ?? {}) as { youtubeUrl?: string };
      const url = (body.youtubeUrl || "").trim();
      if (!url) return fail(res, 400, "bad_request", "Provide a youtubeUrl, or POST audio bytes.");
      return await handleYoutube(res, url);
    }
    // Otherwise treat the body as raw audio bytes (upload fallback).
    const body = req.body;
    const audio = Buffer.isBuffer(body) ? body : typeof body === "string" ? Buffer.from(body) : null;
    if (!audio) return fail(res, 400, "bad_request", "Send JSON { youtubeUrl } or raw audio bytes.");
    const title = String((req.query.title as string) || "").trim();
    const artist = String((req.query.artist as string) || "").trim();
    return await handleUpload(res, audio, title, artist);
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    if (aborted) return fail(res, 504, "timeout", "The analysis took too long. Try a shorter song.");
    console.error("analyze: unexpected error", err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    return fail(res, 502, "upstream_error", "The analysis service had a problem.");
  }
}
