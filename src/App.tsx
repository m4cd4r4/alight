import { useEffect, useState } from "react";
import { Gate } from "./components/Gate.tsx";
import { LoadView } from "./components/LoadView.tsx";
import { PlayView } from "./components/PlayView.tsx";
import { isUnlocked } from "./gate.ts";
import type { Timeline } from "./music/timeline.ts";
import type { Song } from "./music/types.ts";

type Theme = "light" | "dark";

/** A loaded song, optionally with a play-along timeline (analysis present). */
interface Loaded {
  song: Song;
  timeline: Timeline | null;
}

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
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [unlocked, setUnlocked] = useState(isUnlocked);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("alight:theme", theme);
    } catch {
      // private mode / storage disabled - theme still applies for the session
    }
  }, [theme]);

  const onToggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const onLoad = (song: Song, timeline: Timeline | null = null) => setLoaded({ song, timeline });

  if (!unlocked) {
    return <Gate onUnlock={() => setUnlocked(true)} theme={theme} onToggleTheme={onToggleTheme} />;
  }

  if (loaded) {
    return (
      <PlayView
        song={loaded.song}
        timeline={loaded.timeline}
        onBack={() => setLoaded(null)}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
    );
  }
  return <LoadView onLoad={onLoad} theme={theme} onToggleTheme={onToggleTheme} />;
}
