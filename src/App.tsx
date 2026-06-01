import { useEffect, useState } from "react";
import { Gate } from "./components/Gate.tsx";
import { LoadView } from "./components/LoadView.tsx";
import { PlayView } from "./components/PlayView.tsx";
import { LIBRARY } from "./data/library.ts";
import { isUnlocked } from "./gate.ts";
import type { Timeline } from "./music/timeline.ts";
import type { Song } from "./music/types.ts";

type Theme = "light" | "dark";

const SEEN_DEMO_KEY = "alight:seen-demo";

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

// First-ever open should land on the keyboards, not a search page: preload the
// timed demo (Amazing Grace) so the very first thing seen is two lit keys with a
// working Play. Returning users (flag set) start on the Load view as before.
function initialLoaded(): Loaded | null {
  try {
    if (localStorage.getItem(SEEN_DEMO_KEY)) return null;
  } catch {
    return null;
  }
  const demo = LIBRARY.find((e) => e.id === "amazing-grace") ?? LIBRARY[0];
  return demo ? { song: demo.song, timeline: demo.timeline } : null;
}

// Two views: pick a song (Load), then play it (Play). Theme lives here so the
// dark-mode toggle works on both views, stays put across the view switch, and
// persists across reloads.
export default function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(initialLoaded);
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

  // Mark the demo as seen once it has actually been shown (unlocked + a song
  // loaded), so the preload is strictly a first-run thing.
  useEffect(() => {
    if (!unlocked || !loaded) return;
    try {
      localStorage.setItem(SEEN_DEMO_KEY, "1");
    } catch {
      // storage disabled - they just get the demo again next time; harmless
    }
  }, [unlocked, loaded]);

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
