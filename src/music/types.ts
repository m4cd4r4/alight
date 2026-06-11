// Domain types for the chord/voicing layer. Pure data, no React.

export type Hand = "left" | "right";
export type KeyState = "now" | "next" | "held";
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
  /**
   * Notes still sounding from an earlier step but not struck on this one - the
   * sustained bass under a rolling arpeggio (figure songs only). Rendered dim.
   */
  heldLeft?: VoicedNote[];
  heldRight?: VoicedNote[];
  /** Step length in beats (figure songs only); chord songs leave this undefined. */
  beats?: number;
  /** True when the chord symbol could not be parsed. */
  unparseable: boolean;
}

/** One struck note in a note-sequence (figure) song, with its hand and finger. */
export interface FigureNote {
  /** Sharp-spelled scientific pitch, e.g. "G#3". */
  note: string;
  hand: Hand;
  /** Finger number, 1 (thumb) to 5 (pinky). */
  finger: number;
}

/**
 * One strike in a note-sequence song: the notes that sound on this step, the
 * notes still ringing from before (the held bass), and how long the step lasts.
 * Used for pieces whose real character is individual notes and rhythm - an
 * arpeggio or a melody - rather than block chords.
 */
export interface NoteEvent {
  /** Notes struck (onset) on this step. */
  struck: FigureNote[];
  /** Notes still ringing from an earlier step, not re-struck here. */
  held?: FigureNote[];
  /** Length of this step in beats: 1 = a quarter, 1/3 = one triplet eighth. */
  beats: number;
  /** Harmony or section label shown in place of a chord name, e.g. "C#m". */
  label?: string;
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
  /**
   * A note-sequence transcription. When present, the Play view steps through
   * these strikes (with their own rhythm and held notes) instead of voicing the
   * chord symbols - for arpeggios and melodies that block chords misrepresent.
   * `chords` is kept for the library listing and search.
   */
  figure?: NoteEvent[];
  /** Suggested tempo for a figure song, in BPM. Defaults if absent. */
  figureBpm?: number;
}
