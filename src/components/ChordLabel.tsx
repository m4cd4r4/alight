// The current chord dominates the screen. A position counter rides beside the
// name so you always know where you are in the loop; the inversion label sits
// beneath, clearly subordinate to the keys.

import { prettify } from "../music/notes.ts";
import type { VoicedStep } from "../music/types.ts";

export function ChordLabel({ now, index, count }: { now: VoicedStep; index: number; count: number }) {
  return (
    <div className="chord-label">
      <div className="pck-chord-now">
        <div className="name-row">
          <div className="name">{prettify(now.name)}</div>
          {count > 0 && (
            <div className="chord-position t-mono" aria-label={`Chord ${index + 1} of ${count}`}>
              {index + 1} / {count}
            </div>
          )}
        </div>
        <div className="inversion">{now.inversion ?? "Root position"}</div>
      </div>
    </div>
  );
}
