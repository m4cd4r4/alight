// The built-in song library: a curated shelf of public-domain songs that ships
// inside the app. No network, no auth, no upstream to rotate, no copyright
// exposure - it cannot be broken by Ultimate Guitar, YouTube, or a reboot.
//
// The hand-authored chord data lives in pd-library.ts (kept JSON-free so it is
// unit-testable). Here we add the one timed entry, Amazing Grace, which reuses
// the existing analysis fixture; the rest play in manual mode.

import { demoSong, demoTimeline } from "./demo.ts";
import { PD_LIBRARY, type LibraryEntry } from "./pd-library.ts";

export type { LibraryEntry };

export const LIBRARY: LibraryEntry[] = [
  { id: "amazing-grace", song: demoSong, timeline: demoTimeline, key: "G", license: "Public Domain" },
  ...PD_LIBRARY,
];
