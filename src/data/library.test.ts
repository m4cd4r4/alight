// Run with: npm test  (Node's built-in runner; Node strips the TS types)
// Imports the JSON-free pd-library so it runs under raw `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PD_LIBRARY } from "./pd-library.ts";
import { voiceSong } from "../music/voicing.ts";
import { voiceFigure } from "../music/figure.ts";
import { Note } from "tonal";

test("every bundled song voices cleanly - no unparseable chord can ship", () => {
  for (const entry of PD_LIBRARY) {
    assert.ok(entry.song.chords.length > 0, `${entry.id} has no chords`);
    for (const voicing of ["beginner", "simple"] as const) {
      const steps = voiceSong(entry.song.chords, voicing);
      assert.equal(steps.length, entry.song.chords.length, `${entry.id} (${voicing}): step count`);
      const bad = steps.filter((s) => s.unparseable).map((s) => s.name);
      assert.deepEqual(bad, [], `${entry.id} (${voicing}): unparseable chords ${bad.join(", ")}`);
    }
  }
});

test("bundled song ids are unique", () => {
  const ids = PD_LIBRARY.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate id in PD_LIBRARY");
});

test("figure songs (where present) have real notes, positive beats, and voice cleanly", () => {
  for (const entry of PD_LIBRARY) {
    const figure = entry.song.figure;
    if (!figure) continue;
    assert.ok(figure.length > 0, `${entry.id}: empty figure`);
    for (const ev of figure) {
      assert.ok(ev.beats > 0, `${entry.id}: step beats must be > 0 (got ${ev.beats})`);
      assert.ok(ev.struck.length > 0, `${entry.id}: a figure step strikes nothing`);
      for (const n of [...ev.struck, ...(ev.held ?? [])]) {
        assert.ok(Number.isFinite(Note.midi(n.note)), `${entry.id}: unparseable note ${n.note}`);
        assert.ok(n.finger >= 1 && n.finger <= 5, `${entry.id}: bad finger ${n.finger} on ${n.note}`);
      }
    }
    // The builder must produce a step per strike with both hands resolved.
    const steps = voiceFigure(figure);
    assert.equal(steps.length, figure.length, `${entry.id}: figure step count`);
    assert.ok(steps.every((s) => !s.unparseable), `${entry.id}: figure produced an unparseable step`);
  }
});

test("lyric lines (where present) align to valid, ascending chord positions", () => {
  for (const entry of PD_LIBRARY) {
    const lines = entry.song.lyricLines;
    if (!lines) continue;
    assert.ok(lines.length > 0, `${entry.id}: empty lyricLines`);
    let prev = -1;
    for (const line of lines) {
      assert.ok(line.text.trim().length > 0, `${entry.id}: blank lyric line`);
      assert.ok(
        line.at >= 0 && line.at < entry.song.chords.length,
        `${entry.id}: line 'at' ${line.at} out of range 0..${entry.song.chords.length - 1}`,
      );
      assert.ok(line.at > prev, `${entry.id}: lyric lines must ascend by chord (got ${line.at} after ${prev})`);
      prev = line.at;
    }
  }
});
