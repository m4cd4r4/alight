// Play-along input: paste a YouTube link (or upload an audio file) and the
// self-hosted ChordMini backend returns beat-accurate chords, beats, and synced
// lyrics. The analyze flow lives in ../youtube/analyze.ts (shared with the
// in-app YouTube search). Analysis runs server-side and takes a minute or two.

import { type FormEvent, useRef, useState } from "react";
import type { Timeline } from "../music/timeline.ts";
import type { Song } from "../music/types.ts";
import { analyzeAudioFile, analyzeYoutube } from "../youtube/analyze.ts";
import { videoIdFromUrl } from "../youtube/extract.ts";

type Stage = "idle" | "analysing";

type LoadHandler = (song: Song, timeline?: Timeline | null) => void;

export function AnalyzeInput({ onLoad }: { onLoad: LoadHandler }) {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = stage !== "idle";

  async function analyseUrl(e: FormEvent) {
    e.preventDefault();
    const link = url.trim();
    if (!link || busy) return;
    if (!videoIdFromUrl(link)) {
      setError("That does not look like a YouTube link.");
      return;
    }
    setError(null);
    setStage("analysing");
    const r = await analyzeYoutube(link);
    setStage("idle");
    if (r.ok) onLoad(r.song, r.timeline);
    else setError(r.error);
  }

  async function analyseFile(file: File) {
    if (busy) return;
    setError(null);
    if (file.size > 3_200_000) {
      setError("That file is too large (about 3MB max here). Try a shorter clip or a lower-bitrate file.");
      return;
    }
    setStage("analysing");
    const r = await analyzeAudioFile(file);
    setStage("idle");
    if (r.ok) onLoad(r.song, r.timeline);
    else setError(r.error);
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
          {stage === "analysing" ? "Analysing" : "Play along"}
        </button>
      </form>
      <div className="analyze-sub">
        {stage === "analysing" ? (
          <span className="analyze-progress"><span className="spinner" />Analysing the audio - this can take a minute or two.</span>
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
