// Domain types for the chord/voicing layer. Pure data, no React.

export type Hand = "left" | "right";
export type KeyState = "now" | "next";
export type Voicing = "simple" | "full" | "beginner";

export interface VoicedNote {
  /** Sharp-spelled scientific pitch, e.g. "C#4". */
  note: string;
  /** Finger number, 1 (thumb) to 5 (pinky). */
  finger: number;
}

/** A single chord in the progression, resolved to the exact keys to press. */
export interface VoicedStep {
  /** The chord symbol as written, e.g. "G/B". */
  name: string;
  /** Full inversion label, e.g. "1st inversion"; null for root position. */
  inversion: string | null;
  left: VoicedNote[];
  right: VoicedNote[];
  /** True when the chord symbol could not be parsed. */
  unparseable: boolean;
}

export interface Song {
  title: string;
  artist: string;
  /** Short note shown beside the chord label (e.g. capo correction). */
  capoNote: string;
  /** The progression as chord symbols; the voicing engine derives the keys. */
  chords: string[];
}
