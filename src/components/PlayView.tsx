// Root of the Play view. Steps through a song one chord at a time, or follows
// the song in time when a play-along Timeline is present. The voicing engine
// derives the keys; the keyboards light exactly what it produces.
//
// Two timing modes, one view (see usePlayAlong):
//   - timed:  a real analysis Timeline drives a clock - keys light and lyrics
//             highlight in sync, with a "next chord lands in" cue.
//   - manual: no timing - spacebar / arrows step, tap-tempo can auto-advance.
//
// Beginner-first by default: the voicing simplifies every chord to a playable
// triad, an "All chords" overview shows the whole song, and transpose / speed /
// loop controls help you actually sit down and play it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { prettify } from "../music/notes.ts";
import { lyricIndexAt, timelineSymbols, type Timeline } from "../music/timeline.ts";
import { easiestShift, keyLabel, transposeSymbols } from "../music/transpose.ts";
import type { Song, Voicing } from "../music/types.ts";
import { voiceSong } from "../music/voicing.ts";
import { usePlayAlong } from "../play/usePlayAlong.ts";
import { ChordLabel } from "./ChordLabel.tsx";
import { ChordStrip } from "./ChordStrip.tsx";
import { Segmented, ToggleSwitch } from "./Controls.tsx";
import { Keyboard } from "./Keyboard.tsx";
import { LyricsPanel } from "./LyricsPanel.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { Transport } from "./Transport.tsx";

const VOICING_OPTIONS: { value: Voicing; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "simple", label: "Simple" },
  { value: "full", label: "Full" },
];

const SPEED_OPTIONS = [
  { value: "0.5", label: "0.5×" },
  { value: "0.75", label: "0.75×" },
  { value: "1", label: "1×" },
];

