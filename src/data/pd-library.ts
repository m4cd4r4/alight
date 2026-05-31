// The hand-authored, public-domain part of the built-in library. Kept free of
// any JSON-fixture import (see library.ts) so it stays unit-testable under
// `node --test`, which cannot follow a bare `import x from "...json"`.
//
// v1 is chords-only: each entry is a chord progression (string[]) fed through
// the same voicing engine as everything else (src/music/voicing.ts). Chord
// progressions are not copyrightable and every composition here is public
// domain (composers died 70+ years ago, or traditional/folk/nursery).

import type { Song } from "../music/types.ts";
import type { Timeline } from "../music/timeline.ts";

export interface LibraryEntry {
  /** Stable slug, used as the React key. */
  id: string;
  song: Song;
  /** A play-along timeline when one exists; null = manual stepping. */
  timeline: Timeline | null;
  /** Display-only key label, e.g. "Am". */
  key: string;
  /** Always public domain in v1; kept for future CC-BY entries that need credit. */
  license: string;
}

const PD = "Public Domain";

function pd(id: string, title: string, artist: string, key: string, chords: string[]): LibraryEntry {
  return { id, song: { title, artist, capoNote: "", chords }, timeline: null, key, license: PD };
}

export const PD_LIBRARY: LibraryEntry[] = [
  pd("twinkle-twinkle", "Twinkle Twinkle Little Star", "Traditional", "C",
    ["C", "C", "F", "C", "F", "C", "G", "C", "C", "F", "C", "G", "C"]),
  pd("mary-had-a-little-lamb", "Mary Had a Little Lamb", "Traditional", "C",
    ["C", "G", "C", "C", "G", "C"]),
  pd("ode-to-joy", "Ode to Joy", "Beethoven", "C",
    ["C", "C", "G", "C", "C", "G", "C", "C"]),
  pd("when-the-saints", "When the Saints Go Marching In", "Traditional", "C",
    ["C", "C", "C7", "F", "C", "G", "C", "C"]),
  pd("auld-lang-syne", "Auld Lang Syne", "Traditional", "G",
    ["G", "C", "G", "D", "G", "C", "D", "G"]),
  pd("swing-low", "Swing Low, Sweet Chariot", "Traditional Spiritual", "G",
    ["G", "C", "G", "D", "G", "C", "G", "D", "G"]),
  pd("simple-gifts", "Simple Gifts", "Traditional (Shaker)", "G",
    ["G", "G", "D", "G", "G", "C", "G", "D", "G"]),
  pd("scarborough-fair", "Scarborough Fair", "Traditional", "Am",
    ["Am", "G", "Am", "C", "D", "Am", "G", "Am"]),
  pd("greensleeves", "Greensleeves", "Traditional", "Am",
    ["Am", "C", "G", "Am", "Am", "E", "Am", "C", "G", "Am", "E", "Am"]),
  pd("house-of-the-rising-sun", "House of the Rising Sun", "Traditional", "Am",
    ["Am", "C", "D", "F", "Am", "C", "E", "E", "Am", "C", "D", "F", "Am", "E", "Am", "Am"]),
  pd("pachelbels-canon", "Pachelbel's Canon", "Johann Pachelbel", "D",
    ["D", "A", "Bm", "F#m", "G", "D", "G", "A"]),

  // Christmas carols (all public domain).
  pd("silent-night", "Silent Night", "Franz Gruber", "C",
    ["C", "C", "G", "C", "C", "G", "C", "F", "C", "F", "C", "C", "G", "C"]),
  pd("jingle-bells", "Jingle Bells", "James Pierpont", "C",
    ["C", "C", "F", "C", "C", "G", "C", "C"]),
  pd("joy-to-the-world", "Joy to the World", "Traditional", "C",
    ["C", "G", "C", "F", "C", "G", "C"]),
  pd("deck-the-halls", "Deck the Halls", "Traditional", "G",
    ["G", "C", "G", "D", "G", "C", "G", "D", "G"]),
  pd("we-wish-merry-christmas", "We Wish You a Merry Christmas", "Traditional", "G",
    ["G", "C", "D", "G", "C", "D", "G"]),
  pd("hark-the-herald", "Hark the Herald Angels Sing", "Felix Mendelssohn", "G",
    ["G", "C", "G", "D", "G", "D", "G", "C", "D", "G"]),

  // Folk standards.
  pd("oh-susanna", "Oh Susanna", "Stephen Foster", "C",
    ["C", "C", "G", "C", "C", "F", "C", "G", "C"]),
  pd("shenandoah", "Shenandoah", "Traditional", "G",
    ["G", "C", "G", "Em", "C", "G", "D", "G"]),
  pd("home-on-the-range", "Home on the Range", "Traditional", "G",
    ["G", "C", "G", "D", "G", "C", "G", "D", "G"]),
  pd("waltzing-matilda", "Waltzing Matilda", "Traditional (Australian)", "C",
    ["C", "F", "C", "G", "C", "F", "C", "G", "C"]),

  // Spirituals.
  pd("michael-row-the-boat", "Michael Row the Boat Ashore", "Traditional Spiritual", "C",
    ["C", "F", "C", "Am", "C", "G", "C"]),
  pd("kumbaya", "Kumbaya", "Traditional Spiritual", "C",
    ["C", "F", "C", "G", "C", "F", "C", "G", "C"]),

  // More nursery / sing-along.
  pd("old-macdonald", "Old MacDonald Had a Farm", "Traditional", "G",
    ["G", "G", "C", "G", "D", "G"]),
  pd("if-youre-happy", "If You're Happy and You Know It", "Traditional", "C",
    ["C", "C", "G", "C", "F", "C", "G", "C"]),
  pd("row-row-row", "Row Row Row Your Boat", "Traditional", "C",
    ["C", "C", "G", "C"]),
];
