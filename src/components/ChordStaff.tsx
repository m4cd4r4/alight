// A grand staff showing the exact notes of the current chord: right hand on the
// treble clef, left hand on the bass clef, coloured to match the two keyboards.
// All vertical positions come from the unit-tested geometry in music/staff.ts;
// this file only draws. Hollow (whole-note) noteheads keep it valid notation
// without stems.

import { pitchClassOf, prettify } from "../music/notes.ts";
import {
  BASS_BOTTOM_Y,
  BASS_TOP_Y,
  isSharp,
  ledgerYs,
  LINE_GAP,
  noteY,
  TREBLE_TOP_Y,
  type Clef,
} from "../music/staff.ts";
import type { VoicedNote } from "../music/types.ts";

const STAFF_X0 = 8;
const STAFF_X1 = 200;
const MARK_X = 16;
const NOTE_X = 138;
const VB_W = 208;
const VB_H = 146;

const TREBLE_MID_Y = TREBLE_TOP_Y + 2 * LINE_GAP;
const BASS_MID_Y = BASS_TOP_Y + 2 * LINE_GAP;

const NOTE_RX = 6;
const NOTE_RY = 4.2;
const LEDGER_HALF = 9;

function staffLines(topY: number): number[] {
  return [0, 1, 2, 3, 4].map((i) => topY + i * LINE_GAP);
}

function Notehead({ note, clef, hand, held = false }: { note: string; clef: Clef; hand: "left" | "right"; held?: boolean }) {
  const y = noteY(note, clef);
  return (
    <g className={`sn-note sn-${hand}${held ? " sn-held" : ""}`}>
      {ledgerYs(y, clef).map((ly) => (
        <line key={ly} className="sn-ledger" x1={NOTE_X - LEDGER_HALF} x2={NOTE_X + LEDGER_HALF} y1={ly} y2={ly} />
      ))}
      {isSharp(note) ? (
        <text className="sn-acc" x={NOTE_X - 13} y={y + 5}>
          {prettify("#")}
        </text>
      ) : null}
      <ellipse
        className="sn-head"
        cx={NOTE_X}
        cy={y}
        rx={NOTE_RX}
        ry={NOTE_RY}
        transform={`rotate(-18 ${NOTE_X} ${y})`}
      />
    </g>
  );
}

export function ChordStaff({
  left,
  right,
  chordName,
  heldLeft = [],
  heldRight = [],
}: {
  left: VoicedNote[];
  right: VoicedNote[];
  chordName: string;
  /** Sustained notes (figure songs) drawn dim behind the struck ones. */
  heldLeft?: VoicedNote[];
  heldRight?: VoicedNote[];
}) {
  const noteList = (ns: VoicedNote[]) => ns.map((n) => prettify(pitchClassOf(n.note))).join(", ");
  const label = right.length || left.length
    ? `${chordName} on the grand staff. Right hand ${noteList(right) || "none"}. Left hand ${noteList(left) || "none"}.`
    : `${chordName}: no staff notes`;

  return (
    <div className="chord-staff">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        {/* Brace + the bar lines that join the two staves into one system. */}
        <line className="sn-brace" x1={4} x2={4} y1={TREBLE_TOP_Y} y2={BASS_BOTTOM_Y} />
        <line className="sn-bar" x1={STAFF_X0} x2={STAFF_X0} y1={TREBLE_TOP_Y} y2={BASS_BOTTOM_Y} />
        <line className="sn-bar" x1={STAFF_X1} x2={STAFF_X1} y1={TREBLE_TOP_Y} y2={BASS_BOTTOM_Y} />

        {staffLines(TREBLE_TOP_Y).map((y) => (
          <line key={`t${y}`} className="sn-line" x1={STAFF_X0} x2={STAFF_X1} y1={y} y2={y} />
        ))}
        {staffLines(BASS_TOP_Y).map((y) => (
          <line key={`b${y}`} className="sn-line" x1={STAFF_X0} x2={STAFF_X1} y1={y} y2={y} />
        ))}

        {/* Hand markers stand in for clefs and tie each staff to its keyboard:
            triangle = right hand (treble), square = left hand (bass). Drawn
            shapes render everywhere; music-glyph fonts can't be relied on. */}
        <path
          className="sn-mark-right"
          d={`M${MARK_X - 5} ${TREBLE_MID_Y + 4} L${MARK_X + 5} ${TREBLE_MID_Y + 4} L${MARK_X} ${TREBLE_MID_Y - 5} Z`}
          aria-hidden="true"
        />
        <rect
          className="sn-mark-left"
          x={MARK_X - 4.5}
          y={BASS_MID_Y - 4.5}
          width={9}
          height={9}
          aria-hidden="true"
        />

        {heldRight.map((n) => (
          <Notehead key={`hr${n.note}`} note={n.note} clef="treble" hand="right" held />
        ))}
        {heldLeft.map((n) => (
          <Notehead key={`hl${n.note}`} note={n.note} clef="bass" hand="left" held />
        ))}
        {right.map((n) => (
          <Notehead key={`r${n.note}`} note={n.note} clef="treble" hand="right" />
        ))}
        {left.map((n) => (
          <Notehead key={`l${n.note}`} note={n.note} clef="bass" hand="left" />
        ))}
      </svg>
    </div>
  );
}
