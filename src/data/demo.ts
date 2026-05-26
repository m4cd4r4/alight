// The first-run demo: a legally-clean public-domain song (Amazing Grace) with a
// full timeline, so the app is alive and the play-along is self-explanatory on
// first open. The timeline is derived from the same sample analysis the mapper
// test uses, so the demo and the test never drift apart.

import sampleAnalysis from "../music/__fixtures__/sample-analysis.json";
import { fromChordMini, timelineSymbols, type ChordMiniAnalysis, type Timeline } from "../music/timeline.ts";
import type { Song } from "../music/types.ts";

export const demoTimeline: Timeline = fromChordMini(sampleAnalysis as ChordMiniAnalysis);

export const demoSong: Song = {
  title: "Amazing Grace",
  artist: "Traditional",
  capoNote: "",
  chords: timelineSymbols(demoTimeline),
};
