# Load a song

Find a song by title. The paste-a-chord-sheet fallback is first-class, never an apology — it sits in its own column, separated by a hairline, equal in weight to the search column.

## Files

- `index.html` — entry point.
- `load.css` — layout. Two-column grid that collapses to one column below 980px.
- `songs.js` — demo catalogue used to filter typed queries.
- `LoadApp.jsx` — root. State: query string. Components: `TopBar`, `SearchField`, `MatchCard`, `Alternates`, `PasteFallback`, `FetchBanner`.

## States

- **Empty** — heading + search field + paste column. No results.
- **Best match** — one prominent card with a hard `--ink-primary` border, then a list of alternate keys below it.
- **No match** — a soft card with "No song titled X. Try a different title, or paste the chords on the right."
- **Auto-fetch down** — a quiet banner above the search field with a small grey dot and the line "Auto-fetch is down. Paste the chords to keep playing." Toggle by setting `fetchDown = true` in `LoadApp`.

## Voice

Every string on this surface follows the brand voice. The paste fallback's heading is "Paste a chord sheet" — not "Can't find it?" or "Manual entry". The empty-result state suggests pasting; it does not apologise.
