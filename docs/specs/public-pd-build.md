# Spec: public, public-domain-only build

A second deployment of Alight that exposes only the bundled public-domain library
and the client-side chord-sheet paste - no gate, no online features, no backend.
The full gated app keeps shipping unchanged from the same source.

## Why it needs no backend

The PD library is bundled JS (`src/data/pd-library.ts`), the voicing/figure engines
and the play clock are pure client-side, and the Sound feature streams samples from
a CDN. Every server dependency belongs to features the public build drops:

| Feature | Public build | Backend it needs |
| --- | --- | --- |
| PD song library | keep | none (bundled) |
| Paste a chord sheet | keep | none (`src/music/parse.ts`, client-side) |
| Sound (sampled piano) | keep | none (CDN, optionally self-hosted) |
| Title search | drop | Ultimate Guitar proxy (`api/chords.ts`) |
| YouTube search | drop | YouTube Data API key (`api/youtube-search.ts`) |
| Play-along + audio upload | drop | ChordMini VPS + tunnel + `AUDIO_SIGNING_SECRET` (`api/analyze.ts`) |

The audio-file upload (in `AnalyzeInput`) is distinct from the chord-sheet paste
(`PasteFallback`): the former POSTs bytes to `/api/analyze`, the latter runs the
local parser. Only the paste is kept.

## Mechanism: one build flag

`VITE_PUBLIC_ONLY=1` at build time. Vite inlines `import.meta.env.VITE_PUBLIC_ONLY`
as a literal, so the public build tree-shakes the dropped feature code (and its
`/api` callers) out of the bundle. Default (unset) = the full app, unchanged.

- `src/config.ts`: `export const PUBLIC_ONLY = import.meta.env.VITE_PUBLIC_ONLY === "1";`
- `src/App.tsx`: skip the gate - `if (!PUBLIC_ONLY && !unlocked) return <Gate/>`.
- `src/components/LoadView.tsx`: render the title-search block, the divider,
  `<YoutubeSearch/>` and `<AnalyzeInput/>` only when `!PUBLIC_ONLY`. Keep
  `<SongLibrary/>` and `<PasteFallback/>` always. Reword the heading subtitle.

## Phase 2 - deploy (owner handles)

Second Vercel project from the same repo, build env `VITE_PUBLIC_ONLY=1`, custom
domain. The public project must NOT serve `api/` - in particular `/api/chords` is
ungated. Add a `.vercelignore` containing `api` to the public project, or host the
static `dist/` on a pure static host.

## Phase 3 - drop the third-party CDNs (so the public app is fully self-contained)

- Fonts: import the `@fontsource/spectral` and `@fontsource/atkinson-hyperlegible`
  per-weight CSS in `src/main.tsx` (Vite bundles the WOFF2 into `dist/assets`), and
  remove the Google Fonts `@import` in `src/styles/colors_and_type.css`. Both fonts
  are OFL-1.1 - free to bundle.
- Samples: `new SplendidGrandPiano(ctx, { baseUrl: "/samples", formats: ["ogg"] })`
  in `src/play/useChordPiano.ts`, with the ogg sample set served from `/samples`.
  Source: `github.com/smpldsnds/sfzinstruments-splendid-grand-piano` (~20 MB ogg).
  Filenames contain spaces and `#` (e.g. `FF A#2.ogg`); this already works against
  smplr's CDN today, so the same names served from `/samples` behave identically.

## Verification

- `npm run build` clean both ways; `VITE_PUBLIC_ONLY=1` build shows no gate, only the
  library + paste, and makes zero `/api` requests.
- Full build (flag unset) unchanged.
- Phase 3: no request to `fonts.googleapis.com` or the smplr CDN at runtime.
