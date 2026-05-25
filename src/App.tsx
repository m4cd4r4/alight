import { PlayView } from "./components/PlayView.tsx";
import { sampleSong } from "./data/songs.ts";

export default function App() {
  return <PlayView song={sampleSong} />;
}
