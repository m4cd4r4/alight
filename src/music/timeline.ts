// The timeline contract: the typed shape Alight's Play view consumes for
// play-along. It is deliberately decoupled from ChordMini's wire format - the
// serverless proxy (api/analyze.ts) maps a ChordMini analysis into this shape,
// so the UI never sees an upstream field name. A hand-authored sample fixture
// (__fixtures__/sample-analysis.json) feeds the UI before the backend exists.
//
// Times are seconds from song start. Chord symbols here are tonal-parseable
// (e.g. "C", "G/B", "Am7"); the existing voicing engine (voicing.ts) turns the
// symbol sequence into the exact keys to light. Pure data + pure selectors, no
// React - so every transform below is unit-testable.

import { Note } from "tonal";
import { parseLrc } from "./lrc.ts";

/** A lyric line and the second it should highlight. */
export interface TimedLyricLine {
  /** Seconds from song start. */
  time: number;
  text: string;
}

/** A chord that sounds across a known span of the song. */
export interface TimedChord {
  /** Chord symbol the voicing engine understands, e.g. "C", "G/B", "Am7". */
  symbol: string;
  /** Seconds from song start when the chord begins. */
  start: number;
  /** Seconds from song start when it ends (the next chord's start, or song end). */
  end: number;
}

/** Beat grid for the metronome and tempo display. */
export interface Beats {
  /** Beats per minute, rounded. 0 when unknown. */
  bpm: number;
  /** Beat onset times in seconds. */
  times: number[];
  /** e.g. "4/4", "3/4"; null when unknown. */
  timeSignature: string | null;
}

/**
 * The whole song as Alight plays it along. `source` records whether the timing
 * is real (beat-accurate analysis) or absent (manual stepping / tap-tempo). The
 * Play view works with `null` (no timeline at all) too - that is the always-on
 * manual fallback for paste and UG-only songs.
 */
export interface Timeline {
  /** Total duration in seconds; 0 when unknown. */
  duration: number;
  chords: TimedChord[];
  lyrics: TimedLyricLine[];
  beats: Beats | null;
  source: "analysis" | "manual";
}

// ---- ChordMini wire shapes (only the fields Alight reads) --------------------
// Confirmed against the python_backend source; the exact names get re-validated
// against a captured real analysis JSON in Phase 3. Everything is optional so
// the mapper tolerates a partial analysis (e.g. lyrics missing, beats missing).

export interface ChordMiniChord {
  start: number;
  end: number;
  chord: string;
}
export interface ChordMiniChordsPayload {
  chords?: ChordMiniChord[];
  duration?: number;
}
export interface ChordMiniBeatsPayload {
  beats?: number[];
  bpm?: number;
  time_signature?: string | null;
}
export interface ChordMiniLyricLine {
  time: number;
  text: string;
}
export interface ChordMiniLyricsPayload {
  /** ChordMini's pre-parsed synced lyrics. Preferred when present. */
  synchronized_lyrics?: ChordMiniLyricLine[];
  /** Raw LRC string (LRCLIB's native shape), parsed as a fallback. */
  synced_lyrics?: string;
  syncedLyrics?: string;
}
export interface ChordMiniAnalysis {
  chords?: ChordMiniChordsPayload | null;
  beats?: ChordMiniBeatsPayload | null;
  lyrics?: ChordMiniLyricsPayload | null;
}

// ---- ChordMini chord-label -> tonal symbol -----------------------------------

// ChordMini / Chord-CNN-LSTM emit Harte-style labels "Root:quality[/bass]".
// Map the quality to a suffix tonal's Chord.get accepts. Unknown qualities fall
// back to the bare major triad so the song still plays (rare; the vocab is small).
const QUALITY_MAP: Record<string, string> = {
  "": "",
  maj: "",
  min: "m",
  dim: "dim",
  aug: "aug",
  maj7: "maj7",
  min7: "m7",
  "7": "7",
  dim7: "dim7",
  hdim7: "m7b5",
  minmaj7: "mMaj7",
  maj6: "6",
  min6: "m6",
  "9": "9",
  maj9: "maj9",
  min9: "m9",
  "11": "11",
  "13": "13",
  sus2: "sus2",
  sus4: "sus4",
};

// Harte bass degrees relative to the root, as interval names tonal can transpose.
const HARTE_DEGREE: Record<string, string> = {
  "1": "1P", b2: "2m", "2": "2M", b3: "3m", "3": "3M", "4": "4P",
  "#4": "4A", b5: "5d", "5": "5P", b6: "6m", "6": "6M", b7: "7m", "7": "7M",
};

