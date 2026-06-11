import test from "node:test";
import assert from "node:assert/strict";
import { stripCards, voiceFigure } from "./figure.ts";
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

test("stripCards ungrouped is one card per step (chord songs unchanged)", () => {
  const steps = voiceFigure(sample);
  const cards = stripCards(steps, false);
  assert.equal(cards.length, steps.length);
  cards.forEach((c, i) => {
    assert.equal(c.startIndex, i);
    assert.equal(c.endIndex, i);
    assert.equal(c.name, steps[i].name);
  });
});

test("stripCards groups a run of same-harmony strikes into one chord card", () => {
  const steps = voiceFigure(sample); // three C#m strikes: C#2+G#3, then C#4, then E4
  const cards = stripCards(steps, true);
  assert.equal(cards.length, 1, "all three C#m strikes collapse to one card");
  const card = cards[0];
  assert.equal(card.startIndex, 0);
  assert.equal(card.endIndex, 2);
  assert.equal(card.name, "C#m");
  // The card shows the whole chord: the union of every struck note in the run.
  assert.deepEqual(card.left.map((n) => n.note), ["C#2"]);
  assert.deepEqual(card.right.map((n) => n.note).sort(), ["C#4", "E4", "G#3"]);
});

test("stripCards starts a new card when the harmony label changes", () => {
  const steps = voiceFigure([
    { struck: [{ note: "C#4", hand: "right", finger: 1 }], beats: 1, label: "C#m" },
    { struck: [{ note: "E4", hand: "right", finger: 2 }], beats: 1, label: "C#m" },
    { struck: [{ note: "A3", hand: "right", finger: 1 }], beats: 1, label: "A" },
    { struck: [{ note: "C#4", hand: "right", finger: 1 }], beats: 1, label: "C#m" },
  ]);
  const cards = stripCards(steps, true);
  assert.deepEqual(cards.map((c) => c.name), ["C#m", "A", "C#m"]);
  assert.deepEqual(cards.map((c) => [c.startIndex, c.endIndex]), [[0, 1], [2, 2], [3, 3]]);
});
