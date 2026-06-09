// Maps a note name to its place on a grand staff. Pure geometry so it can be
// unit-tested without rendering; ChordStaff.tsx draws the SVG from these numbers.
//
// Right hand reads on the treble clef, left hand on the bass clef, matching the
// two keyboards. The staves are spaced generously (not the theoretical minimum)
// so the right hand's low notes (down to F3) sit clearly in the gap below the
// treble staff rather than crowding into the bass staff. As in real wide-spaced
// piano music, middle C is therefore a ledger below the treble OR a ledger above
// the bass - not a single shared line.

import { octaveOf, pitchClassOf } from "./notes.ts";

export type Clef = "treble" | "bass";

const LETTER_STEP: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

// SVG geometry. Five lines per staff, LINE_GAP apart; a note moves HALF per
// diatonic step (line -> adjacent space).
export const LINE_GAP = 8;
const HALF = LINE_GAP / 2;

export const TREBLE_TOP_Y = 12; // F5, the top treble line
export const TREBLE_BOTTOM_Y = TREBLE_TOP_Y + 4 * LINE_GAP; // E4 (44)
// A 5-gap separation keeps the right hand's low ledger notes (F3 .. B3) in the
// gap above the bass staff instead of drawing inside it.
export const BASS_TOP_Y = TREBLE_BOTTOM_Y + 5 * LINE_GAP; // A3 (84)
export const BASS_BOTTOM_Y = BASS_TOP_Y + 4 * LINE_GAP; // G2 (116)

// Diatonic step = octave * 7 + letter index. Reference each staff off its middle
// line: treble B4, bass D3.
const TREBLE_MIDDLE_STEP = 4 * 7 + LETTER_STEP.B; // 34, B4
const BASS_MIDDLE_STEP = 3 * 7 + LETTER_STEP.D; // 22, D3
const TREBLE_MIDDLE_Y = TREBLE_TOP_Y + 2 * LINE_GAP; // B4
const BASS_MIDDLE_Y = BASS_TOP_Y + 2 * LINE_GAP; // D3

/** Diatonic step of a note, ignoring accidentals (C#4 and C4 share a step). */
export function diatonicStep(note: string): number {
  const letter = pitchClassOf(note)[0]?.toUpperCase() ?? "C";
  return octaveOf(note) * 7 + (LETTER_STEP[letter] ?? 0);
}

/** True when the note carries a sharp (the voicing engine spells with sharps). */
export function isSharp(note: string): boolean {
  return pitchClassOf(note).includes("#");
}

/** Vertical centre of the notehead for `note` on the given clef. */
export function noteY(note: string, clef: Clef): number {
  const step = diatonicStep(note);
  return clef === "treble"
    ? TREBLE_MIDDLE_Y - (step - TREBLE_MIDDLE_STEP) * HALF
    : BASS_MIDDLE_Y - (step - BASS_MIDDLE_STEP) * HALF;
}

/**
 * Y positions of the ledger lines a note at `y` needs on `clef` - the line
 * positions between the staff edge and the note (a note hanging in the space
 * just past the staff still shows the ledger line it hangs from).
 */
export function ledgerYs(y: number, clef: Clef): number[] {
  const top = clef === "treble" ? TREBLE_TOP_Y : BASS_TOP_Y;
  const bottom = clef === "treble" ? TREBLE_BOTTOM_Y : BASS_BOTTOM_Y;
  const out: number[] = [];
  const eps = 0.5;
  if (y > bottom + eps) {
    for (let ly = bottom + LINE_GAP; ly <= y + eps; ly += LINE_GAP) out.push(ly);
  } else if (y < top - eps) {
    for (let ly = top - LINE_GAP; ly >= y - eps; ly -= LINE_GAP) out.push(ly);
  }
  return out;
}
