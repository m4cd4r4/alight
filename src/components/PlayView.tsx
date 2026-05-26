// Root of the Play view. Steps through a song one chord at a time.
// Spacebar / right arrow = next, left arrow = back. The voicing engine
// derives the keys; the keyboards light exactly what it produces.

import { useCallback, useEffect, useMemo, useState } from "react";
import { prettify } from "../music/notes.ts";
import type { Song, Voicing } from "../music/types.ts";
import { voiceSong } from "../music/voicing.ts";
import { ChordLabel } from "./ChordLabel.tsx";
import { Segmented, ToggleSwitch } from "./Controls.tsx";
import { Keyboard } from "./Keyboard.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { Transport } from "./Transport.tsx";

const VOICING_OPTIONS: { value: Voicing; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "full", label: "Full" },
];

export function PlayView({
  song,
  onBack,
  theme,
  onToggleTheme,
}: {
  song: Song;
  onBack?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [voicing, setVoicing] = useState<Voicing>("simple");
  const [fingering, setFingering] = useState(true);

  const steps = useMemo(() => voiceSong(song.chords, voicing), [song.chords, voicing]);
  const count = steps.length;

  const cur = steps[idx];
  const next = steps[(idx + 1) % count];

  const goPrev = useCallback(() => setIdx((i) => (i - 1 + count) % count), [count]);
  const goNext = useCallback(() => setIdx((i) => (i + 1) % count), [count]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        goNext();
      } else if (e.code === "ArrowRight") {
        goNext();
      } else if (e.code === "ArrowLeft") {
        goPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  return (
    <div className="play-page">
      <header className="topbar">
        <div className="topbar-left">
          <a
            className="wordmark"
            href="#"
            aria-label="Alight - find another song"
            onClick={(e) => {
              e.preventDefault();
              onBack?.();
            }}
          >
            <svg viewBox="0 0 28 36" aria-hidden="true" className="wordmark-mark">
              <g transform="translate(2,4)">
                <rect x="0" y="6" width="22" height="26" fill="none" stroke="currentColor" strokeWidth="1.25" />
                <rect x="6" y="6" width="10" height="16" fill="currentColor" />
                <rect x="3" y="0" width="5" height="5" fill="currentColor" />
                <path d="M19 0 L13 0 L16 5 Z" fill="currentColor" />
              </g>
            </svg>
            <span className="wordmark-name">Alight</span>
          </a>
          <div className="song-meta">
            <span className="song-title">{song.title}</span>
            <span className="sep">·</span>
            <span>{song.artist}</span>
          </div>
        </div>
        <div className="topbar-right">
          {/* Songbook / Print / Settings icons land with their Wave 3 features. */}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      <main className="play-stage">
        <div className="chord-row">
          <ChordLabel now={cur} />
          <div className="chord-label-side">
            <div className="capo">{song.capoNote}</div>
            <div className="pck-chord-next" aria-label={`Next chord: ${next.name}`}>
              <span className="label-caps">Next</span>
              <span className="name">{prettify(next.name)}</span>
            </div>
          </div>
        </div>

        <div className="keyboards">
          <div className="hand-block">
            <div className="hand-header left">
              <span className="marker"><svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" fill="currentColor" /></svg></span>
              <span>Left hand</span>
            </div>
            <Keyboard hand="left" startNote="C2" endNote="E3" nowNotes={cur.left} nextNotes={next.left} size="md" showFingering={fingering} />
          </div>
          <div className="hand-block">
            <div className="hand-header right">
              <span className="marker"><svg viewBox="0 0 12 12"><path d="M6 10 L2 3 L10 3 Z" fill="currentColor" /></svg></span>
              <span>Right hand</span>
            </div>
            <Keyboard hand="right" startNote="F3" endNote="B4" nowNotes={cur.right} nextNotes={next.right} size="md" showFingering={fingering} />
          </div>
        </div>

        <div className="transport-row">
          <Transport onPrev={goPrev} onNext={goNext} />
          <div className="transport-hint t-text-xs">Spacebar steps forward.</div>
        </div>
      </main>

      <footer className="play-footer">
        <div className="footer-controls">
          <Segmented label="Voicing" options={VOICING_OPTIONS} value={voicing} onChange={setVoicing} />
          <ToggleSwitch checked={fingering} onChange={setFingering}>Fingering</ToggleSwitch>
        </div>
      </footer>
    </div>
  );
}
