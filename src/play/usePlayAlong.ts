// The playhead. Drives the play-along clock for the Play view and reconciles
// the two timing modes behind one interface:
//
//   timed  - a real analysis Timeline (beat-accurate chords + lyrics). A
//            requestAnimationFrame clock advances `currentTime`; the active
//            chord/lyric are derived from it by the pure selectors.
//   manual - no timing (paste / UG-only). Stepping is index-based, exactly as
//            before; "play" auto-advances one chord per bar at the tapped tempo,
//            and is simply unavailable until a tempo is tapped.
//
// Either way the Play view reads `activeIndex` and renders the same keyboards.
// Practice aids ride on top of both modes: a playback `speed` multiplier, a
// count-in before play starts, and an A-B `loop` over a chord range. Pure
// timing maths lives in music/timeline.ts; this is only the React glue.

import { useCallback, useEffect, useRef, useState } from "react";
import { chordIndexAt, type Timeline } from "../music/timeline.ts";

const BEATS_PER_BAR = 4; // manual auto-advance assumes one chord per 4/4 bar
const TAP_WINDOW_MS = 2000; // taps older than this start a fresh tempo estimate
const MIN_BPM = 30;
const MAX_BPM = 300;
const COUNT_IN_BEATS = 4;
const COUNT_IN_FALLBACK_BPM = 100; // when no tempo is known yet

export interface LoopRange {
  /** Inclusive chord indices; start <= end. */
  start: number;
  end: number;
}

export interface PlayAlong {
  /** True when a real analysis timeline drives a clock; false for manual mode. */
  timed: boolean;
  isPlaying: boolean;
  /** Seconds from song start (timed mode); 0 in manual mode. */
  currentTime: number;
  /** Index into the voiced chord sequence that should be lit now. */
  activeIndex: number;
  /** Tempo in BPM; 0 when unknown. */
  bpm: number;
  /** Whether play/pause does anything (always in timed mode; needs a tempo in manual). */
  canPlay: boolean;
  /** Playback speed multiplier (1 = normal, 0.75, 0.5 for practice). */
  speed: number;
  setSpeed: (speed: number) => void;
  /** A-B practice loop over a chord range, or null. */
  loop: LoopRange | null;
  setLoopStart: () => void;
  setLoopEnd: () => void;
  clearLoop: () => void;
  /** Whether a count-in precedes play. */
  countInEnabled: boolean;
  setCountInEnabled: (on: boolean) => void;
  /** True during the pre-roll count; `countdown` is the beat number shown. */
  countingIn: boolean;
  countdown: number;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  /** Jump straight to a chord by index (both modes). */
  goTo: (index: number) => void;
  restart: () => void;
  /** Register a tap for tap-tempo; updates bpm once two taps are in. */
  tap: () => void;
}

