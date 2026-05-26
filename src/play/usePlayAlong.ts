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
// Pure timing maths lives in music/timeline.ts; this is only the React glue.

import { useCallback, useEffect, useRef, useState } from "react";
import { chordIndexAt, type Timeline } from "../music/timeline.ts";

const BEATS_PER_BAR = 4; // manual auto-advance assumes one chord per 4/4 bar
const TAP_WINDOW_MS = 2000; // taps older than this start a fresh tempo estimate
const MIN_BPM = 30;
const MAX_BPM = 300;

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
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
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

  // A fresh song resets the playhead.
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setManualIdx(0);
    setBpm(Math.round(timeline?.beats?.bpm ?? 0));
  }, [timeline]);

  // Keep the latest time in a ref so next/prev stay stable across clock frames.
  const timeRef = useRef(0);
  useEffect(() => {
    timeRef.current = currentTime;
  }, [currentTime]);

  // Timed clock: advance currentTime by real elapsed time each animation frame.
  useEffect(() => {
    if (!timed || !isPlaying) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCurrentTime((t) => {
        const nt = t + dt;
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

  // Manual auto-advance: one chord per bar at the tapped tempo.
  useEffect(() => {
    if (timed || !isPlaying || bpm <= 0 || count === 0) return;
    const barMs = (60_000 / bpm) * BEATS_PER_BAR;
    const id = setInterval(() => setManualIdx((i) => (i + 1) % count), barMs);
    return () => clearInterval(id);
  }, [timed, isPlaying, bpm, count]);

  const activeIndex = timed
    ? Math.max(0, chordIndexAt(timeline!.chords, currentTime))
    : manualIdx;

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

  const restart = useCallback(() => {
    if (timed) setCurrentTime(0);
    else setManualIdx(0);
  }, [timed]);

  const canPlay = timed || bpm > 0;
  const togglePlay = useCallback(() => {
    if (canPlay) setIsPlaying((p) => !p);
  }, [canPlay]);

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

  return { timed, isPlaying, currentTime, activeIndex, bpm, canPlay, togglePlay, next, prev, restart, tap };
}
