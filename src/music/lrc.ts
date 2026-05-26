// A small, hand-rolled LRC parser. LRCLIB's native API returns synced lyrics as
// a raw LRC string ("[mm:ss.xx]line"), and that is the fallback shape the
// timeline mapper feeds here when ChordMini does not pre-parse. Pure, no DOM,
// so it tests with the Node runner. No library: LRC is a few lines of regex.
//
// Handles: [mm:ss], [mm:ss.xx] (centiseconds), [mm:ss.xxx] (milliseconds),
// several timestamps on one line, the [offset:] tag, and skips metadata tags
// ([ar:], [ti:], [al:], [by:], [length:]) and blank/spacer lines.

import type { TimedLyricLine } from "./timeline.ts";

const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const OFFSET_TAG = /^\s*\[offset:\s*([+-]?\d+)\s*\]\s*$/i;

/** Parse fractional digits as a second fraction: "34" -> 0.34, "5" -> 0.5. */
function fractionToSeconds(frac: string): number {
  return parseInt(frac.padEnd(3, "0").slice(0, 3), 10) / 1000;
}

export function parseLrc(text: string): TimedLyricLine[] {
  const out: TimedLyricLine[] = [];
  let offsetSeconds = 0;

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const off = line.match(OFFSET_TAG);
    if (off) {
      // LRC convention: a positive offset shifts lyrics earlier.
      offsetSeconds = (parseInt(off[1], 10) || 0) / 1000;
      continue;
    }

    const stamps: number[] = [];
    TIME_TAG.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TIME_TAG.exec(line)) !== null) {
      const seconds = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + (m[3] ? fractionToSeconds(m[3]) : 0);
      stamps.push(seconds);
    }
    if (stamps.length === 0) continue; // metadata or untimed line

    const body = line.replace(TIME_TAG, "").trim();
    if (!body) continue; // a timed spacer line carries no lyric

    for (const s of stamps) out.push({ time: Math.max(0, s - offsetSeconds), text: body });
  }

  return out.sort((a, b) => a.time - b.time);
}
