import test from "node:test";
import assert from "node:assert/strict";
import { voiceFigure } from "./figure.ts";
import type { NoteEvent } from "./types.ts";

const sample: NoteEvent[] = [
  { struck: [{ note: "C#2", hand: "left", finger: 5 }, { note: "G#3", hand: "right", finger: 1 }], beats: 1 / 3, label: "C#m" },
  { struck: [{ note: "C#4", hand: "right", finger: 2 }], held: [{ note: "C#2", hand: "left", finger: 5 }], beats: 1 / 3, label: "C#m" },
  { struck: [{ note: "E4", hand: "right", finger: 5 }], held: [{ note: "C#2", hand: "left", finger: 5 }], beats: 1 / 3, label: "C#m" },
];

test("voiceFigure splits struck notes into the two hands", () => {
  const steps = voiceFigure(sample);
  assert.equal(steps.length, 3);
  assert.deepEqual(steps[0].left.map((n) => n.note), ["C#2"]);
  assert.deepEqual(steps[0].right.map((n) => n.note), ["G#3"]);
  assert.equal(steps[0].right[0].finger, 1);
});

test("voiceFigure carries held notes as the dim set, by hand", () => {
  const steps = voiceFigure(sample);
  // Step 2 strikes a right-hand note while the left-hand bass is still held.
  assert.deepEqual(steps[1].right.map((n) => n.note), ["C#4"]);
  assert.deepEqual(steps[1].heldLeft?.map((n) => n.note), ["C#2"]);
  assert.deepEqual(steps[1].heldRight, []);
  assert.equal(steps[1].left.length, 0);
});

test("voiceFigure preserves each step's beat length and label", () => {
  const steps = voiceFigure(sample);
  assert.ok(steps.every((s) => s.beats === 1 / 3));
  assert.equal(steps[0].name, "C#m");
  assert.equal(steps[0].inversion, null);
  assert.ok(steps.every((s) => s.unparseable === false));
});