const ROOT_RE = /^[A-G][#b]?$/;

function harteBassToNote(root: string, bass: string): string | null {
  if (ROOT_RE.test(bass)) return Note.simplify(bass) || bass;
  const interval = HARTE_DEGREE[bass];
  if (!interval) return null;
  const note = Note.transpose(root, interval);
  const pc = Note.pitchClass(note);
  return pc ? Note.simplify(pc) || pc : null;
}

/** "C:maj"->"C", "A:min7"->"Am7", "G:maj/3"->"G/B", "N"/"X"->null (no chord). */
export function chordMiniLabelToSymbol(label: string): string | null {
  const raw = (label ?? "").trim();
  if (!raw || raw === "N" || raw === "X" || /^n\.?c\.?$/i.test(raw)) return null;

  const slash = raw.indexOf("/");
  const main = slash === -1 ? raw : raw.slice(0, slash);
  const bassPart = slash === -1 ? null : raw.slice(slash + 1);

  const colon = main.indexOf(":");
  const root = colon === -1 ? main : main.slice(0, colon);
  const quality = colon === -1 ? "" : main.slice(colon + 1);
  if (!ROOT_RE.test(root)) return null;

  const suffix = QUALITY_MAP[quality] ?? "";
  const head = root + suffix;

  if (bassPart) {
    const bassNote = harteBassToNote(root, bassPart);
    if (bassNote && bassNote !== root) return `${head}/${bassNote}`;
  }
  return head;
}

/** Map ChordMini chords to TimedChords, collapsing consecutive identical ones. */
function collapseTimedChords(chords: ChordMiniChord[]): TimedChord[] {
  const out: TimedChord[] = [];
  for (const c of chords) {
    if (typeof c.start !== "number" || typeof c.end !== "number") continue;
    const symbol = chordMiniLabelToSymbol(c.chord);
    if (symbol === null) continue; // a no-chord span: the previous chord holds
    const prev = out[out.length - 1];
    if (prev && prev.symbol === symbol) {
      prev.end = c.end; // extend the held chord rather than repeat it
    } else {
      out.push({ symbol, start: c.start, end: c.end });
    }
  }
  return out;
}

function mapLyrics(p?: ChordMiniLyricsPayload | null): TimedLyricLine[] {
  if (!p) return [];
  if (Array.isArray(p.synchronized_lyrics)) {
    return p.synchronized_lyrics
      .filter((l) => typeof l?.time === "number" && typeof l?.text === "string")
      .map((l) => ({ time: l.time, text: l.text.trim() }))
      .filter((l) => l.text.length > 0)
      .sort((a, b) => a.time - b.time);
  }
  const raw = p.synced_lyrics ?? p.syncedLyrics;
  if (typeof raw === "string" && raw.trim()) return parseLrc(raw);
  return [];
}

/** Map a ChordMini analysis (any subset of its three payloads) to a Timeline. */
export function fromChordMini(a: ChordMiniAnalysis): Timeline {
  const chords = collapseTimedChords(a.chords?.chords ?? []);
  const lyrics = mapLyrics(a.lyrics);

  const beatTimes = Array.isArray(a.beats?.beats) ? a.beats!.beats : null;
  const beats: Beats | null = beatTimes
    ? {
        bpm: Math.round(Number(a.beats?.bpm) || 0),
        times: beatTimes,
        timeSignature: a.beats?.time_signature ?? null,
      }
    : null;

  const ends = [
    ...chords.map((c) => c.end),
    ...lyrics.map((l) => l.time),
    ...(beats?.times ?? []),
  ];
  const duration =
    Number(a.chords?.duration) || (ends.length ? Math.max(0, ...ends) : 0);

  return { duration, chords, lyrics, beats, source: "analysis" };
}

// ---- Pure selectors used by the Play view ------------------------------------

/** The chord sequence as plain symbols, for the voicing engine. */
export function timelineSymbols(t: Timeline): string[] {
  return t.chords.map((c) => c.symbol);
}

/**
 * Index of the chord active at time `t`: the last chord that has started. This
 * holds the current chord through any no-chord gap until the next one begins,
 * which is the right answer to "what should my hands be on now". Returns 0
 * before the first chord (the song's opening chord), -1 only when empty.
 */
export function chordIndexAt(chords: TimedChord[], t: number): number {
  if (chords.length === 0) return -1;
  let idx = 0;
  for (let i = 0; i < chords.length; i++) {
    if (chords[i].start <= t) idx = i;
    else break;
  }
  return idx;
}

/**
 * Index of the lyric line to highlight at time `t`: the last line that has
 * started. Returns -1 before the first line, so nothing highlights during an
 * instrumental intro.
 */
export function lyricIndexAt(lyrics: TimedLyricLine[], t: number): number {
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= t) idx = i;
    else break;
  }
  return idx;
}
