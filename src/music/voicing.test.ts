// Run with: npm test  (Node's built-in runner; Node strips the TS types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { simplifyToTriad, voiceSong } from "./voicing.ts";

test("simplifyToTriad reduces any chord to a beginner triad", () => {
  assert.equal(simplifyToTriad("Bm7b5/A"), "Bm", "half-diminished + slash -> minor triad");
  assert.equal(simplifyToTriad("Cmaj7"), "C", "major 7th -> major triad");
  assert.equal(simplifyToTriad("Cdim"), "Cm", "diminished -> minor triad");
  assert.equal(simplifyToTriad("Caug"), "C", "augmented -> major triad");
  assert.equal(simplifyToTriad("Csus4"), "C", "suspended -> major triad");
  assert.equal(simplifyToTriad("G/B"), "G", "slash dropped");
  assert.equal(simplifyToTriad("F#m7"), "F#m", "minor 7th -> minor triad");
});

test("beginner voicing always produces a 3-note root-position chord", () => {
  const steps = voiceSong(["Bm7b5/A", "Cmaj7", "G/B"], "beginner");
  assert.deepEqual(steps.map((s) => s.name), ["Bm", "C", "G"]);
  for (const step of steps) {
    assert.equal(step.right.length, 3, "right hand is a triad");
    assert.equal(step.inversion, null, "root position (no slash)");
    assert.equal(step.unparseable, false);
  }
});

test("simple and full voicings are unchanged by the beginner addition", () => {
  assert.equal(voiceSong(["Cmaj7"], "simple")[0].right.length, 3, "simple keeps 3 notes");
  assert.equal(voiceSong(["Cmaj7"], "full")[0].right.length, 4, "full keeps all notes");
  assert.equal(voiceSong(["G/B"], "simple")[0].name, "G/B", "simple preserves the written symbol");
});
