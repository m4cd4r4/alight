# Deferred work and out-of-scope seams

Captured while building the scaffold + Play view (`feat/scaffold-play-view`).
These are intentionally NOT built here; each is a later worktree. Listed so the
next session does not have to rediscover the boundary.

## Out of scope (explicit in the brief)

- **Ultimate Guitar fetch proxy** - the ~40-line Vercel serverless function and
  all network fetching. The Play view runs entirely on static sample data.
- **Paste-a-chord-sheet parser** - the `[ch]`/`[tab]` parser that serves both
  auto-fetch and paste. Seam: a parser would produce `Song.chords: string[]`,
  which `voiceSong()` already consumes.
- **Saved songbook** - library, export/import to file, offline persistence.
- **Printable one-page sheet** - per-song PDF + single-chord PNG export.
- **Audio (smplr)** - sampled piano playback, plus the metronome and tap-tempo.
- **Other views** - Load, Songbook, Settings, Print. The top-bar songbook /
  print / settings icons are rendered as inert navigation placeholders for
  visual fidelity; only the theme toggle is wired. Wire them when those views land.

## Controls deferred from the footer

The kit footer also had Layout (sectioned/flat), Tempo (+tap, metronome), and
Transpose. They are out of scope here (tempo/metronome need audio; transpose
needs the engine to re-pitch; layout needs sectioned song data). Only the
in-scope Voicing (Simple/Full) and Fingering toggles are built.

- **Transport Play/auto-advance button** - dropped. The in-scope transport is
  Back/Next + spacebar/arrows only. Auto-advance is tied to tempo + audio.
- **Left-hand single/octave toggle** - a separate locked decision, not in scope.
  `voiceLeft` currently always plays the single bass note (finger 5). Seam:
  the left-hand voicing is isolated in `voicing.ts` and can grow an octave option.

## Engine follow-ups (from DESIGN.md / BRIEF.md)

- **Octave-register finalisation** - the windows are provisional: LH `C2-E3`,
  RH `F3-B4`. The greedy voicer is currently constrained to stay inside the RH
  window. The brief's "overflow guard that expands a keyboard one octave only if
  a voicing exceeds the window" is NOT implemented; finalise once the engine is
  exercised on more songs.
- **Enharmonic spelling** - notes are displayed sharps-only (the engine routes
  every voiced note through MIDI then back via `Note.fromMidiSharps`). Per-key
  sharps-vs-flats spelling is a low-stakes build decision left for later. The
  sample (Landslide) has no accidentals so this is not yet visible.
- **Self-host fonts** - Spectral + Atkinson Hyperlegible load from the Google CDN
  via `@import` in `colors_and_type.css`. Self-host WOFF2 for production.
- **Multiple songs** - only the Landslide sample exists. `data/songs.ts` is
  shaped to hold more; song selection arrives with the Load/Songbook views.

## Implementation note (not a TODO)

The keyboard is built from styled `<div>`s driven by `piano.css` (ported
unchanged), not hand-rolled `<svg>`. BRIEF.md's architecture line says "SVG",
but the kit's `Keyboard.jsx` + `piano.css` + the reference screenshots are all
div-based, and the brief's tie-breaker is "if the brief contradicts the files,
the files win". The hand markers are the only SVG in the keyboard.
