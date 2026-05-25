// The current chord dominates the screen. Inversion label sits beneath,
// clearly subordinate to the keys.

import { prettify } from "../music/notes.ts";
import type { VoicedStep } from "../music/types.ts";

export function ChordLabel({ now }: { now: VoicedStep }) {
  return (
    <div className="chord-label">
      <div className="pck-chord-now">
        <div className="name">{prettify(now.name)}</div>
        <div className="inversion">{now.inversion ?? "Root position"}</div>
      </div>
    </div>
  );
}
