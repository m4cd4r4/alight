// Run with: npm test  (Node's built-in runner; Node strips the TS types)
// Imports the JSON-free pd-library so it runs under raw `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PD_LIBRARY } from "./pd-library.ts";
import { voiceSong } from "../music/voicing.ts";

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
