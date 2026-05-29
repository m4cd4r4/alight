// Voicing engine. Turns a progression of chord symbols into the exact keys
// to press on two hands, with a greedy nearest-voicing pass so the right
// hand barely moves chord-to-chord.
//
// WYSIWYG contract: what this produces is exactly what the keyboards light.
// Reference: Tymoczko, "The Geometry of Musical Chords" (Science, 2006);
// greedy nearest-neighbour is enough for v1.

import { Chord, Note } from "tonal";
import type { VoicedNote, VoicedStep, Voicing } from "./types.ts";

// Fixed registers. Left hand sits low (C2-C3); right hand around middle C.
const LH_BASS_CEIL = 48; // C3 - bass placed at the highest octave at or below this
const RH_LOW = 53; // F3 - bottom of the right-hand window
const RH_HIGH = 71; // B4 - top of the right-hand window
const RH_SEED_CENTER = 60; // C4 - the first chord is seeded near middle C

// Finger assignments by note count, low to high. Matches the kit's hand-tuned
// fingering: triad 1-3-5, seventh chord 1-2-4-5.
const RIGHT_FINGERS: Record<number, number[]> = {
  1: [1],
  2: [1, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
};

const INVERSION_LABELS = [
  null, // root position
  "1st inversion",
  "2nd inversion",
  "3rd inversion",
  "4th inversion",
];

/** Smallest MIDI value at or above `floor` whose pitch class is `chroma`. */
function ceilToChroma(floor: number, chroma: number): number {
  const offset = (((chroma - floor) % 12) + 12) % 12;
  return floor + offset;
}

/** MIDI value with pitch class `chroma` nearest to `center`. */
function nearestChroma(center: number, chroma: number): number {
  const below = center - (((center - chroma) % 12) + 12) % 12;
  const above = below + 12;
  return center - below <= above - center ? below : above;
}

/** Largest MIDI value at or below `ceil` whose pitch class is `chroma`. */
function floorToChroma(ceil: number, chroma: number): number {
  const offset = (((ceil - chroma) % 12) + 12) % 12;
  return ceil - offset;
}

/**
 * A compact ascending voicing: rotate the pitch-class set by `rotation`
 * (this is what produces inversions), then stack each tone at the lowest
 * pitch strictly above the previous one, starting at or above `bottomFloor`.
 */
function compactStack(chromas: number[], rotation: number, bottomFloor: number): number[] {
  const out: number[] = [];
  let floor = bottomFloor;
  for (let i = 0; i < chromas.length; i++) {
    const chroma = chromas[(rotation + i) % chromas.length];
    const midi = ceilToChroma(floor, chroma);
    out.push(midi);
    floor = midi + 1;
  }
  return out;
}

/** Voice-leading cost: total semitone travel between two voicings. */
function voicingDistance(a: number[], b: number[]): number {
  const shared = Math.min(a.length, b.length);
  let cost = 0;
  for (let i = 0; i < shared; i++) cost += Math.abs(a[i] - b[i]);
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  for (let i = shared; i < longer.length; i++) {
    cost += Math.min(...shorter.map((m) => Math.abs(longer[i] - m)));
  }
  return cost;
}

/**
 * Choose the right-hand voicing of `chromas` that moves least from `prev`.
 * With no previous voicing, seed root position near middle C.
 */
function voiceRight(chromas: number[], prev: number[] | null): number[] {
  if (prev === null) {
    const tonicMidi = nearestChroma(RH_SEED_CENTER, chromas[0]);
    let seed = compactStack(chromas, 0, tonicMidi);
    while (seed[seed.length - 1] > RH_HIGH) seed = seed.map((m) => m - 12);
    while (seed[0] < RH_LOW) seed = seed.map((m) => m + 12);
    return seed;
  }

  const candidates: number[][] = [];
  for (let rotation = 0; rotation < chromas.length; rotation++) {
    const base = compactStack(chromas, rotation, RH_LOW);
    for (let octave = 0; octave <= 2; octave++) {
      const shifted = base.map((m) => m + 12 * octave);
      if (shifted[shifted.length - 1] <= RH_HIGH) candidates.push(shifted);
    }
  }

  let best = candidates[0];
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const span = candidate[candidate.length - 1] - candidate[0];
    // Voice-leading cost dominates; span is a faint tie-breaker toward compactness.
    const score = voicingDistance(candidate, prev) + span * 0.001;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function withFingers(midis: number[], fingers: number[]): VoicedNote[] {
  return midis.map((midi, i) => ({
    note: Note.fromMidiSharps(midi),
    finger: fingers[i] ?? fingers[fingers.length - 1] ?? 1,
  }));
}

/**
 * Reduce a chord to a plain major or minor triad a beginner can actually
 * finger: drop every extension, drop the slash bass, map diminished to minor
 * and augmented/sus to major. The result is always a 3-note root-position triad.
 */
export function simplifyToTriad(rawSymbol: string): string {
  const chordPart = rawSymbol.split("/")[0];
  const chord = Chord.get(chordPart);
  if (chord.empty || !chord.tonic) return chordPart; // leave unparseable as written
  const root = chord.tonic;
  return chord.quality === "Minor" || chord.quality === "Diminished" ? `${root}m` : root;
}

/** Voice an entire progression. The greedy pass threads through the steps. */
export function voiceSong(chords: string[], voicing: Voicing): VoicedStep[] {
  const steps: VoicedStep[] = [];
  let prevRight: number[] | null = null;

  for (const rawSymbol of chords) {
    const symbol = voicing === "beginner" ? simplifyToTriad(rawSymbol) : rawSymbol;
    const [chordPart, bassPart] = symbol.split("/");
    const chord = Chord.get(chordPart);

    if (chord.empty || chord.notes.length === 0) {
      steps.push({ name: symbol, inversion: null, left: [], right: [], unparseable: true });
      continue;
    }

    const allChromas = chord.notes.map((n) => Note.chroma(n));
    const toneNotes = voicing === "full" ? chord.notes : chord.notes.slice(0, 3);
    const toneChromas = toneNotes.map((n) => Note.chroma(n));

    const bassChroma = bassPart ? Note.chroma(bassPart) : allChromas[0];
    const degree = allChromas.indexOf(bassChroma);
    const inversion =
      degree <= 0
        ? null // root position, or a bass that is not a chord tone
        : degree < INVERSION_LABELS.length
          ? INVERSION_LABELS[degree]
          : `${degree}th inversion`;

    const leftMidi = floorToChroma(LH_BASS_CEIL, bassChroma);
    const left: VoicedNote[] = [{ note: Note.fromMidiSharps(leftMidi), finger: 5 }];

    const rightMidis = voiceRight(toneChromas, prevRight);
    prevRight = rightMidis;
    const right = withFingers(rightMidis, RIGHT_FINGERS[rightMidis.length] ?? RIGHT_FINGERS[5]);

    steps.push({ name: symbol, inversion, left, right, unparseable: false });
  }

  return steps;
}