const MAX_TRANSPOSE = 11;
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
  // A song may lock its voicing (e.g. Moonlight needs Full); seed from it and grey out the rest.
  const [voicing, setVoicing] = useState<Voicing>(song.lockVoicing ?? "beginner");
  const [fingering, setFingering] = useState(true);
  const [allChords, setAllChords] = useState(false);
  const [stripLyrics, setStripLyrics] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [volume, setVolume] = useState(1);

  // The original recording (when one was analysed) - its playback drives the
  // play-along clock; absent for PD-library / paste / UG songs (silent clock).
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioUrl = timeline?.audioUrl;

  const disabledVoicings = song.lockVoicing
    ? VOICING_OPTIONS.map((o) => o.value).filter((v) => v !== song.lockVoicing)
    : undefined;

  // When a play-along timeline is present its chords drive the keyboard (they
  // are time-aligned); otherwise the song's own chord sequence does.
  const chordSymbols = useMemo(
    () => (timeline && timeline.chords.length ? timelineSymbols(timeline) : song.chords),
    [timeline, song.chords],
  );
  // Transpose first (live key change), then voice. Timing is untouched - it comes
  // from the timeline, so the playhead is unaffected by transpose or voicing.
  const shifted = useMemo(() => transposeSymbols(chordSymbols, transpose), [chordSymbols, transpose]);
  const steps = useMemo(() => voiceSong(shifted, voicing), [shifted, voicing]);
  const count = steps.length;

  const pa = usePlayAlong(timeline, count, audioRef);

  const idx = count ? Math.min(pa.activeIndex, count - 1) : 0;
  const cur = steps[idx];
  const nextStep = count ? steps[(idx + 1) % count] : undefined;

  const goPrev = useCallback(() => pa.prev(), [pa]);
  const goNext = useCallback(() => pa.next(), [pa]);
  const goTo = useCallback((i: number) => pa.goTo(i), [pa]);

  const setTransposeBy = useCallback(
    (delta: number) => setTranspose((t) => Math.max(-MAX_TRANSPOSE, Math.min(MAX_TRANSPOSE, t + delta))),
    [],
  );

  const hasLyrics = !!timeline && timeline.lyrics.length > 0;
  const lyricFor = useCallback(
    (i: number) => {
      if (!timeline || !timeline.lyrics.length) return undefined;
      const chord = timeline.chords[i];
      if (!chord) return undefined;
      const li = lyricIndexAt(timeline.lyrics, chord.start);
      return li >= 0 ? timeline.lyrics[li].text : undefined;
    },
    [timeline],
  );

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume, audioUrl]);

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
      {audioUrl ? <audio ref={audioRef} src={audioUrl} preload="auto" style={{ display: "none" }} /> : null}
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
        {pa.countingIn ? (
          <div className="count-in" aria-live="assertive" aria-label={`Starting in ${pa.countdown}`}>
            <span className="count-in-num">{pa.countdown}</span>
          </div>
        ) : null}

        {allChords ? (
          <>
            <div className="grid-heading">
              <span className="grid-heading-title">All chords</span>
              <span className="chord-position t-mono">{idx + 1} / {count}</span>
            </div>
            <ChordStrip
              steps={steps}
              activeIndex={idx}
              mode="grid"
              onSelect={goTo}
              showLyrics={stripLyrics && hasLyrics}
              lyricFor={lyricFor}
              loop={pa.loop}
            />
          </>
        ) : (
          <>
            <div className="chord-row">
              <ChordLabel now={cur} index={idx} count={count} />
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

            <ChordStrip
              steps={steps}
              activeIndex={idx}
              mode="strip"
              onSelect={goTo}
              showLyrics={stripLyrics && hasLyrics}
              lyricFor={lyricFor}
              loop={pa.loop}
            />
          </>
        )}

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
          <Segmented label="Voicing" options={VOICING_OPTIONS} value={voicing} onChange={setVoicing} disabledValues={disabledVoicings} />
          <Segmented label="Speed" options={SPEED_OPTIONS} value={String(pa.speed)} onChange={(v) => pa.setSpeed(Number(v))} />

          {audioUrl ? (
            <div className="ctl-block">
              <div className="t-label-caps">Volume</div>
              <input
                className="pck-volume"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Playback volume"
              />
            </div>
          ) : null}

          <div className="ctl-block">
            <div className="t-label-caps">Key</div>
            <div className="transpose-ctl">
              <button type="button" onClick={() => setTransposeBy(-1)} aria-label="Transpose down a semitone">−</button>
              <span className="key-readout t-mono" aria-label="Current key">{keyLabel(chordSymbols, transpose)}</span>
              <button type="button" onClick={() => setTransposeBy(1)} aria-label="Transpose up a semitone">+</button>
              <button type="button" className="easy-key-btn" onClick={() => setTranspose(easiestShift(chordSymbols))}>
                Easy key
              </button>
            </div>
          </div>

          <div className="ctl-block">
            <div className="t-label-caps">Loop {pa.loop ? `${pa.loop.start + 1}-${pa.loop.end + 1}` : ""}</div>
            <div className="loop-ctl">
              <button type="button" onClick={pa.setLoopStart}>Set A</button>
              <button type="button" onClick={pa.setLoopEnd}>Set B</button>
              <button type="button" onClick={pa.clearLoop} disabled={!pa.loop}>Clear</button>
            </div>
          </div>

          <div className="ctl-block toggles">
            <ToggleSwitch checked={allChords} onChange={setAllChords}>All chords</ToggleSwitch>
            {hasLyrics ? (
              <ToggleSwitch checked={stripLyrics} onChange={setStripLyrics}>Lyrics</ToggleSwitch>
            ) : null}
            <ToggleSwitch checked={pa.countInEnabled} onChange={pa.setCountInEnabled}>Count-in</ToggleSwitch>
            <ToggleSwitch checked={fingering} onChange={setFingering}>Fingering</ToggleSwitch>
          </div>
        </div>
      </footer>
    </div>
  );
}
