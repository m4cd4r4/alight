// Load view. Type a title to fetch chords from Ultimate Guitar (via /api/chords),
// or paste a chord sheet. Both paths run the same parser and hand a Song to Play.
// The paste fallback is first-class, never an apology - it is the resilience path
// for when the fetch is blocked or the song is not found.

import { type FormEvent, useState } from "react";
import { parse } from "../music/parse.ts";
import type { Timeline } from "../music/timeline.ts";
import type { Song } from "../music/types.ts";
import { AnalyzeInput } from "./AnalyzeInput.tsx";
import { SongLibrary } from "./SongLibrary.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { YoutubeSearch } from "./YoutubeSearch.tsx";

type LoadHandler = (song: Song, timeline?: Timeline | null) => void;

interface VersionRef {
  id: number;
  song: string;
  artist: string;
  votes: number;
  rating: number;
  version: number;
  tonality: string | null;
  type: string;
}
interface ChordsResponse {
  artist: string;
  song: string;
  capo: number;
  tuning: string | null;
  tonality: string | null;
  content: string;
  versions: VersionRef[];
}
interface ApiError {
  error: string;
  code: string;
}

type FetchResult = { data: ChordsResponse } | { error: ApiError };

async function getChords(query: { title: string } | { id: number }): Promise<FetchResult> {
  const qs =
    "title" in query
      ? `title=${encodeURIComponent(query.title)}`
      : `id=${encodeURIComponent(String(query.id))}`;
  try {
    const res = await fetch(`/api/chords?${qs}`);
    const body: unknown = await res.json();
    if (!res.ok) return { error: body as ApiError };
    return { data: body as ChordsResponse };
  } catch {
    return {
      error: {
        error: "Could not reach the song service. Paste the chord sheet to keep playing.",
        code: "network",
      },
    };
  }
}

function songFromResponse(r: ChordsResponse): Song {
  return parse(r.content, { capo: r.capo, title: r.song, artist: r.artist });
}

