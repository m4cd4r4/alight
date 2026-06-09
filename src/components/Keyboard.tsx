// A single keyboard limited to a fixed note range, with per-key highlight
// state. The diagram is literal: a lit key means "press exactly this key".
// Keys are styled divs (see piano.css); the hand marker is the only SVG.

import type { CSSProperties } from "react";
import { octaveOf, pitchClassOf, prettify } from "../music/notes.ts";
import type { Hand, KeyState, VoicedNote } from "../music/types.ts";
import { HandMarker } from "./HandMarker.tsx";

const WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_AFTER: Record<string, string> = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };
const WHITE_WIDTH: Record<KeyboardSize, number> = { xs: 12, sm: 26, md: 34, lg: 44 };

type KeyboardSize = "xs" | "sm" | "md" | "lg";
type StyleWithVars = CSSProperties & Record<`--${string}`, string>;

interface KeyboardProps {
  hand: Hand;
  /** Inclusive range, scientific pitch, e.g. "C2" to "E3". */
  startNote: string;
  endNote: string;
  nowNotes: VoicedNote[];
  nextNotes: VoicedNote[];
  size?: KeyboardSize;
  showFingering?: boolean;
  /** When set, every key is tappable and calls back with its note (e.g. "C#4"). */
  onPressNote?: (note: string) => void;
}

/** White keys spanning startNote..endNote inclusive. */
function whiteKeysInRange(startNote: string, endNote: string): string[] {
  const startLetter = pitchClassOf(startNote);
  const startOctave = octaveOf(startNote);
  const endLetter = pitchClassOf(endNote);
  const endOctave = octaveOf(endNote);
  const whites: string[] = [];
  let started = false;
  for (let o = startOctave; o <= endOctave; o++) {
    for (const w of WHITE_NOTES) {
      if (!started) {
        if (w === startLetter && o === startOctave) started = true;
        else continue;
      }
      whites.push(`${w}${o}`);
      if (w === endLetter && o === endOctave) return whites;
    }
  }
  return whites;
}

export function Keyboard({
  hand,
  startNote,
  endNote,
  nowNotes,
  nextNotes,
  size = "md",
  showFingering = true,
  onPressNote,
}: KeyboardProps) {
  const whites = whiteKeysInRange(startNote, endNote);

  // Black keys sit at the boundary after the white key they follow.
  const blacks = whites.flatMap((name, i) => {
    const black = BLACK_AFTER[pitchClassOf(name)];
    return black ? [{ name: `${black}${octaveOf(name)}`, offsetIndex: i + 1 }] : [];
  });

  const nowMap = new Map(nowNotes.map((n) => [n.note, n]));
  const nextMap = new Map(nextNotes.map((n) => [n.note, n]));
  const whiteW = WHITE_WIDTH[size];

  function keyState(name: string): { state: KeyState | null; data: VoicedNote | null } {
    const now = nowMap.get(name);
    if (now) return { state: "now", data: now };
    const next = nextMap.get(name);
    if (next) return { state: "next", data: next };
    return { state: null, data: null };
  }

  function label(name: string, finger: number, state: KeyState) {
    return (
      <>
        <span className="pck-marker">
          <HandMarker hand={hand} filled={state === "now"} />
        </span>
        <span className="pck-note t-mono">{prettify(pitchClassOf(name))}</span>
        {showFingering && <span className="pck-finger">{finger}</span>}
      </>
    );
  }

  return (
    <div className={`pck-keyboard pck-${size}`}>
      <div className="pck-whites">
        {whites.map((name) => {
          const { state, data } = keyState(name);
          const cls = ["pck-key", "pck-white"];
          if (state) cls.push(`is-${hand}`, `is-${state}`);
          if (onPressNote) cls.push("is-playable");
          return (
            <div
              key={name}
              className={cls.join(" ")}
              onPointerDown={onPressNote ? () => onPressNote(name) : undefined}
            >
              {state && data && label(name, data.finger, state)}
            </div>
          );
        })}
      </div>
      {blacks.map(({ name, offsetIndex }) => {
        const { state, data } = keyState(name);
        const cls = ["pck-key", "pck-black"];
        if (state) cls.push(`is-${hand}`, `is-${state}`);
        if (onPressNote) cls.push("is-playable");
        const style = { "--offset": `${offsetIndex * whiteW}px` } as StyleWithVars;
        return (
          <div
            key={name}
            className={cls.join(" ")}
            style={style}
            onPointerDown={onPressNote ? () => onPressNote(name) : undefined}
          >
            {state && data && label(name, data.finger, state)}
          </div>
        );
      })}
    </div>
  );
}
