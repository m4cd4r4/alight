import type { Song } from "../music/types.ts";

// Static sample data. The progression is stored as chord symbols; the
// voicing engine derives the exact keys, fingers, and inversion labels.
// No fetching - that is a later worktree.
export const landslide: Song = {
  title: "Landslide",
  artist: "Fleetwood Mac",
  capoNote: "Capo corrected. These are the real piano keys.",
  chords: ["C", "G/B", "Am7", "F", "C/E", "G"],
};

export const sampleSong = landslide;
