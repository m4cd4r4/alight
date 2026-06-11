// The progression overview: every chord as a small left+right hand visual, so
// you can see the whole song at a glance. Two layouts share one cell:
//   strip - a single horizontal row under the main keyboards (scrolls sideways).
//   grid  - a 4-across grid that takes over the stage (scrolls down).
// Cells are buttons: tapping one jumps the playhead there. The active chord is
// highlighted and scrolled into view as playback moves; the first and last carry
// Start / End tags so the loop has a visible beginning and end.
//
// Figure songs (an arpeggio played one note at a time) would otherwise produce a
// card per note - 24 near-identical "C#m" cells. So their cards are grouped: a
// run of strikes sharing a harmony collapses into one chord card (see stripCards).

import { useEffect, useMemo, useRef } from "react";
import { stripCards } from "../music/figure.ts";
import { prettify } from "../music/notes.ts";
import type { VoicedNote, VoicedStep } from "../music/types.ts";
import { Keyboard } from "./Keyboard.tsx";

const EMPTY: VoicedNote[] = [];

interface ChordStripProps {
  steps: VoicedStep[];
  activeIndex: number;
  mode: "strip" | "grid";
  onSelect: (index: number) => void;
  showLyrics: boolean;
  lyricFor?: (index: number) => string | undefined;
  loop?: { start: number; end: number } | null;
  /** Figure songs collapse a run of same-harmony strikes into one chord card. */
  grouped?: boolean;
}

export function ChordStrip({ steps, activeIndex, mode, onSelect, showLyrics, lyricFor, loop, grouped }: ChordStripProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // One card per chord (chord songs) or per harmony run (figure songs).
  const cards = useMemo(() => stripCards(steps, !!grouped), [steps, grouped]);
  const activeCard = cards.findIndex((c) => activeIndex >= c.startIndex && activeIndex <= c.endIndex);

  // Keep the current chord visible as it advances (sideways in strip, down in grid).
  // scrollIntoView's smooth behaviour is imperative, so the CSS reduced-motion
  // override can't touch it - honour the preference here.
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [activeCard, mode]);

  const last = cards.length - 1;

  return (
    <div className={`chord-strip is-${mode}`} role="group" aria-label="All chords in this song">
      {cards.map((card, i) => {
        const isActive = i === activeCard;
        const inLoop = !!loop && card.startIndex <= loop.end && card.endIndex >= loop.start;
        const lyric = showLyrics && lyricFor ? lyricFor(card.startIndex) : undefined;
        const cls = ["mini-chord"];
        if (isActive) cls.push("is-active");
        if (inLoop) cls.push("in-loop");

        return (
          <button
            key={card.startIndex}
            type="button"
            ref={isActive ? activeRef : undefined}
            className={cls.join(" ")}
            aria-current={isActive ? "true" : undefined}
            aria-label={`Chord ${i + 1} of ${cards.length}: ${card.name}`}
            onClick={() => onSelect(card.startIndex)}
          >
            {showLyrics && <span className="mini-chord-lyric">{lyric ?? " "}</span>}
            <span className="mini-chord-head">
              {cards.length > 1 && i === 0 && <span className="chord-tag is-start">Start</span>}
              <span className="mini-chord-name">{prettify(card.name)}</span>
              {cards.length > 1 && i === last && <span className="chord-tag is-end">End</span>}
            </span>
            <span className="mini-chord-hands">
              <Keyboard hand="left" startNote="C2" endNote="E3" nowNotes={card.left} nextNotes={EMPTY} size="xs" showFingering={false} />
              <Keyboard hand="right" startNote="F3" endNote="B4" nowNotes={card.right} nextNotes={EMPTY} size="xs" showFingering={false} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
