// Live key transposition for the whole progression. Beginners avoid sharps,
// flats, and the shapes that come with them; transposing shifts every chord by
// a fixed number of semitones, and "easiest key" picks the shift that lands the
// fewest chord roots on black keys. Pure data, no React.
//
// Spelling matches the capo path in parse.ts (Interval.fromSemitones +
// Note.simplify) so the same transposition reads the same everywhere. The
// keyboards never depend on this spelling - they derive keys from the chord
// notes via the voicing engine - so a clean, consistent label is all we need.

import { Interval, Note } from "tonal";

const BLACK_CHROMAS = new Set([1, 3, 6, 8, 10]);
const ROOT_RE = /^([A-G][#b]?)(.*)$/;

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Transpose a single note name up by `semitones`, keeping a sane spelling. */
function transposeNote(note: string, semitones: number): string {
  if (semitones === 0) return note;
  const interval = Interval.fromSemitones(mod12(semitones));
  const moved = Note.transpose(note, interval);
  return Note.simplify(moved) || moved || note;
}

/** Shift a chord's root (and any slash bass) by `semitones`, keeping quality. */
export function transposeSymbol(symbol: string, semitones: number): string {
  if (semitones === 0) return symbol;
  const slash = symbol.indexOf("/");
  const main = slash === -1 ? symbol : symbol.slice(0, slash);
  const bass = slash === -1 ? null : symbol.slice(slash + 1);

  const m = main.match(ROOT_RE);
  if (!m) return symbol; // not a pitched chord (e.g. "N") - leave as written
  let out = transposeNote(m[1], semitones) + m[2];

  if (bass) {
    const bm = bass.match(ROOT_RE);
    out += "/" + (bm ? transposeNote(bm[1], semitones) + bm[2] : bass);
  }
  return out;
}

export function transposeSymbols(symbols: string[], semitones: number): string[] {
  if (semitones === 0) return symbols;
  return symbols.map((s) => transposeSymbol(s, semitones));
}

/** How many chord roots land on a black key after shifting by `semitones`. */
export function blackKeyRootCount(symbols: string[], semitones: number): number {
  let count = 0;
  for (const symbol of symbols) {
    const m = symbol.match(ROOT_RE);
    if (!m) continue;
    if (BLACK_CHROMAS.has(mod12(Note.chroma(m[1]) + semitones))) count += 1;
  }
  return count;
}

/**
 * The shift (signed, -5..+6 semitones) that puts the fewest roots on black
 * keys. Ties break toward the smallest move, then toward transposing up.
 */
export function easiestShift(symbols: string[]): number {
  let best = 0;
  let bestBlack = blackKeyRootCount(symbols, 0);
  let bestDist = 0;
  for (let s = 1; s < 12; s++) {
    const signed = s > 6 ? s - 12 : s;
    const black = blackKeyRootCount(symbols, s);
    const dist = Math.abs(signed);
    const better =
      black < bestBlack ||
      (black === bestBlack && dist < bestDist) ||
      (black === bestBlack && dist === bestDist && signed > best);
    if (better) {
      best = signed;
      bestBlack = black;
      bestDist = dist;
    }
  }
  return best;
}

/** The key label shown in the transpose control: the first chord's shifted root. */
export function keyLabel(symbols: string[], semitones: number): string {
  for (const symbol of symbols) {
    const m = symbol.match(ROOT_RE);
    if (m) return transposeNote(m[1], semitones);
  }
  return "-";
}
