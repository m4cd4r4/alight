// The hand-authored, public-domain part of the built-in library. Kept free of
// any JSON-fixture import (see library.ts) so it stays unit-testable under
// `node --test`, which cannot follow a bare `import x from "...json"`.
//
// v1 is chords-only: each entry is a chord progression (string[]) fed through
// the same voicing engine as everything else (src/music/voicing.ts). Chord
// progressions are not copyrightable and every composition here is public
// domain (composers died 70+ years ago, or traditional/folk/nursery).

import type { Song, Voicing } from "../music/types.ts";
import type { Timeline } from "../music/timeline.ts";
import { PD_LYRICS } from "./pd-lyrics.ts";

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

type PdOpts = { lockVoicing?: Voicing };
function pd(id: string, title: string, artist: string, key: string, chords: string[], opts: PdOpts = {}): LibraryEntry {
  return {
    id,
    song: {
      title,
      artist,
      capoNote: "",
      chords,
      ...(opts.lockVoicing ? { lockVoicing: opts.lockVoicing } : {}),
    },
    timeline: null,
    key,
    license: PD,
  };
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

  // Classical themes (composers died centuries ago - public domain worldwide;
  // chords-only, so no recording-rights issue). Chosen for reducing cleanly to a
  // beginner progression.
  pd("bach-prelude-c", "Prelude in C", "J.S. Bach", "C",
    ["C", "Dm7", "G7", "C", "Am", "D7", "G7", "C"]),
  pd("bach-minuet-g", "Minuet in G", "J.S. Bach", "G",
    ["G", "D", "G", "C", "G", "D", "G", "G"]),
  pd("eine-kleine-nachtmusik", "Eine kleine Nachtmusik", "W.A. Mozart", "G",
    ["G", "D", "G", "D", "G", "C", "D", "G"]),
  pd("fur-elise", "Fur Elise", "Beethoven", "Am",
    ["Am", "E", "Am", "E", "Am", "C", "G", "Am", "E", "Am"]),
  // Locked to Full voicing - its harmony loses its character if simplified to triads.
  // A reduction of the opening, transposed to Am for reachable note names.
  pd("moonlight-sonata", "Moonlight Sonata (1st movement)", "Beethoven", "Am",
    ["Am", "Am", "Dm", "E7", "Am", "F", "Dm7", "E7", "Am"], { lockVoicing: "full" }),
  pd("brahms-lullaby", "Brahms' Lullaby", "Johannes Brahms", "G",
    ["G", "D7", "G", "D7", "G", "C", "G", "D7", "G"]),
  pd("vivaldi-spring", "Spring (The Four Seasons)", "Antonio Vivaldi", "D",
    ["D", "A7", "D", "A7", "D", "G", "A7", "D"]),
  pd("jesu-joy", "Jesu, Joy of Man's Desiring", "J.S. Bach", "G",
    ["G", "C", "G", "D", "G", "C", "D", "G"]),

  // More nursery / children's.
  pd("itsy-bitsy-spider", "The Itsy Bitsy Spider", "Traditional", "C",
    ["C", "F", "C", "G", "C", "F", "G", "C"]),
  pd("london-bridge", "London Bridge Is Falling Down", "Traditional", "C",
    ["C", "G", "C", "G", "C"]),
  pd("wheels-on-the-bus", "The Wheels on the Bus", "Traditional", "C",
    ["C", "F", "C", "G", "C"]),
  pd("pop-goes-the-weasel", "Pop Goes the Weasel", "Traditional", "C",
    ["C", "G", "C", "G", "C", "F", "C", "G", "C"]),
  pd("this-old-man", "This Old Man", "Traditional", "G",
    ["G", "C", "G", "D", "G"]),
  pd("bingo", "BINGO", "Traditional", "G",
    ["G", "C", "G", "D", "G", "C", "D", "G"]),
  pd("hush-little-baby", "Hush, Little Baby", "Traditional", "C",
    ["C", "G", "C", "G", "C"]),
  pd("rock-a-bye-baby", "Rock-a-bye Baby", "Traditional", "G",
    ["G", "D", "G", "D", "G", "C", "G", "D", "G"]),

  // More folk standards.
  pd("water-is-wide", "The Water Is Wide", "Traditional", "G",
    ["G", "Em", "C", "G", "C", "G", "D", "G"]),
  pd("red-river-valley", "Red River Valley", "Traditional", "G",
    ["G", "G", "D", "G", "G", "C", "G", "D", "G"]),
  pd("clementine", "Oh My Darling, Clementine", "Traditional", "C",
    ["C", "C", "G", "C", "C", "G", "C"]),
  pd("my-bonnie", "My Bonnie Lies Over the Ocean", "Traditional", "G",
    ["G", "C", "G", "D", "G", "C", "G", "D", "G"]),
  pd("coming-round-the-mountain", "She'll Be Coming 'Round the Mountain", "Traditional", "C",
    ["C", "C", "C", "C", "F", "C", "G", "C"]),
  pd("drunken-sailor", "Drunken Sailor", "Traditional", "Dm",
    ["Dm", "C", "Dm", "C", "Dm"]),
  pd("danny-boy", "Danny Boy (Londonderry Air)", "Traditional", "C",
    ["C", "F", "C", "Am", "F", "G", "C"]),
  pd("loch-lomond", "Loch Lomond", "Traditional", "G",
    ["G", "C", "G", "D", "G", "C", "D", "G"]),

  // More hymns / spirituals.
  pd("what-a-friend", "What a Friend We Have in Jesus", "Traditional", "G",
    ["G", "C", "G", "D", "G", "C", "G", "D", "G"]),
  pd("go-tell-it", "Go Tell It on the Mountain", "Traditional Spiritual", "C",
    ["C", "F", "C", "G", "C"]),
  pd("this-little-light", "This Little Light of Mine", "Traditional Spiritual", "C",
    ["C", "C", "C7", "F", "C", "G", "C"]),
  pd("whole-world", "He's Got the Whole World in His Hands", "Traditional Spiritual", "G",
    ["G", "D", "G", "D", "G", "C", "G", "D", "G"]),
  pd("joshua-jericho", "Joshua Fit the Battle of Jericho", "Traditional Spiritual", "Dm",
    ["Dm", "Gm", "Dm", "A7", "Dm"]),
  pd("be-thou-my-vision", "Be Thou My Vision", "Traditional (Slane)", "D",
    ["D", "G", "D", "A", "D", "G", "A", "D"]),

  // More Christmas carols.
  pd("o-come-all-ye-faithful", "O Come, All Ye Faithful", "Traditional", "G",
    ["G", "D", "G", "D", "G", "C", "G", "D", "G"]),
  pd("the-first-noel", "The First Noel", "Traditional", "D",
    ["D", "A", "D", "G", "D", "A", "D"]),
  pd("away-in-a-manger", "Away in a Manger", "Traditional", "G",
    ["G", "C", "G", "D", "G", "C", "G", "D", "G"]),
  pd("god-rest-ye", "God Rest Ye Merry, Gentlemen", "Traditional", "Em",
    ["Em", "Am", "Em", "B7", "Em", "G", "D", "Em"]),
  pd("good-king-wenceslas", "Good King Wenceslas", "Traditional", "G",
    ["G", "C", "G", "D", "G", "C", "D", "G"]),
  pd("we-three-kings", "We Three Kings", "Traditional", "Em",
    ["Em", "B7", "Em", "B7", "Em", "G", "C", "G", "D", "Em"]),
  pd("o-christmas-tree", "O Christmas Tree", "Traditional", "G",
    ["G", "D", "G", "C", "G", "D", "G"]),
  pd("carol-of-the-bells", "Carol of the Bells", "Mykola Leontovych", "Am",
    ["Am", "E", "Am", "E", "Am"]),

  // Patriotic / Americana.
  pd("when-johnny", "When Johnny Comes Marching Home", "Traditional", "Em",
    ["Em", "Em", "G", "D", "Em", "Am", "Em", "B7", "Em"]),
  pd("battle-hymn", "Battle Hymn of the Republic", "Traditional", "G",
    ["G", "G", "C", "G", "G", "D", "G", "C", "G", "D", "G"]),

  // Added 2026-06-09 - more public-domain songs across folk, shanties, rounds,
  // spirituals, and world traditions. Lyrics (PD-verified) live in pd-lyrics.ts.
  pd("barbara-allen", "Barbara Allen", "Traditional English/Scottish Folk", "D",
    ["D", "G", "D", "A7", "D", "G", "A7", "D"]),
  pd("wayfaring-stranger", "Wayfaring Stranger", "Traditional American Spiritual", "Am",
    ["Am", "Am", "Dm", "Am", "Am", "E7", "Am", "Am"]),
  pd("on-top-of-old-smoky", "On Top of Old Smoky", "Traditional American Folk", "G",
    ["G", "G", "C", "G", "G", "D7", "G", "G"]),
  pd("frankie-and-johnny", "Frankie and Johnny", "Traditional American Folk Ballad", "C",
    ["C", "C", "F", "F", "C", "G7", "C", "G7"]),
  pd("blow-the-man-down", "Blow the Man Down", "Traditional Sea Shanty", "G",
    ["G", "G", "D7", "G", "G", "C", "D7", "G"]),
  pd("frere-jacques", "Frère Jacques", "Traditional French Round", "F",
    ["F", "C7", "F", "C7", "F", "C7", "F", "C7"]),
  pd("sakura-sakura", "Sakura Sakura", "Traditional Japanese", "Am",
    ["Am", "Dm", "Am", "E", "Am", "Dm", "E", "Am"]),
  pd("dona-nobis-pacem", "Dona Nobis Pacem", "Traditional Round (attrib. Palestrina era)", "F",
    ["F", "C7", "F", "Bb", "F", "C7", "F", "C7", "F", "C7", "F", "Bb"]),
  pd("down-in-the-valley", "Down in the Valley", "Traditional American Folk", "G",
    ["G", "G", "D7", "D7", "D7", "D7", "G", "G"]),
  pd("angels-we-have-heard-on-high", "Angels We Have Heard on High", "Traditional French Carol", "G",
    ["G", "D7", "G", "G", "G", "D7", "G", "D7", "G", "G"]),
  pd("nobody-knows-the-trouble-ive-seen", "Nobody Knows the Trouble I've Seen", "Traditional Spiritual", "F",
    ["F", "F", "Bb", "F", "F", "C7", "F", "F"]),
  pd("go-down-moses", "Go Down, Moses", "Traditional Spiritual", "Am",
    ["Am", "Am", "E7", "Am", "Am", "Dm", "E7", "Am"]),
  pd("polly-wolly-doodle", "Polly Wolly Doodle", "Traditional American", "D",
    ["D", "D", "A7", "A7", "A7", "A7", "D", "D"]),
];

// Attach the public-domain lyric lines (kept in a separate map so the entries
// above stay readable). Songs with no PD lyrics simply get none.
for (const entry of PD_LIBRARY) {
  const lines = PD_LYRICS[entry.id];
  if (lines) entry.song.lyricLines = lines;
}
