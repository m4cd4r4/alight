// Run with: npm test  (Node's built-in runner; Node strips the TS types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { blackKeyRootCount, easiestShift, keyLabel, transposeSymbol, transposeSymbols } from "./transpose.ts";

test("transposeSymbol shifts the root and preserves the quality", () => {
  assert.equal(transposeSymbol("Cm7", 2), "Dm7");
  assert.equal(transposeSymbol("Bb", 2), "C");
  assert.equal(transposeSymbol("C", 0), "C", "zero shift is a no-op");
});

test("transposeSymbol transposes the slash bass too", () => {
  assert.equal(transposeSymbol("G/B", 5), "C/E");
  assert.equal(transposeSymbol("Ab/C", 4), "C/E");
});

test("transposeSymbol leaves non-pitched tokens alone", () => {
  assert.equal(transposeSymbol("N", 3), "N");
});

test("transposeSymbols maps the whole progression (matches capo-3 spelling)", () => {
  assert.deepEqual(transposeSymbols(["C", "Am", "F", "G"], 3), ["Eb", "Cm", "Ab", "Bb"]);
});

test("blackKeyRootCount counts roots on black keys, ignoring spelling", () => {
  assert.equal(blackKeyRootCount(["Eb", "Ab", "Bb"], 0), 3);
  assert.equal(blackKeyRootCount(["Eb", "Ab", "Bb"], 1), 0, "up a semitone lands all on white keys");
});

test("easiestShift picks the shift with the fewest black-key roots", () => {
  // Eb/Ab/Bb are all black-key roots; +1 puts them on E/A/B (all white).
  assert.equal(easiestShift(["Eb", "Ab", "Bb"]), 1);
  // An already-white progression should stay put.
  assert.equal(easiestShift(["C", "F", "G", "Am"]), 0);
});

test("keyLabel shows the transposed root of the first chord", () => {
  assert.equal(keyLabel(["G", "C", "D"], 2), "A");
  assert.equal(keyLabel(["C", "Am", "F"], 0), "C");
});
