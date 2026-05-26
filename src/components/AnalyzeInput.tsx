// Play-along input: paste a YouTube link (or upload an audio file) and the
// self-hosted ChordMini backend returns beat-accurate chords, beats, and synced
// lyrics. The tested fromChordMini() maps the response to a Timeline, which the
// Play view animates. Analysis runs server-side and takes a minute or two.

import { type FormEvent, useRef, useState } from "react";
import { storedGate } from "../gate.ts";
import { fromChordMini, timelineSymbols, type ChordMiniAnalysis, type Timeline } from "../music/timeline.ts";
import type { Song } from "../music/types.ts";

type LoadHandler = (song: Song, timeline?: Timeline | null) => void;

interface AnalyzeResponse extends ChordMiniAnalysis {
  meta?: { title?: string; artist?: string; duration?: number };
}

/** Encode bytes to base64 in chunks (avoids the arg-count limit of fromCharCode). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Trim YouTube title noise like "(Official Video)" / "[Lyrics]" / "(4K Remaster)". */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[([][^)\]]*(official|lyric|audio|video|remaster|hd|4k|mv|visualizer)[^)\]]*[)\]]/gi, "")
    .trim();
}

function songFromAnalysis(data: AnalyzeResponse): { song: Song; timeline: Timeline } | null {
  const timeline = fromChordMini({ chords: data.chords, beats: data.beats, lyrics: data.lyrics });
  if (timeline.chords.length === 0) return null;
  const meta = data.meta ?? {};
  const song: Song = {
    title: cleanTitle(meta.title ?? "") || meta.title?.trim() || "Untitled",
    artist: (meta.artist ?? "").trim(),
    capoNote: "",
    chords: timelineSymbols(timeline),
  };
  return { song, timeline };
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || `Analysis failed (${res.status}).`;
  } catch {
    return `Analysis failed (${res.status}).`;
  }
}

export function AnalyzeInput({ onLoad }: { onLoad: LoadHandler }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function finish(data: AnalyzeResponse) {
    const result = songFromAnalysis(data);
    if (!result) {
      setError("No chords were found in that audio.");
      return;
    }
    onLoad(result.song, result.timeline);
  }

  async function analyseUrl(e: FormEvent) {
    e.preventDefault();
    const link = url.trim();
    if (!link || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-alight-gate": storedGate() },
        body: JSON.stringify({ youtubeUrl: link }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      await finish((await res.json()) as AnalyzeResponse);
    } catch {
      setError("Could not reach the analysis service.");
    } finally {
      setBusy(false);
    }
  }

  async function analyseFile(file: File) {
    if (busy) return;
    setError(null);
    if (file.size > 3_200_000) {
      setError("That file is too large (about 3MB max here). Try a shorter clip or a lower-bitrate file.");
      return;
    }
    setBusy(true);
    try {
      const audioBase64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-alight-gate": storedGate() },
        body: JSON.stringify({ audioBase64, title: file.name.replace(/\.[^.]+$/, ""), artist: "" }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      await finish((await res.json()) as AnalyzeResponse);
    } catch {
      setError("Could not reach the analysis service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="analyze-block">
      <div className="t-label-caps">Play along with a recording</div>
      <form className="analyze-field" onSubmit={analyseUrl}>
        <input
          type="url"
          inputMode="url"
          placeholder="Paste a YouTube link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
          aria-label="YouTube link"
        />
        <button type="submit" className="btn-primary" disabled={busy || url.trim().length === 0}>
          {busy ? "Analysing" : "Play along"}
        </button>
      </form>
      <div className="analyze-sub">
        {busy ? (
          <span className="analyze-progress"><span className="spinner" />Downloading and analysing - this takes a minute or two.</span>
        ) : (
          <>
            Chords, beats and lyrics in time.{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              Or upload an audio file
            </button>
            .
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) analyseFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {error ? <div className="paste-error">{error}</div> : null}
    </div>
  );
}
