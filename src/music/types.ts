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
  /**
   * When set, the Play view forces this voicing and greys out the others - for
   * pieces whose harmony would be misrepresented by the simpler voicings.
   */
  lockVoicing?: Voicing;
  /**
   * Public-domain lyric lines for manual (untimed) songs, each tagged with the
   * chord index it begins on (`at`). The Play view shows the active line under
   * the chord name and the covering line in the strip - the same display the
   * analysed (timed) songs get from their timeline, but driven by the step.
   */
  lyricLines?: { text: string; at: number }[];
}
