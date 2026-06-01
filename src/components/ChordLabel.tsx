// The current chord dominates the screen. A position counter rides beside the
// name so you always know where you are in the loop; the inversion label sits
// beneath, clearly subordinate to the keys.

import { prettify } from "../music/notes.ts";
import type { VoicedStep } from "../music/types.ts";

export function ChordLabel({
  now,
  index,
  count,
  showInversion = true,
}: {
  now: VoicedStep;
  index: number;
  count: number;
  /** Beginner voicing is always a root-position triad, so the theory label is
   *  constant noise there - the brief says never lead with theory. Hide it. */
  showInversion?: boolean;
}) {
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
        {showInversion && <div className="inversion">{now.inversion ?? "Root position"}</div>}
      </div>
    </div>
  );
}
