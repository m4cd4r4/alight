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
import { Transport } from "./Transport.tsx";

type Theme = "light" | "dark";

const VOICING_OPTIONS: { value: Voicing; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "full", label: "Full" },
];

export function PlayView({ song }: { song: Song }) {
  const [idx, setIdx] = useState(0);
  const [voicing, setVoicing] = useState<Voicing>("simple");
  const [fingering, setFingering] = useState(true);
  const [theme, setTheme] = useState<Theme>("light");

  const steps = useMemo(() => voiceSong(song.chords, voicing), [song.chords, voicing]);
  const count = steps.length;

  const cur = steps[idx];
  const next = steps[(idx + 1) % count];

  const goPrev = useCallback(() => setIdx((i) => (i - 1 + count) % count), [count]);
  const goNext = useCallback(() => setIdx((i) => (i + 1) % count), [count]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
          <a className="wordmark" href="#" aria-label="Alight">
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
          {/* Songbook / Print / Settings are navigation seams for later views; only theme is wired here. */}
          <button type="button" className="icon-btn" title="Songbook" aria-label="Songbook">
            <svg viewBox="0 0 24 24"><line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="1.25" /><line x1="9" y1="5" x2="9" y2="19" stroke="currentColor" strokeWidth="1.25" /><path d="M12 5.5 L15.5 4.7 L18.2 18.4 L14.7 19.2 Z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="icon-btn" title="Print this song" aria-label="Print this song">
            <svg viewBox="0 0 24 24"><rect x="7" y="4" width="10" height="5" fill="none" stroke="currentColor" strokeWidth="1.25" /><path d="M5 9 H19 V16 H17 V20 H7 V16 H5 Z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" /><line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.25" /></svg>
          </button>
          <button
            type="button"
            className="icon-btn"
            title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            aria-label="Toggle theme"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? (
              <svg viewBox="0 0 24 24"><path d="M19 14.5 A8 8 0 0 1 9.5 5 A7 7 0 1 0 19 14.5 Z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" /></svg>
            ) : (
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.25" /><path d="M12 3 V5 M12 19 V21 M3 12 H5 M19 12 H21 M5.6 5.6 L7 7 M17 17 L18.4 18.4 M5.6 18.4 L7 17 M17 7 L18.4 5.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
            )}
          </button>
          <button type="button" className="icon-btn" title="Settings" aria-label="Settings">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.25" /><path d="M12 4.5 V6.5 M12 17.5 V19.5 M4.5 12 H6.5 M17.5 12 H19.5 M6.7 6.7 L8.1 8.1 M15.9 15.9 L17.3 17.3 M6.7 17.3 L8.1 15.9 M15.9 8.1 L17.3 6.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
          </button>
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
