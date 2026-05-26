// Karaoke-style lyric guide. Line-level (not per-word): the active line is
// emphasised, past lines recede, upcoming lines wait faintly. The reel slides
// so the active line holds the centre. Shown only when the timeline carries
// lyrics; never relied on for "what to play" - that is the keyboards' job.

import type { TimedLyricLine } from "../music/timeline.ts";

type ReelStyle = React.CSSProperties & Record<"--active", number>;

export function LyricsPanel({ lines, activeIndex }: { lines: TimedLyricLine[]; activeIndex: number }) {
  if (lines.length === 0) return null;
  const reelStyle: ReelStyle = { "--active": Math.max(0, activeIndex) };

  return (
    <div className="lyrics-panel" role="region" aria-label="Lyrics">
      <div className="lyrics-reel" style={reelStyle}>
        {lines.map((line, i) => {
          const cls =
            i === activeIndex ? "lyric-line is-active" : i < activeIndex ? "lyric-line is-past" : "lyric-line";
          return (
            <p key={`${i}-${line.time}`} className={cls} aria-current={i === activeIndex ? "true" : undefined}>
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
