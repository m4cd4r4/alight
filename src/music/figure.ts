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
