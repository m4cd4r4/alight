// In-app YouTube search: find a video, preview it inline, and pull its chords
// without leaving Alight. Search hits the gated /api/youtube-search proxy
// (YouTube Data API search.list); the preview is the sanctioned IFrame embed;
// "Get chords" runs the shared analyze flow on the chosen video's URL.

import { type FormEvent, useState } from "react";
import { storedGate } from "../gate.ts";
import type { Timeline } from "../music/timeline.ts";
import type { Song } from "../music/types.ts";
import { analyzeYoutube } from "../youtube/analyze.ts";

interface SearchResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

type LoadHandler = (song: Song, timeline?: Timeline | null) => void;

export function YoutubeSearch({ onLoad }: { onLoad: LoadHandler }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setError(null);
    setSelected(null);
    setSearching(true);
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`, {
        headers: { "x-alight-gate": storedGate() },
      });
      const body = (await res.json().catch(() => null)) as { results?: SearchResult[]; error?: string } | null;
      if (!res.ok) {
        setError(body?.error || "Search failed.");
        setResults([]);
        return;
      }
      setResults(body?.results ?? []);
    } catch {
      setError("Could not reach YouTube search.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function getChords(r: SearchResult) {
    if (analysing) return;
    setError(null);
    setAnalysing(true);
    const res = await analyzeYoutube(`https://www.youtube.com/watch?v=${r.id}`);
    setAnalysing(false);
    if (res.ok) onLoad(res.song, res.timeline);
    else setError(res.error);
  }

  return (
    <div className="yt-search">
      <div className="t-label-caps">Search YouTube</div>
      <form className="analyze-field" onSubmit={runSearch}>
        <input
          type="search"
          placeholder="Search YouTube for a song"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={searching}
          aria-label="Search YouTube"
        />
        <button type="submit" className="btn-primary" disabled={searching || query.trim().length === 0}>
          {searching ? "Searching" : "Search"}
        </button>
      </form>

      {selected ? (
        <div className="yt-preview">
          <div className="yt-embed">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${selected.id}`}
              title={selected.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="yt-preview-title">{selected.title}</div>
          <div className="yt-preview-actions">
            <button type="button" className="btn-primary" disabled={analysing} onClick={() => getChords(selected)}>
              {analysing ? "Analysing - a minute or two" : "Get chords"}
            </button>
            <button type="button" className="link-btn" onClick={() => setSelected(null)} disabled={analysing}>
              Back to results
            </button>
          </div>
        </div>
      ) : results ? (
        results.length === 0 ? (
          <div className="analyze-sub">No videos found. Try another search.</div>
        ) : (
          <ul className="yt-results">
            {results.map((r) => (
              <li key={r.id}>
                <button type="button" className="yt-result" onClick={() => { setSelected(r); setError(null); }}>
                  {r.thumbnail ? <img src={r.thumbnail} alt="" loading="lazy" /> : <span className="yt-thumb-fallback" />}
                  <span className="yt-result-text">
                    <span className="yt-result-title">{r.title}</span>
                    <span className="yt-result-channel">{r.channel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="analyze-sub">Find a video and get its chords without leaving the app.</div>
      )}

      {error ? <div className="paste-error">{error}</div> : null}
    </div>
  );
}
