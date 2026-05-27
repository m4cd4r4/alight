# Alight

Type a song, see two mini piano keyboards (left hand + right hand) light up
exactly which keys to press for each chord as you step through. A calm,
literal "which keys do I press" tool for hobbyist players.

There are two ways to load a song:

- **By title** - the app fetches chords from Ultimate Guitar's signed mobile
  API, parses them, and plays you through.
- **Play along with a recording** - paste a YouTube link (or upload audio),
  the self-hosted ChordMini backend extracts chord predictions + beats +
  synced lyrics from the audio, and the Play view animates in time with
  the music. See [docs/play-along/yt-tunnel.md](docs/play-along/yt-tunnel.md)
  for the residential-IP tunnel that lets YouTube extraction work at all.

See [docs/BRIEF.md](docs/BRIEF.md) for the original product brief and
[docs/PROJECT-PLAN.md](docs/PROJECT-PLAN.md) for what's shipped vs what's next.

Live: <https://alight-rho.vercel.app> (gated, ask Macdara for the password).

## Run

```bash
npm install
npm run dev           # Vite dev server at http://localhost:5173 (UI only)
vercel dev            # full app + /api/chords + /api/analyze proxies
npm run build         # type-checks (tsc -b, strict) and builds to dist/
npm test              # parser + timeline tests (Node's built-in runner)
npm run typecheck:api # type-checks the serverless functions
```

`npm run dev` alone serves the UI only - the title-search path and the
play-along path both need their serverless functions, so use `vercel dev` to
exercise them locally. The title search hits Ultimate Guitar's signed mobile
API (`api.ultimate-guitar.com`); the play-along path proxies through to the
ChordMini backend on the VPS.

The gate password defaults to `alight2026` and is configured in code at
[src/gate.ts](src/gate.ts) (override via `VITE_ALIGHT_PASSWORD` for the
client + `ALIGHT_PASSWORD` for the serverless function).

## What works

### Load View

- **Find a song**: type a title to fetch chords from Ultimate Guitar (best
  version auto-picked, alternates one tap away), or paste a chord sheet. Both
  run the same parser; capo songs are transposed to true piano pitch. A
  blocked or empty fetch drops cleanly to the paste box.
- **Play along with audio**: paste a YouTube link or upload an audio file.
  Returns chords + beats + synced lyrics for the Play view to animate.

### Play View

- Two keyboards (left `C2-E3`, right `F3-B4`) lighting the exact voiced keys,
  with note name + finger number, hands distinguished by colour AND shape
  (square = left, triangle = right).
- Current chord + full inversion label; next chord ghosted on the keys.
- Stepping with spacebar / right arrow / Next, back with left arrow / Back.
- Voicing toggle (Simple/Full), fingering on/off, light/dark theme.
- **Play-along mode**: when loaded from audio, the timeline drives chord
  changes and the lyrics panel scrolls in sync with the recording.

## Architecture

```
src/
  components/   PlayView, LoadView, AnalyzeInput, Keyboard, LyricsPanel,
                HandMarker, ChordLabel, Transport, Controls, Gate
  music/        types, note helpers, voicing engine, timeline contract,
                ChordMini -> Timeline mapper, LRC parser (all pure, no React)
  play/         usePlayAlong rAF clock hook (timed + manual modes)
  youtube/      videoIdFromUrl helper (extraction itself is server-side)
  data/         static sample songs
  styles/       design tokens

api/            Vercel serverless functions
  chords.ts     Ultimate Guitar mobile-API proxy (title search)
  analyze.ts    ChordMini proxy (YouTube + upload analysis)
  lyrics.ts     LRCLIB synced-lyrics fallback

deploy/
  chordmini/    self-hosted lean ChordMini backend (Docker, runs on VPS)
  perth-tunnel/ PowerShell wrapper + scheduled-task install for the
                residential SSH reverse tunnel
```

The **voicing engine** ([src/music/voicing.ts](src/music/voicing.ts)) is the
core of the Play view. Given a progression of chord symbols it derives, per
chord: the left-hand bass, the right-hand chord tones (triad for Simple, full
chord for Full), and the inversion label. The right-hand octave placement is
chosen by a greedy nearest-voicing pass so the hand barely moves chord to
chord. Chord parsing uses [`tonal`](https://github.com/tonaljs/tonal). What
the keyboards light is exactly what the engine produces - no faked keys
(WYSIWYG).

The **timeline contract**
([src/music/timeline.ts](src/music/timeline.ts)) is the bridge between the
ChordMini analysis JSON and the Play view's animation loop. `fromChordMini()`
maps the backend's `chord_predictions[]` + `beats[]` + LRC string into the
shared `Timeline` shape; `usePlayAlong` ticks an `rAF` clock against it.

## Play-along: the stack behind the YouTube button

The "paste a YouTube link" path runs through four hops:

```
Browser  ->  Vercel /api/analyze  ->  ChordMini backend (VPS)  ->  yt-dlp ->
                                                                       |
                                                                   SOCKS5
                                                                       v
                                                            Perth workstation
                                                            (residential IP)
                                                                       v
                                                                    YouTube
```

1. Client POSTs `{ youtubeUrl }` (or `{ audioBase64 }` for uploads) with the
   admin gate header to `/api/analyze`.
2. Vercel function forwards to the ChordMini backend on the Donnacha VPS,
   guarded by a bearer token at nginx.
3. ChordMini's ingest blueprint shells out to `yt-dlp` with `--proxy
   socks5h://172.17.0.1:1080`.
4. The SOCKS endpoint is an SSH reverse-forward from Macdara's Perth
   workstation. yt-dlp egresses through a residential IP - the only reason
   YouTube serves real audio formats (datacentre IPs only get SABR/storyboard
   placeholders).

If the tunnel is down, the YouTube path returns `Could not fetch audio for
that link.` and the user can fall back to uploading an audio file (capped at
~3 MB by Vercel's body limit). Operational details + diagnosis playbook in
[docs/play-along/yt-tunnel.md](docs/play-along/yt-tunnel.md).

## Repository layout

| Path                              | Purpose                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| `src/`                            | React + Vite app (Play view, Load view, voicing engine)              |
| `api/`                            | Vercel serverless functions (UG proxy, ChordMini proxy, LRCLIB)      |
| `deploy/chordmini/`               | Lean ChordMini Docker build (CPU-only, no TF/Spleeter) + run script  |
| `deploy/perth-tunnel/`            | PowerShell wrapper for the residential SSH tunnel + install README   |
| `design/`                         | Tokenised design system (colors, typography, piano, play)            |
| `docs/`                           | Briefs, project plan, play-along architecture                        |

## Design system

The design system of record lives in [design/](design/); the visual aesthetic
is locked (Luxury Quiet - cool showroom white, Spectral + Atkinson
Hyperlegible).