export function usePlayAlong(timeline: Timeline | null, count: number): PlayAlong {
  const timed = !!timeline && timeline.chords.length > 0 && timeline.duration > 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [manualIdx, setManualIdx] = useState(0);
  const [bpm, setBpm] = useState(() => Math.round(timeline?.beats?.bpm ?? 0));
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState<LoopRange | null>(null);
  const [countInEnabled, setCountInEnabled] = useState(false);
  const [countingIn, setCountingIn] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // A fresh song resets the playhead and any range that pointed into the old one.
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setManualIdx(0);
    setBpm(Math.round(timeline?.beats?.bpm ?? 0));
    setLoop(null);
    setCountingIn(false);
    setCountdown(0);
  }, [timeline]);

  const activeIndex = timed
    ? Math.max(0, chordIndexAt(timeline!.chords, currentTime))
    : manualIdx;

  // Latest values the clock closures read without re-subscribing each frame.
  const timeRef = useRef(0);
  const speedRef = useRef(speed);
  const loopRef = useRef<LoopRange | null>(loop);
  const activeIndexRef = useRef(activeIndex);
  const bpmRef = useRef(bpm);
  timeRef.current = currentTime;
  speedRef.current = speed;
  loopRef.current = loop;
  activeIndexRef.current = activeIndex;
  bpmRef.current = bpm;

  // Timed clock: advance currentTime by real elapsed time (scaled by speed) each
  // frame, wrapping at the loop end and stopping at the song's end.
  useEffect(() => {
    if (!timed || !isPlaying) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCurrentTime((t) => {
        const nt = t + dt * speedRef.current;
        const lp = loopRef.current;
        if (lp) {
          // Soft loop: wrap only when playback advances across the loop end, so a
          // tap/seek out of the range releases the loop instead of snapping back.
          const loopEnd = timeline!.chords[lp.end]?.end ?? timeline!.duration;
          if (t < loopEnd && nt >= loopEnd) return timeline!.chords[lp.start]?.start ?? 0;
        }
        if (nt >= timeline!.duration) {
          setIsPlaying(false);
          return timeline!.duration;
        }
        return nt;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timed, isPlaying, timeline]);

  // Manual auto-advance: one chord per bar at the tapped tempo, scaled by speed,
  // wrapping inside the loop range when one is set.
  useEffect(() => {
    if (timed || !isPlaying || bpm <= 0 || count === 0) return;
    const barMs = ((60_000 / bpm) * BEATS_PER_BAR) / speed;
    const id = setInterval(() => {
      setManualIdx((i) => {
        const lp = loopRef.current;
        const nextIdx = i + 1;
        // Soft loop: only cycle while the playhead is inside the range; stepping
        // out (via goTo) lets playback continue past it until it re-enters.
        if (lp && i >= lp.start && i <= lp.end) return nextIdx > lp.end ? lp.start : nextIdx;
        return nextIdx % count;
      });
    }, barMs);
    return () => clearInterval(id);
  }, [timed, isPlaying, bpm, count, speed]);

  // Count-in: tick down the beats, then hand off to the real clock.
  useEffect(() => {
    if (!countingIn) return;
    // Capture the tempo once so tapping a new tempo mid-count does not restart it.
    const effBpm = bpmRef.current > 0 ? bpmRef.current : COUNT_IN_FALLBACK_BPM;
    const beatMs = 60_000 / effBpm;
    let beat = COUNT_IN_BEATS;
    const id = setInterval(() => {
      beat -= 1;
      if (beat <= 0) {
        clearInterval(id);
        setCountdown(0);
        setCountingIn(false);
        setIsPlaying(true);
      } else {
        setCountdown(beat);
      }
    }, beatMs);
    return () => clearInterval(id);
  }, [countingIn]);

  const next = useCallback(() => {
    if (timed) {
      const i = chordIndexAt(timeline!.chords, timeRef.current);
      const target = timeline!.chords[Math.min(i + 1, timeline!.chords.length - 1)];
      if (target) setCurrentTime(target.start);
    } else if (count > 0) {
      setManualIdx((i) => (i + 1) % count);
    }
  }, [timed, timeline, count]);

  const prev = useCallback(() => {
    if (timed) {
      const i = chordIndexAt(timeline!.chords, timeRef.current);
      const target = timeline!.chords[Math.max(i - 1, 0)];
      if (target) setCurrentTime(target.start);
    } else if (count > 0) {
      setManualIdx((i) => (i - 1 + count) % count);
    }
  }, [timed, timeline, count]);

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      if (timed) {
        const clamped = Math.min(Math.max(index, 0), timeline!.chords.length - 1);
        const target = timeline!.chords[clamped];
        if (target) setCurrentTime(target.start);
      } else {
        setManualIdx(((index % count) + count) % count);
      }
    },
    [timed, timeline, count],
  );

  const restart = useCallback(() => {
    if (timed) setCurrentTime(0);
    else setManualIdx(0);
  }, [timed]);

  const setLoopStart = useCallback(() => {
    const s = activeIndexRef.current;
    setLoop((prev) => ({ start: s, end: prev && prev.end >= s ? prev.end : s }));
  }, []);
  const setLoopEnd = useCallback(() => {
    const e = activeIndexRef.current;
    setLoop((prev) => ({ start: prev && prev.start <= e ? prev.start : e, end: e }));
  }, []);
  const clearLoop = useCallback(() => setLoop(null), []);

  const canPlay = timed || bpm > 0;
  const togglePlay = useCallback(() => {
    if (!canPlay) return;
    if (isPlaying || countingIn) {
      setIsPlaying(false);
      setCountingIn(false);
      return;
    }
    if (countInEnabled) {
      setCountdown(COUNT_IN_BEATS);
      setCountingIn(true);
    } else {
      setIsPlaying(true);
    }
  }, [canPlay, isPlaying, countingIn, countInEnabled]);

  const tapsRef = useRef<number[]>([]);
  const tap = useCallback(() => {
    const now = performance.now();
    const recent = tapsRef.current.filter((t) => now - t < TAP_WINDOW_MS);
    recent.push(now);
    tapsRef.current = recent.slice(-5);
    if (tapsRef.current.length >= 2) {
      let sum = 0;
      for (let i = 1; i < tapsRef.current.length; i++) sum += tapsRef.current[i] - tapsRef.current[i - 1];
      const avg = sum / (tapsRef.current.length - 1);
      setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(60_000 / avg))));
    }
  }, []);

  return {
    timed,
    isPlaying,
    currentTime,
    activeIndex,
    bpm,
    canPlay,
    speed,
    setSpeed,
    loop,
    setLoopStart,
    setLoopEnd,
    clearLoop,
    countInEnabled,
    setCountInEnabled,
    countingIn,
    countdown,
    togglePlay,
    next,
    prev,
    goTo,
    restart,
    tap,
  };
}
