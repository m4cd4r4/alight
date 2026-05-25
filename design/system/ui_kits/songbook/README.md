# Songbook

The saved-songs library. A quiet grid-table with title / artist / key / last-played, grouped by section ("Recently played", "All saved").

## Files

- `index.html` — entry point.
- `songbook.css` — layout. CSS grid table using `display: contents` on rows so cells line up across sections.
- `SongbookApp.jsx` — root. State: filter query. Components: `TopBar`, `SongRow`.

## Patterns

- The heading row uses a strong hairline separator below it. The filter bar sits below that.
- Section labels ("RECENTLY PLAYED", "ALL SAVED") use the small-caps label style; they break the rhythm of the list without introducing weight.
- Row hover reveals two trailing icon buttons (Print, More). They are invisible until hover so the resting list stays calm.
- Import / Export are secondary-style buttons. Add a song is the primary action.