function TopBar({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="wordmark" aria-label="Alight">
          <svg viewBox="0 0 28 36" aria-hidden="true" className="wordmark-mark">
            <g transform="translate(2,4)">
              <rect x="0" y="6" width="22" height="26" fill="none" stroke="currentColor" strokeWidth="1.25" />
              <rect x="6" y="6" width="10" height="16" fill="currentColor" />
              <rect x="3" y="0" width="5" height="5" fill="currentColor" />
              <path d="M19 0 L13 0 L16 5 Z" fill="currentColor" />
            </g>
          </svg>
          <span className="wordmark-name">Alight</span>
        </span>
      </div>
      <div className="topbar-right">
        {/* Songbook / Settings icons land with their Wave 3 features. */}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}

function FetchBanner({ message }: { message: string }) {
  return (
    <div className="fetch-banner" role="status">
      <span className="dot" />
      <span>{message}</span>
    </div>
  );
}

function MatchCard({ response, onPick }: { response: ChordsResponse; onPick: () => void }) {
  return (
    <button type="button" className="match-card" onClick={onPick}>
      <span>
        <span className="title">{response.song}</span>
        <span className="artist">{response.artist}</span>
      </span>
      {response.tonality ? <span className="key-tag">{response.tonality}</span> : null}
    </button>
  );
}

function Alternates({
  versions,
  onPick,
}: {
  versions: VersionRef[];
  onPick: (v: VersionRef) => void;
}) {
  if (versions.length === 0) return null;
  return (
    <>
      <div className="t-label-caps alts-label">Wrong version? Pick another</div>
      <div className="alts-list">
        {versions.map((v) => (
          <button type="button" key={v.id} className="alt-row" onClick={() => onPick(v)}>
            <span className="label-left">
              <span className="v-label">Version {v.version || "alt"}</span>
              <span className="v-detail">{v.votes.toLocaleString()} ratings</span>
            </span>
            {v.tonality ? <span className="key-tag">{v.tonality}</span> : null}
          </button>
        ))}
      </div>
    </>
  );
}

function PasteFallback({ onLoad }: { onLoad: LoadHandler }) {
  const sample =
    "[Verse]\nC          G/B        Am         F\nWords go on this line, chords sit above\nC          G/B        Am         F\nThe parser reads the chord line, skips the words\n\n[Chorus]\nC               G\nAm                F";
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function use() {
    const song = parse(text, { title: "Pasted song" });
    if (song.chords.length === 0) {
      setError("No chords found in that text. Chords sit on their own lines, e.g. C  G  Am  F.");
      return;
    }
    setError(null);
    onLoad(song);
  }

  return (
    <div className="paste-column">
      <div className="head">
        <h2>Paste a chord sheet</h2>
        <div className="sub">For when auto-fetch is down, or the song is not in the library.</div>
      </div>
      <textarea
        className="paste-area"
        placeholder={sample}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="paste-actions">
        <span className="paste-hint">Plain text. C  G  Am  F. Bracketed sections optional.</span>
        <button type="button" className="btn-primary" disabled={text.trim().length === 0} onClick={use}>
          Use these chords
        </button>
      </div>
      {error ? <div className="paste-error">{error}</div> : null}
    </div>
  );
}

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "ready"; response: ChordsResponse }
  | { status: "loading-version" }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function LoadView({
  onLoad,
  theme,
  onToggleTheme,
}: {
  onLoad: LoadHandler;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [parseNote, setParseNote] = useState<string | null>(null);

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    const title = query.trim();
    if (!title) return;
    setParseNote(null);
    setState({ status: "searching" });
    const result = await getChords({ title });
    if ("data" in result) {
      setState({ status: "ready", response: result.data });
    } else if (result.error.code === "not_found") {
      setState({ status: "not-found" });
    } else {
      setState({ status: "error", message: result.error.error });
    }
  }

  function loadResponse(r: ChordsResponse) {
    const song = songFromResponse(r);
    if (song.chords.length === 0) {
      setParseNote("That sheet had no readable chords. Try another version, or paste it on the right.");
      return;
    }
    onLoad(song);
  }

  async function loadVersion(v: VersionRef) {
    setParseNote(null);
    setState({ status: "loading-version" });
    const result = await getChords({ id: v.id });
    if ("data" in result) {
      const song = songFromResponse(result.data);
      if (song.chords.length === 0) {
        setState({ status: "ready", response: result.data });
        setParseNote("That version had no readable chords. Try another, or paste it on the right.");
        return;
      }
      onLoad(song);
    } else {
      setState({ status: "error", message: result.error.error });
    }
  }

  return (
    <div className="load-page">
      <TopBar theme={theme} onToggleTheme={onToggleTheme} />
      <main className="load-stage">
        <div>
          <div className="heading">
            <h1>Find a song</h1>
            <div className="sub">Pick a free song to learn, search any title, or paste a chord sheet on the right.</div>
          </div>

          <SongLibrary onLoad={onLoad} />

          {state.status === "error" ? <FetchBanner message={state.message} /> : null}

          <form className="search-field" onSubmit={runSearch}>
            <button type="submit" className="search-icon" aria-label="Search">
              <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.25" /><line x1="14.6" y1="14.6" x2="19" y2="19" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
            </button>
            <input
              autoFocus
              placeholder="Type a song title"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Song title"
            />
          </form>

          {state.status === "searching" ? (
            <div className="load-status"><span className="spinner" />Searching Ultimate Guitar</div>
          ) : null}

          {state.status === "loading-version" ? (
            <div className="load-status"><span className="spinner" />Loading that version</div>
          ) : null}

          {state.status === "ready" ? (
            <>
              <div className="t-label-caps best-match-label">Best match</div>
              <MatchCard response={state.response} onPick={() => loadResponse(state.response)} />
              {parseNote ? <div className="paste-error">{parseNote}</div> : null}
              <Alternates versions={state.response.versions} onPick={loadVersion} />
            </>
          ) : null}

          {state.status === "not-found" ? (
            <>
              <div className="t-label-caps best-match-label">No match</div>
              <div className="match-card is-soft">
                <span>
                  <span className="title" style={{ fontSize: 18 }}>No chord sheet found.</span>
                  <span className="artist">Try a different title, or paste the chords on the right.</span>
                </span>
              </div>
            </>
          ) : null}

          <div className="load-divider" />
          <YoutubeSearch onLoad={onLoad} />
          <AnalyzeInput onLoad={onLoad} />
        </div>

        <PasteFallback onLoad={onLoad} />
      </main>
    </div>
  );
}
