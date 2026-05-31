// Shared client-side analyze flow: hand a YouTube URL or an audio file to the
// gated /api/analyze proxy and turn the ChordMini response into a { song,
// timeline }. Used by both the paste-a-link input and the in-app YouTube search,
// so the contract lives in exactly one place.

import { storedGate } from "../gate.ts";
import { fromChordMini, timelineSymbols, type ChordMiniAnalysis, type Timeline } from "../music/timeline.ts";
import type { Song } from "../music/types.ts";

interface AnalyzeResponse extends ChordMiniAnalysis {
  meta?: { title?: string; artist?: string; duration?: number };
}

export type AnalyzeResult =
  | { ok: true; song: Song; timeline: Timeline }
  | { ok: false; error: string };

/** Trim YouTube title noise like "(Official Video)" / "[Lyrics]" / "(4K Remaster)". */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[([][^)\]]*(official|lyric|audio|video|remaster|hd|4k|mv|visualizer)[^)\]]*[)\]]/gi, "")
    .trim();
}

function toResult(data: AnalyzeResponse): AnalyzeResult {
  const timeline = fromChordMini({ chords: data.chords, beats: data.beats, lyrics: data.lyrics });
  if (timeline.chords.length === 0) return { ok: false, error: "No chords were found in that audio." };
  const meta = data.meta ?? {};
  const song: Song = {
    title: cleanTitle(meta.title ?? "") || meta.title?.trim() || "Untitled",
    artist: (meta.artist ?? "").trim(),
    capoNote: "",
    chords: timelineSymbols(timeline),
  };
  return { ok: true, song, timeline };
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || `Analysis failed (${res.status}).`;
  } catch {
    return `Analysis failed (${res.status}).`;
  }
}

/** Encode bytes to base64 in chunks (avoids the fromCharCode arg-count limit). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function post(body: unknown): Promise<AnalyzeResult> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-alight-gate": storedGate() },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, error: await readError(res) };
    return toResult((await res.json()) as AnalyzeResponse);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach the analysis service." };
  }
}

export function analyzeYoutube(url: string): Promise<AnalyzeResult> {
  return post({ youtubeUrl: url });
}

export async function analyzeAudioFile(file: File): Promise<AnalyzeResult> {
  const ext = (file.name.match(/\.([\w]+)$/)?.[1] || "mp3").toLowerCase();
  const audioBase64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
  return post({ audioBase64, ext, title: file.name.replace(/\.[^.]+$/, ""), artist: "" });
}
