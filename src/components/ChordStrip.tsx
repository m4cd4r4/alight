// The progression overview: every chord as a small left+right hand visual, so
// you can see the whole song at a glance. Two layouts share one cell:
//   strip - a single horizontal row under the main keyboards (scrolls sideways).
//   grid  - a 4-across grid that takes over the stage (scrolls down).
// Cells are buttons: tapping one jumps the playhead there. The active chord is
// highlighted and scrolled into view as playback moves; the first and last carry
// Start / End tags so the loop has a visible beginning and end.

import { useEffect, useRef } from "react";
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
}

export function ChordStrip({ steps, activeIndex, mode, onSelect, showLyrics, lyricFor, loop }: ChordStripProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Keep the current chord visible as it advances (sideways in strip, down in grid).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [activeIndex, mode]);

  const last = steps.length - 1;

  return (
    <div className={`chord-strip is-${mode}`} role="group" aria-label="All chords in this song">
      {steps.map((step, i) => {
        const isActive = i === activeIndex;
        const inLoop = !!loop && i >= loop.start && i <= loop.end;
        const lyric = showLyrics && lyricFor ? lyricFor(i) : undefined;
        const cls = ["mini-chord"];
        if (isActive) cls.push("is-active");
        if (inLoop) cls.push("in-loop");

        return (
          <button
            key={i}
            type="button"
            ref={isActive ? activeRef : undefined}
            className={cls.join(" ")}
            aria-current={isActive ? "true" : undefined}
            aria-label={`Chord ${i + 1} of ${steps.length}: ${step.name}`}
            onClick={() => onSelect(i)}
          >
            {showLyrics && <span className="mini-chord-lyric">{lyric ?? " "}</span>}
            <span className="mini-chord-head">
              {steps.length > 1 && i === 0 && <span className="chord-tag is-start">Start</span>}
              <span className="mini-chord-name">{prettify(step.name)}</span>
              {steps.length > 1 && i === last && <span className="chord-tag is-end">End</span>}
            </span>
            <span className="mini-chord-hands">
              <Keyboard hand="left" startNote="C2" endNote="E3" nowNotes={step.left} nextNotes={EMPTY} size="xs" showFingering={false} />
              <Keyboard hand="right" startNote="F3" endNote="B4" nowNotes={step.right} nextNotes={EMPTY} size="xs" showFingering={false} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
