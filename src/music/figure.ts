// Note-sequence ("figure") engine. Where voicing.ts turns chord symbols into
// block chords, this turns an explicit, pre-authored sequence of strikes into
// the same VoicedStep shape the Play view already renders - so an arpeggio or a
// melody reuses the keyboards, staff, and strip unchanged.
//
// WYSIWYG contract holds here too: every note in a step is exactly what the
// keys light. Nothing is derived or guessed - the transcription is the source
// of truth, struck notes and the held bass alike.

import type { FigureNote, NoteEvent, VoicedNote, VoicedStep } from "./types.ts";

function toVoiced(notes: FigureNote[] | undefined, hand: "left" | "right"): VoicedNote[] {
  if (!notes) return [];
  return notes
    .filter((n) => n.hand === hand)
    .map((n) => ({ note: n.note, finger: n.finger }));
}

/**
 * Turn a note-sequence into renderable steps. Each event becomes one step: its
 * struck notes split into the two hands, the still-ringing notes carried as the
 * dim "held" set, and the step's beat length preserved so the clock can pace it.
 */
export function voiceFigure(figure: NoteEvent[]): VoicedStep[] {
  return figure.map((ev) => ({
    name: ev.label ?? "",
    inversion: null,
    left: toVoiced(ev.struck, "left"),
    right: toVoiced(ev.struck, "right"),
    heldLeft: toVoiced(ev.held, "left"),
    heldRight: toVoiced(ev.held, "right"),
    beats: ev.beats,
    unparseable: false,
  }));
}

/** One overview-strip card: a contiguous run of steps shown as a single chord. */
export interface StripCard {
  /** First step index this card covers (where a tap jumps the playhead). */
  startIndex: number;
  /** Last step index this card covers (inclusive). */
  endIndex: number;
  name: string;
  left: VoicedNote[];
  right: VoicedNote[];
}

function mergeNotes(into: Map<string, VoicedNote>, notes: VoicedNote[]): void {
  for (const n of notes) if (!into.has(n.note)) into.set(n.note, n);
}

/**
 * Cards for the overview strip/grid. Chord songs get one card per step (the
 * playhead is a chord). Figure songs group consecutive steps that share a
 * harmony label into one card showing the whole chord - so a 24-note arpeggio
 * reads as a single "C#m" card, not 24 near-identical single-key cards.
 */
export function stripCards(steps: VoicedStep[], grouped: boolean): StripCard[] {
  if (!grouped) {
    return steps.map((s, i) => ({ startIndex: i, endIndex: i, name: s.name, left: s.left, right: s.right }));
  }
  const cards: StripCard[] = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const open = cards[cards.length - 1];
    if (open && open.name === s.name) {
      // Same harmony, still running: fold this strike's keys into the card.
      const left = new Map(open.left.map((n) => [n.note, n]));
      const right = new Map(open.right.map((n) => [n.note, n]));
      mergeNotes(left, s.left);
      mergeNotes(right, s.right);
      open.endIndex = i;
      open.left = [...left.values()];
      open.right = [...right.values()];
    } else {
      cards.push({ startIndex: i, endIndex: i, name: s.name, left: [...s.left], right: [...s.right] });
    }
  }
  return cards;
}
