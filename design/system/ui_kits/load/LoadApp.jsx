// LoadApp.jsx — find a song by title, or paste a chord sheet.
const { useState, useMemo } = React;

function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <a className="wordmark" href="../play/index.html" aria-label="Alight">
          <svg viewBox="0 0 28 36" aria-hidden="true" className="wordmark-mark">
            <g transform="translate(2,4)">
              <rect x="0" y="6" width="22" height="26" fill="none" stroke="currentColor" strokeWidth="1.25"/>
              <rect x="6" y="6" width="10" height="16" fill="currentColor"/>
              <rect x="3" y="0" width="5" height="5" fill="currentColor"/>
              <path d="M19 0 L13 0 L16 5 Z" fill="currentColor"/>
            </g>
          </svg>
          <span className="wordmark-name">Alight</span>
        </a>
      </div>
      <div className="topbar-right">
        <a className="icon-btn" href="../songbook/index.html" title="Songbook" aria-label="Songbook">
          <svg viewBox="0 0 24 24"><line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="1.25"/><line x1="9" y1="5" x2="9" y2="19" stroke="currentColor" strokeWidth="1.25"/><path d="M12 5.5 L15.5 4.7 L18.2 18.4 L14.7 19.2 Z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/></svg>
        </a>
        <a className="icon-btn" href="../play/index.html" title="Settings" aria-label="Settings">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.25"/><path d="M12 4.5 V6.5 M12 17.5 V19.5 M4.5 12 H6.5 M17.5 12 H19.5 M6.7 6.7 L8.1 8.1 M15.9 15.9 L17.3 17.3 M6.7 17.3 L8.1 15.9 M15.9 8.1 L17.3 6.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
        </a>
      </div>
    </header>
  );
}

function SearchField({ value, onChange }) {
  return (
    <div className="search-field">
      <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.25"/><line x1="14.6" y1="14.6" x2="19" y2="19" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
      <input
        autoFocus
        placeholder="Type a song title"
        value={value}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function MatchCard({ song, onPick }) {
  return (
    <div className="match-card" onClick={onPick} role="button" tabIndex="0">
      <div>
        <div className="title">{song.title}</div>
        <div className="artist">{song.artist}</div>
      </div>
      <div className="key-tag">{song.key}</div>
    </div>
  );
}

function Alternates({ song, onPick }) {
  if (!song.alts || !song.alts.length) return null;
  const labels = ["Lower for voice", "Higher, popular cover", "Capo equivalent", "Guitar key"];
  return (
    <>
      <div className="t-label-caps alts-label">Wrong version? Pick another key</div>
      <div className="alts-list">
        {song.alts.map((k, i) => (
          <div key={i} className="alt-row" onClick={() => onPick(k)} role="button" tabIndex="0">
            <span className="v-label">{labels[i] || "Alternate"}</span>
            <span className="key-tag">{k}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function PasteFallback() {
  const sample = `[Verse]\nC          G/B        Am         F\nWell I took my love, I took it down\nC          G/B        Am         F\nClimbed a mountain and I turned around\n\n[Chorus]\nC               G\nAnd if you see my reflection\nAm                F\nIn the snow covered hills`;
  const [text, setText] = useState("");
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
        onChange={e => setText(e.target.value)} />
      <div className="paste-actions">
        <span className="paste-hint">Plain text. C  G  Am  F. Bracketed sections optional.</span>
        <button className="btn-primary" disabled={text.trim().length === 0}>Use these chords</button>
      </div>
    </div>
  );
}

function FetchBanner() {
  return (
    <div className="fetch-banner" role="status">
      <span className="dot"></span>
      <span>Auto-fetch is down. Paste the chords to keep playing.</span>
    </div>
  );
}

function LoadApp() {
  const [query, setQuery] = useState("Lan");
  const [fetchDown] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return window.PCH_SONGS.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q)
    );
  }, [query]);
  const best = results[0] || null;

  function onPickBest() { window.location.href = "../play/index.html"; }
  function onPickAlt() { window.location.href = "../play/index.html"; }

  return (
    <div className="load-page">
      <TopBar />
      <main className="load-stage">
        <div>
          <div className="heading">
            <h1>Find a song</h1>
            <div className="sub">Type a title. Or paste a chord sheet on the right.</div>
          </div>
          {fetchDown && <FetchBanner />}
          <SearchField value={query} onChange={setQuery} />

          {best ? (
            <>
              <div className="t-label-caps best-match-label">Best match</div>
              <MatchCard song={best} onPick={onPickBest} />
              <Alternates song={best} onPick={onPickAlt} />
            </>
          ) : query.trim() ? (
            <>
              <div className="t-label-caps best-match-label">No match</div>
              <div className="match-card" style={{borderColor: "var(--hairline-strong)"}}>
                <div>
                  <div className="title" style={{fontSize: 18}}>No song titled "{query}".</div>
                  <div className="artist">Try a different title, or paste the chords on the right.</div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <PasteFallback />
      </main>
    </div>
  );
}

window.LoadApp = LoadApp;
