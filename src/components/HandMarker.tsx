// The hand-identity glyph. Square = left, triangle = right. Filled for the
// current chord, outline-only for the next-chord preview. This shape cue is
// what keeps the two hands distinguishable without relying on colour.

import type { Hand } from "../music/types.ts";

interface HandMarkerProps {
  hand: Hand;
  filled: boolean;
}

export function HandMarker({ hand, filled }: HandMarkerProps) {
  if (hand === "left") {
    return (
      <svg viewBox="0 0 12 12">
        {filled ? (
          <rect x="2" y="2" width="8" height="8" fill="currentColor" />
        ) : (
          <rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        )}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12">
      {filled ? (
        <path d="M6 10 L2 3 L10 3 Z" fill="currentColor" />
      ) : (
        <path d="M6 9.5 L2.6 3.5 L9.4 3.5 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      )}
    </svg>
  );
}
