import { useState } from "react";
import { LoadView } from "./components/LoadView.tsx";
import { PlayView } from "./components/PlayView.tsx";
import type { Song } from "./music/types.ts";

// Two views: pick a song (Load), then play it (Play). Returning from Play
// clears the song and drops back to Load to choose another.
export default function App() {
  const [song, setSong] = useState<Song | null>(null);

  if (song) return <PlayView song={song} onBack={() => setSong(null)} />;
  return <LoadView onLoad={setSong} />;
}
