// Run with: npm test  (Node's built-in runner; Node strips the TS types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  chordIndexAt,
  chordMiniLabelToSymbol,
  fromChordMini,
  lyricIndexAt,
  timelineSymbols,
  type ChordMiniAnalysis,
} from "./timeline.ts";

const sample = JSON.parse(
  readFileSync(join(import.meta.dirname, "__fixtures__", "sample-analysis.json"), "utf8"),
) as ChordMiniAnalysis;

test("chordMiniLabelToSymbol maps qualities, slash degrees, and no-chord", () => {
  assert.equal(chordMiniLabelToSymbol("C:maj"), "C");
  assert.equal(chordMiniLabelToSymbol("A:min"), "Am");
  assert.equal(chordMiniLabelToSymbol("G:7"), "G7");
  assert.equal(chordMiniLabelToSymbol("C:maj7"), "Cmaj7");
  assert.equal(chordMiniLabelToSymbol("D:min7"), "Dm7");
  assert.equal(chordMiniLabelToSymbol("B:hdim7"), "Bm7b5", "half-diminished -> m7b5");
  assert.equal(chordMiniLabelToSymbol("F:sus4"), "Fsus4");

  // Harte slash degrees resolve to the bass note name.
  assert.equal(chordMiniLabelToSymbol("G:maj/3"), "G/B", "major third of G is B");
  assert.equal(chordMiniLabelToSymbol("A:min/b3"), "Am/C", "minor third of A is C");
  assert.equal(chordMiniLabelToSymbol("F:maj/b7"), "F/Eb", "minor seventh of F is Eb");
  assert.equal(chordMiniLabelToSymbol("G:maj/E"), "G/E", "explicit note bass kept");
  assert.equal(chordMiniLabelToSymbol("C:maj/1"), "C", "bass equal to root drops the slash");

  // No-chord / unknown markers drop out entirely.
  assert.equal(chordMiniLabelToSymbol("N"), null);
  assert.equal(chordMiniLabelToSymbol("X"), null);
  assert.equal(chordMiniLabelToSymbol("N.C."), null);

  // Unknown quality safely reduces to the major triad so the song still plays.
  assert.equal(chordMiniLabelToSymbol("C:weird"), "C");
});

test("fromChordMini collapses repeats, drops no-chord, maps the three payloads", () => {
  const tl = fromChordMini(sample);

  // Frame-level repeats merge; the N span drops (D holds until the next chord).
  assert.deepEqual(timelineSymbols(tl), ["G", "C", "G/B", "D", "G", "C", "G7", "D", "G"]);
  assert.deepEqual(tl.chords[0], { symbol: "G", start: 0, end: 3 }, "two G frames merged into one span");
  assert.equal(tl.source, "analysis");
  assert.equal(tl.duration, 27);

  // Beats carried through verbatim.
  assert.equal(tl.beats?.bpm, 80);
  assert.equal(tl.beats?.timeSignature, "3/4");
  assert.equal(tl.beats?.times.length, 15);

  // Lyrics pre-parsed and sorted.
  assert.equal(tl.lyrics.length, 4);
  assert.deepEqual(tl.lyrics[0], { time: 0, text: "Amazing grace, how sweet the sound" });
});

test("fromChordMini parses raw LRC when no pre-parsed lyrics are present", () => {
  const tl = fromChordMini({
    lyrics: { synced_lyrics: "[00:00.00]line one\n[00:05.00]line two" },
  });
  assert.deepEqual(tl.lyrics, [
    { time: 0, text: "line one" },
    { time: 5, text: "line two" },
  ]);
});

test("fromChordMini tolerates an empty/partial analysis without throwing", () => {
  const tl = fromChordMini({});
  assert.deepEqual(tl.chords, []);
  assert.deepEqual(tl.lyrics, []);
  assert.equal(tl.beats, null);
  assert.equal(tl.duration, 0);
});

test("chordIndexAt holds the current chord through a no-chord gap", () => {
  const tl = fromChordMini(sample);
  assert.equal(chordIndexAt(tl.chords, -1), 0, "before the song shows the opening chord");
  assert.equal(chordIndexAt(tl.chords, 0), 0);
  assert.equal(chordIndexAt(tl.chords, 4), 1, "C at t=4");
  assert.equal(chordIndexAt(tl.chords, 12.5), 3, "D held through the 12-13.5 no-chord gap");
  assert.equal(chordIndexAt(tl.chords, 13.5), 4, "next G lands at 13.5");
  assert.equal(chordIndexAt(tl.chords, 1000), 8, "clamps to the last chord");
  assert.equal(chordIndexAt([], 5), -1, "empty progression");
});

test("lyricIndexAt highlights the last started line, none before the first", () => {
  const tl = fromChordMini(sample);
  assert.equal(lyricIndexAt(tl.lyrics, -1), -1, "nothing during an intro");
  assert.equal(lyricIndexAt(tl.lyrics, 0), 0);
  assert.equal(lyricIndexAt(tl.lyrics, 5.9), 0);
  assert.equal(lyricIndexAt(tl.lyrics, 6), 1);
  assert.equal(lyricIndexAt(tl.lyrics, 1000), 3);
});
