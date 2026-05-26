import { useEffect, useState } from "react";
import { LoadView } from "./components/LoadView.tsx";
import { PlayView } from "./components/PlayView.tsx";
import type { Song } from "./music/types.ts";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    return localStorage.getItem("alight:theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

// Two views: pick a song (Load), then play it (Play). Theme lives here so the
// dark-mode toggle works on both views, stays put across the view switch, and
// persists across reloads.
export default function App() {
  const [song, setSong] = useState<Song | null>(null);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("alight:theme", theme);
    } catch {
      // private mode / storage disabled - theme still applies for the session
    }
  }, [theme]);

  const onToggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  if (song) {
    return <PlayView song={song} onBack={() => setSong(null)} theme={theme} onToggleTheme={onToggleTheme} />;
  }
  return <LoadView onLoad={setSong} theme={theme} onToggleTheme={onToggleTheme} />;
}
