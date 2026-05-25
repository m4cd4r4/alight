// Note-name helpers shared by the voicing engine and the keyboard.

/** Map ASCII accidentals to real Unicode glyphs for display (# -> sharp, b -> flat). */
export function prettify(s: string): string {
  return s.replace(/#/g, "♯").replace(/b(?![a-z])/g, "♭");
}

/** Pitch-class portion of a scientific note name, e.g. "C#4" -> "C#". */
export function pitchClassOf(note: string): string {
  return note.replace(/-?\d+$/, "");
}

/** Octave number of a scientific note name, e.g. "C#4" -> 4. */
export function octaveOf(note: string): number {
  const m = note.match(/-?\d+$/);
  return m ? parseInt(m[0], 10) : 0;
}
