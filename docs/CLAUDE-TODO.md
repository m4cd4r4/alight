# Deferred work and out-of-scope seams

Captured while building the scaffold + Play view (`feat/scaffold-play-view`).
These are intentionally NOT built here; each is a later worktree. Listed so the
next session does not have to rediscover the boundary.

## Built in Wave 2 (feat/song-fetch)

The two items below are no longer out of scope - they shipped in Wave 2:

- **Ultimate Guitar fetch proxy** - `api/chords.ts`. `GET ?title=` searches UG,
  picks the best chord version by rating x votes, returns clean JSON
  (`artist, song, capo, tuning, tonality, content, versions[]`); `GET ?id=`
  loads a specific alternate by tab id. 8s timeouts, guarded JSON.parse,
  structured errors, never reflects raw upstream, transient upstream failures
  degrade to a "paste the chord sheet" message.

  IMPORTANT - data source: the brief assumed scraping `div.js-store[data-content]`
  off the UG website (the freetar mechanism). That is DEAD - UG rewrote the site
  into a React SPA that embeds no chord data in HTML, and the website is behind
  Cloudflare which blocks datacenter IPs. Instead the function calls UG's signed
  mobile API at `api.ultimate-guitar.com` (NOT Cloudflare-fronted, reachable from
  Vercel directly - no VPS/proxy needed). Auth: `X-UG-API-KEY = md5(deviceId +
  utcDate("YYYY-MM-DD:HH") + "createLog()")` with a `UGT_ANDROID/...` user agent;
  `X-UG-CLIENT-ID = deviceId`. Endpoints: `/api/v1/tab/search?title=` and
  `/api/v1/tab/info?tab_id=`. This signing is reverse-engineered (ref:
  github.com/Pilfer/ultimate-guitar-scraper); UG can rotate the salt/date format,
  which breaks auto-fetch until the `ugHeaders()` signing is updated. Paste is the
  permanent fallback. There is no SSRF surface: one hardcoded host, numeric id or
  encoded title only - no user-supplied URL.

  Operational realities found while testing the live site (all handled in code):
  - SIGNING CLOCK SKEW: the key embeds the UTC hour, but UG's server clock runs
    ~1h behind, so a fixed-UTC-hour key gets 498 "token invalid" at the day/hour
    boundary (took all auto-fetch down at 00:xx UTC). `apiGet` now retries adjacent
    hours (`HOUR_OFFSETS = [0, -1, 1]`) on a 498. A cleaner future fix is to sync to
    UG's server-time endpoint instead of guessing.
  - REGION / LEGAL BLOCKS: UG returns HTTP 451 (Unavailable For Legal Reasons) for
    some big-label content (e.g. Beyoncé "Halo") to US IPs. Vercel functions default
    to a US region (iad1), so those songs 451'd in production while working from AU.
    Fixed by pinning the function to Sydney in `vercel.json` (`"regions": ["syd1"]`),
    which matches the user's region. A residual 451 (blocked even from syd1) maps to
    a `region_blocked` error that points to paste.
  - RESILIENCE: the title path tries the top `MAX_INFO_ATTEMPTS` chord versions, so a
    single removed/blocked tab no longer fails the whole request. Search 404 and
    empty results map to `not_found` (404), not a generic upstream error.
- **Shared parser** - `src/music/parse.ts`. One parser for both fetch and paste:
  decodes entities, strips `[tab]`, reads `[ch]` tags or bare chord lines, splits
  sections, expands `xN` repeats (capped), filters `N.C.`, maps German `H` to `B`,
  transposes by capo, collapses consecutive duplicates. Outputs `Song.chords:
  string[]`, which `voiceSong()` consumes. Tested in `parse.test.ts`.

## Deferred from Wave 2 (seams for Wave 3)

- **Paste capo field** - the paste box assumes capo 0 (chords as written), matching
  the design kit. A pasted UG sheet with a capo plays at guitar pitch, not true
  piano pitch. Seam: add an optional capo input to `PasteFallback` and pass it to
  `parse(text, { capo })` - the parser already transposes.
- **Sectioned view + repeat collapse with xN counter** - the parser flattens to a
  chord sequence and expands repeats. BRIEF.md's sectioned/flat toggle and
  "collapse repeats with an xN counter" need section structure the flat `Song`
  shape does not carry yet.
- **Songbook caching of fetched songs** - the BRIEF wants previously fetched songs
  to survive UG outages offline. The Load view fetches fresh each time; persisting
  the parsed `Song` is Wave 3 (songbook).
- **Manual transpose buttons** - a locked BRIEF decision (shift the whole song to
  an easier key), separate from capo correction. Not built; lives near the voicing
  engine / a Play-view control.
- **Alternate-version labels** - alternates show "Version N" + ratings + key. The
  kit's richer labels ("lower for voice", "capo equivalent") need key-delta logic.

## Out of scope (explicit in the brief)

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
