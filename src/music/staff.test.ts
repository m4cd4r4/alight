// Run with: npm test (Node's built-in runner; Node strips the TS types).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diatonicStep,
  isSharp,
  noteY,
  ledgerYs,
  LINE_GAP,
  TREBLE_TOP_Y,
  TREBLE_BOTTOM_Y,
  BASS_TOP_Y,
  BASS_BOTTOM_Y,
} from "./staff.ts";

test("diatonicStep counts octave*7 + letter, ignoring accidentals", () => {
  assert.equal(diatonicStep("C4"), 28);
  assert.equal(diatonicStep("C#4"), 28); // sharp shares the natural's step
  assert.equal(diatonicStep("B4"), 34);
  assert.equal(diatonicStep("D3"), 22);
});

test("isSharp detects the engine's sharp spelling", () => {
  assert.equal(isSharp("F#3"), true);
  assert.equal(isSharp("F3"), false);
});

test("staff middle lines land on their reference note", () => {
  assert.equal(noteY("B4", "treble"), TREBLE_TOP_Y + 2 * LINE_GAP);
  assert.equal(noteY("D3", "bass"), BASS_TOP_Y + 2 * LINE_GAP);
});

test("staff edge lines land where expected", () => {
  assert.equal(noteY("F5", "treble"), TREBLE_TOP_Y); // top treble line
  assert.equal(noteY("E4", "treble"), TREBLE_BOTTOM_Y); // bottom treble line
  assert.equal(noteY("A3", "bass"), BASS_TOP_Y); // top bass line
  assert.equal(noteY("G2", "bass"), BASS_BOTTOM_Y); // bottom bass line
});

test("middle C is one ledger below treble / one ledger above bass", () => {
  // With wide-spaced staves the two clefs write middle C at different heights.
  assert.equal(noteY("C4", "treble"), TREBLE_BOTTOM_Y + LINE_GAP);
  assert.equal(noteY("C4", "bass"), BASS_TOP_Y - LINE_GAP);
  assert.ok(noteY("C4", "treble") < noteY("C4", "bass"));
});

test("the right hand's lowest note (F3) stays above the bass staff", () => {
  // F3 is the voicing engine's hard floor for the right hand (RH_LOW).
  assert.ok(noteY("F3", "treble") < BASS_TOP_Y, "F3 must not draw inside the bass staff");
});

test("ledgerYs: notes inside the staff need none", () => {
  assert.deepEqual(ledgerYs(noteY("G4", "treble"), "treble"), []);
  assert.deepEqual(ledgerYs(noteY("C3", "bass"), "bass"), []);
});

test("ledgerYs: middle C draws one ledger on either clef", () => {
  assert.deepEqual(ledgerYs(noteY("C4", "treble"), "treble"), [TREBLE_BOTTOM_Y + LINE_GAP]);
  assert.deepEqual(ledgerYs(noteY("C4", "bass"), "bass"), [BASS_TOP_Y - LINE_GAP]);
});

test("ledgerYs: a note hanging in the space past the staff still shows its ledger", () => {
  // B3 sits in the space just below the first treble ledger (middle C) and still
  // shows that ledger line above it.
  assert.deepEqual(ledgerYs(noteY("B3", "treble"), "treble"), [TREBLE_BOTTOM_Y + LINE_GAP]);
});

test("ledgerYs: low bass notes stack ledgers below the staff", () => {
  assert.deepEqual(ledgerYs(noteY("C2", "bass"), "bass"), [
    BASS_BOTTOM_Y + LINE_GAP,
    BASS_BOTTOM_Y + 2 * LINE_GAP,
  ]);
});
