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
import { stripCards, voiceFigure } from "../music/figure.ts";
import { voiceSong } from "../music/voicing.ts";
import { useChordPiano } from "../play/useChordPiano.ts";
import { usePlayAlong } from "../play/usePlayAlong.ts";
import { ChordLabel } from "./ChordLabel.tsx";
import { ChordStaff } from "./ChordStaff.tsx";
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

// The next voicing up, for the completion card's "try a harder voicing".
const HARDER_VOICING: Record<Voicing, Voicing> = { beginner: "simple", simple: "full", full: "full" };

// Index of the lyric line covering a chord position (last line whose `at` <= i).
function lineIndexAt(lines: { at: number }[], chordIndex: number): number {
  let k = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].at <= chordIndex) k = i;
    else break;
  }
  return k;
}

const MAX_TRANSPOSE = 11;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Phones can't fit the two md keyboards side by side (~770px); drop to the sm
// size (which keeps note labels) so each hand fits when the CSS stacks them.
function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 640px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setCompact(mq.matches);
    onChange(); // resync in case the viewport changed between render and effect
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return compact;
}

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
  // Note-sequence songs (an arpeggio / melody transcription) drive the keys from
  // explicit strikes, not from voicing the chord symbols. When present, voicing
  // and transpose don't apply.
  const figure = song.figure && song.figure.length ? song.figure : null;
  // A song may lock its voicing (e.g. Moonlight needs Full); seed from it and grey out the rest.
  const [voicing, setVoicing] = useState<Voicing>(song.lockVoicing ?? "beginner");
  const [fingering, setFingering] = useState(true);
  const [allChords, setAllChords] = useState(false);
  const [stripLyrics, setStripLyrics] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [volume, setVolume] = useState(1);
  const [needTempoHint, setNeedTempoHint] = useState(false);
  // Set when Play is pressed with Sound on but the sampler is still loading: we
  // hold the clock until the piano is ready so the first chords don't fire
  // silently and then bunch up the moment audio finally arrives.
  const [waitingForSound, setWaitingForSound] = useState(false);
  // Hear the chord you're playing (sampled piano). Off by default - audio needs
  // a user gesture to start, and a beginner should opt in rather than be
  // surprised by sound. Remembered across sessions.
  const [sound, setSound] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem("alight:sound") === "on",
  );
  const piano = useChordPiano();
  // First-run coach cue near the keyboards, dismissed for good on first interaction.
  const [showCoach, setShowCoach] = useState(
    () => !(typeof localStorage !== "undefined" && localStorage.getItem("alight:seen-coach") === "1"),
  );
  const dismissCoach = useCallback(() => {
    setShowCoach(false);
    try {
      localStorage.setItem("alight:seen-coach", "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  // The original recording (when one was analysed) - its playback drives the
  // play-along clock; absent for PD-library / paste / UG songs (silent clock).
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioUrl = timeline?.audioUrl;
  const compact = useCompactViewport();

  // Figures fix the notes outright, so all voicings are inert; a locked song
  // greys out every voicing but its own.
  const disabledVoicings = figure
    ? VOICING_OPTIONS.map((o) => o.value)
    : song.lockVoicing
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
  // Figure songs skip both: their notes are the transcription, as written.
  const shifted = useMemo(() => transposeSymbols(chordSymbols, transpose), [chordSymbols, transpose]);
  const steps = useMemo(
    () => (figure ? voiceFigure(figure) : voiceSong(shifted, voicing)),
    [figure, shifted, voicing],
  );
  const count = steps.length;

  // Per-step rhythm for the figure clock (each step dwells its own beat length).
  const figureClock = useMemo(
    () => (figure ? { stepBeats: steps.map((s) => s.beats ?? 1), bpm: song.figureBpm } : null),
    [figure, steps, song.figureBpm],
  );

  const pa = usePlayAlong(timeline, count, audioRef, figureClock);

  const idx = count ? Math.min(pa.activeIndex, count - 1) : 0;
  const cur = steps[idx];
  const nextStep = count ? steps[(idx + 1) % count] : undefined;

  // Overview cards: one per chord, or one per harmony run for figures. Drives the
  // "All chords" count so the heading matches the grouped cards the strip shows.
  const cards = useMemo(() => stripCards(steps, !!figure), [steps, figure]);
  const cardCount = cards.length;
  const activeCardNo = Math.max(1, cards.findIndex((c) => idx >= c.startIndex && idx <= c.endIndex) + 1);

  const goPrev = useCallback(() => { dismissCoach(); pa.prev(); }, [pa, dismissCoach]);
  const goNext = useCallback(() => { dismissCoach(); pa.next(); }, [pa, dismissCoach]);
  const goTo = useCallback((i: number) => { dismissCoach(); pa.goTo(i); }, [pa, dismissCoach]);

  // Start playback, but when Sound is on (and we're driving the silent clock,
  // not a real recording) wait for the sampler before the clock runs - otherwise
  // the first chord's sound lands late and crowds the second. The deferred-start
  // effect below resumes once the piano is ready.
  const requestPlay = useCallback(() => {
    if (sound) piano.prime();
    if (sound && !audioUrl && !piano.ready) {
      setWaitingForSound(true);
      return;
    }
    pa.togglePlay();
  }, [sound, audioUrl, piano, pa]);

  // The transport button: pause when running, cancel a pending start, else play.
  const onTransportToggle = useCallback(() => {
    dismissCoach();
    if (waitingForSound) { setWaitingForSound(false); return; }
    if (pa.isPlaying || pa.countingIn) { pa.togglePlay(); return; }
    requestPlay();
  }, [dismissCoach, waitingForSound, pa, requestPlay]);

  // Sampler finished loading while a start was pending - run the clock now.
  useEffect(() => {
    if (waitingForSound && piano.ready) {
      setWaitingForSound(false);
      pa.togglePlay();
    }
  }, [waitingForSound, piano.ready, pa]);

  // A new song clears any pending start so it can't fire on the wrong track.
  useEffect(() => {
    setWaitingForSound(false);
  }, [timeline, song]);

  // Sampled-piano playback. Enabling Sound (or tapping a key) primes the audio
  // from a real gesture; once loaded, each chord change is struck so you hear
  // what the keys light. Tapping a key plays just that note.
  const onSound = useCallback(
    (on: boolean) => {
      setSound(on);
      if (on) piano.prime();
    },
    [piano],
  );
  const pressNote = useCallback(
    (note: string) => {
      dismissCoach();
      piano.prime();
      piano.playNote(note);
    },
    [piano, dismissCoach],
  );
  const nowNotes = useMemo(
    () => (cur && !cur.unparseable ? [...cur.left, ...cur.right].map((n) => n.note) : []),
    [cur],
  );
  useEffect(() => {
    try {
      localStorage.setItem("alight:sound", sound ? "on" : "off");
    } catch {
      /* storage unavailable */
    }
  }, [sound]);
  useEffect(() => {
    if (!sound || !piano.ready || nowNotes.length === 0) return;
    // Figure songs strike each note so it rings alongside the held bass (real
    // sustain); chord songs strike a clean block, cutting the previous one.
    if (figure) {
      for (const note of nowNotes) piano.playNote(note);
    } else {
      piano.playChord(nowNotes);
    }
  }, [nowNotes, sound, piano.ready, piano.playChord, piano.playNote, figure]);

  // Completion moment: when the song runs out, offer a calm next step. Pressing
  // any of these replays from the top (pa.togglePlay restarts when ended).
  const canHarder = !song.lockVoicing && voicing !== "full";
  const replay = useCallback(() => {
    requestPlay();
  }, [requestPlay]);
  const replaySlower = useCallback(() => {
    pa.setSpeed(pa.speed > 0.75 ? 0.75 : 0.5); // step down toward the 0.5 floor
    requestPlay();
  }, [pa, requestPlay]);
  const tryHarder = useCallback(() => {
    setVoicing((v) => HARDER_VOICING[v]);
    requestPlay();
  }, [requestPlay]);

  const setTransposeBy = useCallback(
    (delta: number) => setTranspose((t) => Math.max(-MAX_TRANSPOSE, Math.min(MAX_TRANSPOSE, t + delta))),
    [],
  );

  // Pressing Play before there's a tempo used to do nothing. Now it briefly
  // points the user at Tap tempo (and reminds them stepping always works).
  const hintTimer = useRef<number | undefined>(undefined);
  const onBlockedPlay = useCallback(() => {
    setNeedTempoHint(true);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setNeedTempoHint(false), 2100); // matches the pulse (700ms x 3)
  }, []);

  // Manual (untimed) songs can carry chord-indexed lyric lines; timed songs use
  // their analysis timeline. Either way the same panel + strip display them.
  const manualLyrics = !pa.timed && song.lyricLines && song.lyricLines.length ? song.lyricLines : null;
  const hasLyrics = (!!timeline && timeline.lyrics.length > 0) || !!manualLyrics;
  const lyricFor = useCallback(
    (i: number) => {
      if (timeline && timeline.lyrics.length) {
        const chord = timeline.chords[i];
        if (!chord) return undefined;
        const li = lyricIndexAt(timeline.lyrics, chord.start);
        return li >= 0 ? timeline.lyrics[li].text : undefined;
      }
      if (manualLyrics) {
        const k = lineIndexAt(manualLyrics, i);
        return k >= 0 ? manualLyrics[k].text : undefined;
      }
      return undefined;
    },
    [timeline, manualLyrics],
  );
  const manualLineIdx = manualLyrics ? Math.max(0, lineIndexAt(manualLyrics, idx)) : 0;

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume, audioUrl]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // While the completion card is up, keys belong to it (the focused button),
      // not the stepper - otherwise Space would silently advance behind the card.
      if (pa.ended) return;
      const target = e.target as HTMLElement;
      // Let focused controls handle their own keys - otherwise Space on a focused
      // button both activates it and steps the song (double-fire).
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
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
  }, [goNext, goPrev, pa.ended]);

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
      ? "Play auto-advances. Tap a tempo to set the pace; Space steps."
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
              <span className="chord-position t-mono">{activeCardNo} / {cardCount}</span>
            </div>
            <ChordStrip
              steps={steps}
              activeIndex={idx}
              mode="grid"
              onSelect={goTo}
              showLyrics={stripLyrics && hasLyrics}
              lyricFor={lyricFor}
              loop={pa.loop}
              grouped={!!figure}
            />
          </>
        ) : (
          <>
            <div className="chord-row">
              <div className="now-block">
                <ChordLabel now={cur} index={idx} count={count} showInversion={!figure && voicing !== "beginner"} />
                {timeline && timeline.lyrics.length > 0 ? (
                  <LyricsPanel lines={timeline.lyrics} activeIndex={lyricIdx} />
                ) : manualLyrics ? (
                  <LyricsPanel lines={manualLyrics.map((l) => ({ time: l.at, text: l.text }))} activeIndex={manualLineIdx} />
                ) : null}
              </div>
              <ChordStaff left={cur.left} right={cur.right} chordName={cur.name} heldLeft={cur.heldLeft} heldRight={cur.heldRight} />
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

            <div className="keyboards">
              <div className="hand-block">
                <div className="hand-header left">
                  <span className="marker"><svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" fill="currentColor" /></svg></span>
                  <span>Left hand</span>
                </div>
                <Keyboard hand="left" startNote="C2" endNote="E3" nowNotes={cur.left} nextNotes={nextStep.left} heldNotes={cur.heldLeft} size={compact ? "sm" : "md"} showFingering={fingering} onPressNote={sound ? pressNote : undefined} />
              </div>
              <div className="hand-block">
                <div className="hand-header right">
                  <span className="marker"><svg viewBox="0 0 12 12"><path d="M6 10 L2 3 L10 3 Z" fill="currentColor" /></svg></span>
                  <span>Right hand</span>
                </div>
                <Keyboard hand="right" startNote="F3" endNote="B4" nowNotes={cur.right} nextNotes={nextStep.right} heldNotes={cur.heldRight} size={compact ? "sm" : "md"} showFingering={fingering} onPressNote={sound ? pressNote : undefined} />
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
              grouped={!!figure}
            />
          </>
        )}

        {showCoach && !allChords ? (
          <div className="play-coach">
            <span>
              Press <kbd>Space</kbd> or the <kbd>←</kbd> <kbd>→</kbd> arrows for the next chord. Tap any chord below to jump.
            </span>
            <button type="button" className="play-coach-dismiss" onClick={dismissCoach}>Got it</button>
          </div>
        ) : null}

        {/* Control deck: transport in the centre, practice options in the
            previously-empty flanks; toggles as a slim row below. Replaces the
            old footer band so everything fits above the fold. */}
        <div className="control-deck">
          <div className="deck-side deck-left">
            <Segmented label="Voicing" options={VOICING_OPTIONS} value={voicing} onChange={setVoicing} disabledValues={disabledVoicings} />
            <Segmented label="Speed" options={SPEED_OPTIONS} value={String(pa.speed)} onChange={(v) => pa.setSpeed(Number(v))} />
            {audioUrl ? (
              <div className="ctl-block" role="group" aria-label="Volume">
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
          </div>

          <div className="deck-center">
            <Transport
              onPrev={goPrev}
              onNext={goNext}
              isPlaying={pa.isPlaying || waitingForSound}
              canPlay={pa.canPlay}
              onTogglePlay={onTransportToggle}
              onBlocked={onBlockedPlay}
            />
            <div className="tempo-controls">
              <button type="button" className={needTempoHint ? "tap-btn is-pulsing" : "tap-btn"} onClick={pa.tap}>Tap tempo</button>
              <span className="bpm-readout t-mono">{pa.bpm > 0 ? `${pa.bpm} BPM` : "No tempo"}</span>
              {pa.timed ? (
                <button type="button" className="restart-btn" onClick={pa.restart}>Restart</button>
              ) : null}
            </div>
            <div className="transport-hint t-text-xs" aria-live="polite">
              {waitingForSound
                ? "Loading sound..."
                : needTempoHint
                  ? "Tap a tempo to enable Play - or use Space / the arrows to step through."
                  : hint}
            </div>
          </div>

          <div className="deck-side deck-right">
            {figure ? null : (
              <div className="ctl-block" role="group" aria-label="Key">
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
            )}
            <div className="ctl-block" role="group" aria-label={`Loop${pa.loop ? ` ${pa.loop.start + 1} to ${pa.loop.end + 1}` : ""}`}>
              <div className="t-label-caps">Loop {pa.loop ? `${pa.loop.start + 1}-${pa.loop.end + 1}` : ""}</div>
              <div className="loop-ctl">
                <button type="button" onClick={pa.setLoopStart}>Set A</button>
                <button type="button" onClick={pa.setLoopEnd}>Set B</button>
                <button type="button" onClick={pa.clearLoop} disabled={!pa.loop}>Clear</button>
              </div>
            </div>
          </div>
        </div>

        <div className="deck-toggles" role="group" aria-label="Display and sound options">
          <ToggleSwitch checked={sound} onChange={onSound}>Sound</ToggleSwitch>
          <ToggleSwitch checked={allChords} onChange={setAllChords}>All chords</ToggleSwitch>
          {hasLyrics ? (
            <ToggleSwitch checked={stripLyrics} onChange={setStripLyrics}>Lyrics</ToggleSwitch>
          ) : null}
          <ToggleSwitch checked={pa.countInEnabled} onChange={pa.setCountInEnabled}>Count-in</ToggleSwitch>
          <ToggleSwitch checked={fingering} onChange={setFingering}>Fingering</ToggleSwitch>
        </div>

        {pa.ended ? (
          <div className="play-done" role="dialog" aria-modal="true" aria-labelledby="play-done-title">
            <div className="play-done-card">
              <p className="play-done-title" id="play-done-title">You played it through</p>
              <p className="play-done-sub">{song.title}, start to finish. Nice.</p>
              <div className="play-done-actions">
                <button type="button" className="play-done-primary" onClick={replay} autoFocus>Play again</button>
                {pa.speed > 0.5 ? (
                  <button type="button" onClick={replaySlower}>Slower</button>
                ) : null}
                {canHarder ? (
                  <button type="button" onClick={tryHarder}>Try the {HARDER_VOICING[voicing]} voicing</button>
                ) : null}
              </div>
              <button type="button" className="play-done-stay" onClick={pa.dismissEnd}>Stay here</button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
