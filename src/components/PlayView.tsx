// Root of the Play view. Steps through a song one chord at a time, or follows
// the song in time when a play-along Timeline is present. The voicing engine
// derives the keys; the keyboards light exactly what it produces.
//
// Two timing modes, one view (see usePlayAlong):
//   - timed:  a real analysis Timeline drives a clock - keys light and lyrics
//             highlight in sync, with a "next chord lands in" cue.
//   - manual: no timing - spacebar / arrows step, tap-tempo can auto-advance.

import { useCallback, useEffect, useMemo, useState } from "react";
import { prettify } from "../music/notes.ts";
import { lyricIndexAt, timelineSymbols, type Timeline } from "../music/timeline.ts";
import type { Song, Voicing } from "../music/types.ts";
import { voiceSong } from "../music/voicing.ts";
import { usePlayAlong } from "../play/usePlayAlong.ts";
import { ChordLabel } from "./ChordLabel.tsx";
import { Segmented, ToggleSwitch } from "./Controls.tsx";
import { Keyboard } from "./Keyboard.tsx";
import { LyricsPanel } from "./LyricsPanel.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { Transport } from "./Transport.tsx";

const VOICING_OPTIONS: { value: Voicing; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "full", label: "Full" },
];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function PlayView({
  song,
  timeline = null,
  onBack,
  theme,
  onToggleTheme,
}: {
  song: Song;
  timeline?: Timeline | null;
  onBack?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [voicing, setVoicing] = useState<Voicing>("simple");
  const [fingering, setFingering] = useState(true);

  // When a play-along timeline is present its chords drive the keyboard (they
  // are time-aligned); otherwise the song's own chord sequence does.
  const chordSymbols = useMemo(
    () => (timeline && timeline.chords.length ? timelineSymbols(timeline) : song.chords),
    [timeline, song.chords],
  );
  const steps = useMemo(() => voiceSong(chordSymbols, voicing), [chordSymbols, voicing]);
  const count = steps.length;

  const pa = usePlayAlong(timeline, count);

  const idx = count ? Math.min(pa.activeIndex, count - 1) : 0;
  const cur = steps[idx];
  const nextStep = count ? steps[(idx + 1) % count] : undefined;

  const goPrev = useCallback(() => pa.prev(), [pa]);
  const goNext = useCallback(() => pa.next(), [pa]);

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

  // Timed cues: which lyric line is live, and when the next chord lands.
  const lyricIdx = timeline ? lyricIndexAt(timeline.lyrics, pa.currentTime) : -1;
  const curChord = pa.timed && timeline ? timeline.chords[idx] : undefined;
  const upcoming = pa.timed && timeline ? timeline.chords[idx + 1] : undefined;
  const landsIn = upcoming ? Math.max(0, upcoming.start - pa.currentTime) : null;
  const chordProgress =
    curChord && upcoming && upcoming.start > curChord.start
      ? clamp01((pa.currentTime - curChord.start) / (upcoming.start - curChord.start))
      : 0;

  if (!cur || !nextStep) {
    return (
      <div className="play-page">
        <main className="play-stage">
          <p>This song has no readable chords.</p>
        </main>
      </div>
    );
  }

  const hint = pa.timed
    ? "Play follows the song. Space or arrows step."
    : pa.canPlay
      ? "Play auto-advances at your tempo. Space steps."
      : "Space steps. Tap a tempo to enable play.";

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
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      <main className="play-stage">
        <div className="chord-row">
          <ChordLabel now={cur} />
          <div className="chord-label-side">
            <div className="capo">{song.capoNote}</div>
            <div className="pck-chord-next" aria-label={`Next chord: ${nextStep.name}`}>
              <span className="label-caps">Next</span>
              <span className="name">{prettify(nextStep.name)}</span>
            </div>
            {pa.timed && landsIn !== null ? (
              <div className="lands-in" aria-label={`Next chord lands in ${landsIn.toFixed(1)} seconds`}>
                <div className="lands-bar">
                  <span style={{ transform: `scaleX(${chordProgress})` }} />
                </div>
                <span className="lands-text t-text-xs">in {landsIn.toFixed(1)}s</span>
              </div>
            ) : null}
          </div>
        </div>

        {timeline && timeline.lyrics.length > 0 ? (
          <LyricsPanel lines={timeline.lyrics} activeIndex={lyricIdx} />
        ) : null}

        <div className="keyboards">
          <div className="hand-block">
            <div className="hand-header left">
              <span className="marker"><svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" fill="currentColor" /></svg></span>
              <span>Left hand</span>
            </div>
            <Keyboard hand="left" startNote="C2" endNote="E3" nowNotes={cur.left} nextNotes={nextStep.left} size="md" showFingering={fingering} />
          </div>
          <div className="hand-block">
            <div className="hand-header right">
              <span className="marker"><svg viewBox="0 0 12 12"><path d="M6 10 L2 3 L10 3 Z" fill="currentColor" /></svg></span>
              <span>Right hand</span>
            </div>
            <Keyboard hand="right" startNote="F3" endNote="B4" nowNotes={cur.right} nextNotes={nextStep.right} size="md" showFingering={fingering} />
          </div>
        </div>

        <div className="transport-row">
          <Transport
            onPrev={goPrev}
            onNext={goNext}
            isPlaying={pa.isPlaying}
            canPlay={pa.canPlay}
            onTogglePlay={pa.togglePlay}
          />
          <div className="tempo-controls">
            <button type="button" className="tap-btn" onClick={pa.tap}>Tap tempo</button>
            <span className="bpm-readout t-mono">{pa.bpm > 0 ? `${pa.bpm} BPM` : "No tempo"}</span>
            {pa.timed ? (
              <button type="button" className="restart-btn" onClick={pa.restart}>Restart</button>
            ) : null}
          </div>
          <div className="transport-hint t-text-xs">{hint}</div>
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
