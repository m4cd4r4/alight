// SongbookApp.jsx — saved-songs library. List, search, export/import.

const { useState, useMemo } = React;

const SONGBOOK_DATA = [
  { id: 1, title: "Landslide",                 artist: "Fleetwood Mac",     key: "C",   last: "today",     section: "Recently played" },
  { id: 2, title: "Let It Be",                 artist: "The Beatles",       key: "C",   last: "yesterday", section: "Recently played" },
  { id: 3, title: "Bridge Over Troubled Water",artist: "Simon & Garfunkel", key: "E♭",  last: "3 days ago",section: "Recently played" },
  { id: 4, title: "The Weight",                artist: "The Band",          key: "A",   last: "1 week ago",section: "All saved" },
  { id: 5, title: "Hallelujah",                artist: "Leonard Cohen",     key: "C",   last: "2 weeks",   section: "All saved" },
  { id: 6, title: "Don't Think Twice, It's All Right", artist: "Bob Dylan", key: "G",   last: "1 month",   section: "All saved" },
  { id: 7, title: "Both Sides Now",            artist: "Joni Mitchell",     key: "F",   last: "1 month",   section: "All saved" },
  { id: 8, title: "A Case of You",             artist: "Joni Mitchell",     key: "A",   last: "2 months",  section: "All saved" },
  { id: 9, title: "Northern Sky",              artist: "Nick Drake",        key: "B♭",  last: "3 months",  section: "All saved" },
  { id: 10, title: "Pink Moon",                artist: "Nick Drake",        key: "C",   last: "3 months",  section: "All saved" },
];

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
        <a className="icon-btn" href="../load/index.html" title="Load a song" aria-label="Load a song">
          <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.25"/><line x1="14.6" y1="14.6" x2="19" y2="19" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
        </a>
        <a className="icon-btn" href="../play/index.html" title="Settings" aria-label="Settings">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.25"/><path d="M12 4.5 V6.5 M12 17.5 V19.5 M4.5 12 H6.5 M17.5 12 H19.5 M6.7 6.7 L8.1 8.1 M15.9 15.9 L17.3 17.3 M6.7 17.3 L8.1 15.9 M15.9 8.1 L17.3 6.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
        </a>
      </div>
    </header>
  );
}

function SongRow({ song, onPlay }) {
  return (
    <div className="songs-row" onClick={onPlay} role="button" tabIndex="0">
      <div className="cell title">{song.title}</div>
      <div className="cell artist">{song.artist}</div>
      <div className="cell key">{song.key}</div>
      <div className="cell last">{song.last}</div>
      <div className="cell actions">
        <button className="icon-btn" title="Print" onClick={e => { e.stopPropagation(); window.open("../print/index.html", "_blank"); }}>
          <svg viewBox="0 0 24 24"><rect x="7" y="4" width="10" height="5" fill="none" stroke="currentColor" strokeWidth="1.25"/><path d="M5 9 H19 V16 H17 V20 H7 V16 H5 Z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/><line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.25"/></svg>
        </button>
        <button className="icon-btn" title="More" onClick={e => e.stopPropagation()}>
          <svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
  );
}

function SongbookApp() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SONGBOOK_DATA;
    return SONGBOOK_DATA.filter(s =>
      s.title.toLowerCase().includes(needle) ||
      s.artist.toLowerCase().includes(needle)
    );
  }, [q]);

  // Group by section, preserving order.
  const sections = [];
  const seen = {};
  for (const s of filtered) {
    if (!seen[s.section]) { seen[s.section] = []; sections.push([s.section, seen[s.section]]); }
    seen[s.section].push(s);
  }

  return (
    <div className="songbook-page">
      <TopBar />
      <main className="songbook-stage">
        <div className="songbook-head">
          <div>
            <h1>Songbook</h1>
            <div className="meta">{SONGBOOK_DATA.length} songs saved</div>
          </div>
          <div className="songbook-head-actions">
            <button className="btn-secondary">Import</button>
            <button className="btn-secondary">Export</button>
            <a className="btn-primary" href="../load/index.html" style={{textDecoration:"none", display:"inline-block"}}>Add a song</a>
          </div>
        </div>

        <div className="songbook-toolbar">
          <div className="search-field-inline">
            <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.25"/><line x1="14.6" y1="14.6" x2="19" y2="19" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
            <input placeholder="Filter saved songs" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="songbook-empty">
            <div className="head">No match.</div>
            <div className="sub">Try a different title, or load a new song.</div>
          </div>
        ) : (
          <div className="songs-table">
            <div className="songs-th">Title</div>
            <div className="songs-th">Artist</div>
            <div className="songs-th">Key</div>
            <div className="songs-th">Played</div>
            <div className="songs-th"></div>
            {sections.map(([name, songs]) => (
              <React.Fragment key={name}>
                <div className="songs-section-label">{name}</div>
                {songs.map(s => <SongRow key={s.id} song={s} onPlay={() => window.location.href = "../play/index.html"} />)}
              </React.Fragment>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

window.SongbookApp = SongbookApp;
