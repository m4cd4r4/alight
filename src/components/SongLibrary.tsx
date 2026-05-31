// The built-in library picker on the Load view: a shelf of public-domain songs
// that always work, with no network or upstream dependency. Each row hands its
// song straight to Play via the same onLoad seam the rest of the view uses.

import { LIBRARY } from "../data/library.ts";
import type { Timeline } from "../music/timeline.ts";
import type { Song } from "../music/types.ts";

export function SongLibrary({ onLoad }: { onLoad: (song: Song, timeline?: Timeline | null) => void }) {
  return (
    <div className="song-library">
      <div className="t-label-caps song-library-label">Free songs to learn</div>
      <div className="song-library-list" role="list">
        {LIBRARY.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="pck-song-row"
            role="listitem"
            onClick={() => onLoad(entry.song, entry.timeline)}
          >
            <span className="title">{entry.song.title}</span>
            <span className="artist">{entry.song.artist}</span>
            <span className="key">{entry.key}</span>
          </button>
        ))}
      </div>
      <div className="song-library-note">All public domain - free to play and learn, no account needed.</div>
    </div>
  );
}
