// Run with: npm test  (Node's built-in runner; Node strips the TS types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./parse.ts";

const fixture = readFileSync(
  join(import.meta.dirname, "__fixtures__", "landslide.content.txt"),
  "utf8",
);

test("fetched UG content, capo 3: transposes to true piano pitch", () => {
  const song = parse(fixture, { capo: 3, title: "Landslide", artist: "Fleetwood Mac" });

  assert.equal(song.title, "Landslide");
  assert.equal(song.artist, "Fleetwood Mac");
  assert.equal(song.capoNote, "Capo 3 corrected. These are the real piano keys.");

  // Capo 3 lifts every chord a minor third: C->Eb, G->Bb, A->C, F->Ab, B->D.
  assert.equal(song.chords[0], "Eb", "first chord transposed");
  assert.equal(song.chords[1], "Bb/D", "slash chord: both root and bass transposed");
  assert.equal(song.chords[2], "Cm7", "seventh preserved through transpose");
  assert.ok(song.chords.includes("Abadd9"), "add9 extension preserved");
  assert.ok(song.chords.includes("Ebsus4"), "sus4 extension preserved");
  assert.ok(song.chords.includes("Ddim"), "dim extension preserved");

  // N.C. is filtered out entirely.
  assert.ok(!song.chords.some((c) => /n\.?c/i.test(c)), "no N.C. tokens survive");

  // No two adjacent chords are identical (the held outro C C collapses).
  assert.ok(
    song.chords.every((c, i) => c !== song.chords[i - 1]),
    "consecutive duplicates collapsed",
  );

  // Whole-progression snapshot, so a parser regression is caught loudly.
  assert.deepEqual(song.chords, [
    "Eb", "Bb/D", "Cm7", "Ab",
    "Eb", "Bb/D", "Cm7", "Ab",
    "Eb", "Bb/D", "Cm", "Abadd9",
    "Eb", "Bb", "Cm", "Ab",
    "D", "Ebsus4", "Ddim",
    "Eb", "Bb",
  ]);
});

test("same content, no capo: chords untouched, German H mapped to B", () => {
  const song = parse(fixture, { capo: 0, title: "Landslide" });

  assert.equal(song.capoNote, "");
  assert.equal(song.artist, "");
  assert.equal(song.chords[0], "C");
  assert.equal(song.chords[1], "G/B");
  assert.ok(song.chords.includes("Am7"));
  assert.ok(song.chords.includes("Fadd9"));
  assert.equal(song.chords[16], "B", "European H rendered as B");
  // Transposition is a bijection on pitch classes, so dedup length is stable.
  assert.equal(song.chords.length, 21);
});

test("paste path: plain text with no [ch] tags runs the same parser", () => {
  const pasted = [
    "[Verse]",
    "C       G/B      Am       F",
    "some plain words that are lyrics not chords",
    "C   G   Am7   F",
  ].join("\n");

  const song = parse(pasted, { title: "Pasted song" });

  assert.deepEqual(song.chords, ["C", "G/B", "Am", "F", "C", "G", "Am7", "F"]);
  assert.equal(song.capoNote, "");
});

test("adversarial [ch] line: junk skipped, H mapped, N.C. dropped, slash kept", () => {
  const content = "[ch]H[/ch] [ch]Xyz[/ch] [ch]Bb7[/ch] [ch]N.C.[/ch] [ch]C/E[/ch]";
  const song = parse(content);
  assert.deepEqual(song.chords, ["B", "Bb7", "C/E"]);
});

test("repeat markers expand before dedup", () => {
  const song = parse("[ch]C[/ch] [ch]G[/ch] x4");
  assert.deepEqual(song.chords, ["C", "G", "C", "G", "C", "G", "C", "G"]);
});

test("runaway repeat counts are bounded", () => {
  const song = parse("[ch]C[/ch] [ch]G[/ch] x999");
  assert.equal(song.chords.length, 16, "x999 capped to 8 passes of C G");
});

test("empty or chordless input yields an empty progression, never throws", () => {
  assert.deepEqual(parse("").chords, []);
  assert.deepEqual(parse("just some lyrics with no chords at all\nmore words").chords, []);
});
