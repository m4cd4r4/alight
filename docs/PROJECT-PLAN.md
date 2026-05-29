# Alight - Project Plan

Coordination doc for multi-worktree work. Source of truth for what each worktree owns. Update this in the same commit that mints, merges, or supersedes an entry.

Master functional brief: [docs/BRIEF.md](BRIEF.md). Design system: [design/DESIGN.md](../design/DESIGN.md).

## Worktree status

| # | Slug | Wave | Scope | Output paths | Status |
|---|------|------|-------|--------------|--------|
| 1 | scaffold-play-view | 1 | Vite + React + TS scaffold, ported tokens, Play view (SVG keyboards, voicing engine), width fix | `src/**`, `index.html`, build config | merged to main @ ad88030 |
| 2 | song-fetch | 2 | Auto-fetch chords by title (Vercel serverless proxy + UG mobile API), the shared chord parser, paste-a-sheet fallback, Load view + view switch, theme-toggle polish | `api/**`, `src/music/parse.ts`, `src/components/LoadView.tsx`, `src/App.tsx` | merged to main |
| 3 | play-along | 3 | Synced lyrics + animated play-along guidance. Self-host ChordMini's MIT `python_backend` (chords + beats + synced-lyrics timing) on the VPS; Alight calls it and renders beat-accurate timing as a karaoke-style lyric highlight with the chord's keys lighting on the two-hand keyboard, tap-tempo + manual-step fallback. Gate the deploy before lyrics go live. | `api/analyze.ts` (ChordMini proxy), `api/gate` (app gate), `src/music/lrc.ts`, `src/music/timeline.ts`, `src/play/usePlayAlong.ts`, `src/components/**` (lyrics panel + play-along + gate), `src/App.tsx`, `deploy/chordmini/**`; VPS: ChordMini `python_backend` container (not in repo) | merged to main |
| 4 | beginner-overview-and-practice | 4 | Beginner-first defaults: a "beginner" voicing that simplifies every chord to a playable triad; live key transpose (`+/-`, plus an "Easy key" auto-shift that minimises black-key roots); an "All chords" overview grid; and practice controls (speed 0.5/0.75/1x, A-B loop, count-in - all in `usePlayAlong`). | `src/music/transpose.ts` (+test), `src/music/voicing.ts` (+`voicing.test.ts`, `simplifyToTriad`), `src/music/types.ts`, `src/play/usePlayAlong.ts`, `src/components/PlayView.tsx`, `src/components/ChordStrip.tsx` (new), `src/components/ChordLabel.tsx`, `src/components/Keyboard.tsx`, `src/styles/{piano,play}.css` | merged to main (PR #2 @ 47ff5e2) |
| 5 | audio-playback | 5 | Sampled-piano playback (smplr) of the lit chord + metronome, in both timing modes. Sound off by default; armed by a toggle (the WebAudio gesture). Spec: `docs/specs/audio-playback.md`. | `src/audio/**` (new), `src/components/PlayView.tsx`, `src/components/Controls.tsx`, `src/styles/play.css`, `package.json` | later (spec'd) |
| 6 | saved-songbook | 5 | Persist loaded songs (chords + analysis timeline) to a Postgres DB on the VPS, fronted by a token-gated service and a Vercel proxy (mirrors the analyze path); list/open/delete + JSON export/import. Spec: `docs/specs/saved-songbook.md`. | `api/songbook.ts` (new), `deploy/songbook/**` (new), `src/songbook/**` (new), `src/components/{Songbook,PlayView,LoadView}.tsx`, `src/App.tsx`, `src/styles/load.css`; VPS: `alight` Postgres DB + `songbook.donnacha.app` service (not in repo) | later (spec'd) |

## Waves

- **Wave 1 (done):** make the app real and playable on static data. Merged.
- **Wave 2 (done):** song input. Auto-fetch by title (serverless proxy + UG mobile API) carrying the shared parser, plus the paste fallback (same parser, both paths), the Load view, and the theme-toggle polish. Merged.
- **Wave 3 (done): play-along - synced lyrics + animation.** Merged. Timeline contract + LRC parser + ChordMini->Alight mapper (tested); animated play-along Play view (karaoke lyric highlight, timed key-lighting, play/pause, tap-tempo, manual fallback); `api/analyze.ts` proxy (YouTube + upload, token-gated); self-hosted lean ChordMini backend on the VPS; deployed + app-gated. See "Wave 3 outcome" below.
- **Wave 4 (done): beginner-first overview + transpose + practice controls.** Merged (PR #2 @ 47ff5e2). Beginner voicing (`simplifyToTriad`), live transpose + "Easy key" (`src/music/transpose.ts`), "All chords" overview grid (`ChordStrip`), and the speed / A-B loop / count-in practice controls in `usePlayAlong`. Resolves the "manual transpose" seam from `docs/CLAUDE-TODO.md`.
- **Wave 5 (scoped, two parallel worktrees):** audio playback (smplr) and saved songbook (VPS-hosted Postgres). Both spec'd under `docs/specs/`. File-disjoint, so they can run in parallel. See `docs/specs/audio-playback.md` and `docs/specs/saved-songbook.md`.
- **Later (not yet scoped):** printable chord sheet, settings panel, word-level (per-syllable) lyric sync, and the remaining Wave 2 seams in `docs/CLAUDE-TODO.md` (sectioned view, **paste-capo field**, songbook caching). Note: the paste-capo seam survived Wave 4 - transpose shipped, but the paste box still assumes capo 0.

## Wave 3 decisions (researched 2026-05-26)

- **Data source = self-host ChordMini's `python_backend`** (github.com/ptnghia-j/ChordMiniApp, MIT) on the Donnacha VPS. Endpoints Alight calls: `POST /api/recognize-chords` (chords + timestamps), `POST /api/detect-beats` (beats + BPM), `GET /api/lrclib-lyrics` (synced lyrics via LRCLIB). This solves the hard, already-built part (audio -> beat-accurate chords + word-synced lyrics).
- **Do NOT reskin / fork ChordMini's frontend.** Verified by deep live + code audit: its piano view is a Synthesia-style falling-notes roll (single 88-key, instrument-coloured, no hand-split, no finger numbers, no triad reduction) - the opposite paradigm to Alight's calm "which-keys-to-press for non-readers" view. Its stack (Next.js 16 + HeroUI + Firebase + Tone/three, ~101k LOC) and dark dashboard aesthetic are far from Alight's lean Vite + "Luxury Quiet". Reskinning = inherit 101k LOC and still rebuild the one view we want. Keep Alight lean with its own (stronger, voice-leading) engine and view. Cherry-pick at most chord-alias ideas from ChordMini's `utils/chordToMidi.ts`.
- **Timing model:** beat-accurate from ChordMini when available; **tap-tempo + manual-step** as the always-works fallback (and for paste/UG-only songs with no analysis).
- **Lyrics legality:** lyrics are copyrighted (chords are not), and AU has no general personal-use exception. Keep it strictly personal: **gate the deployed app behind a password** (Vercel Pro Password Protection on production) so the public URL is genuinely just the owner. Source synced lyrics via LRCLIB (no anti-scraping/storage terms). Never distribute/monetize.
- **Prototype order:** build Alight's animated two-hand play-along UI against a **captured sample ChordMini analysis JSON** first (the hosted demo's YouTube pipeline is currently degraded + Firebase-gated), then self-host the backend for the real thing.
- **Audio acquisition:** ChordMini's analysis endpoints take audio; Alight needs a song-input flow (YouTube URL via yt-dlp on the backend, or file upload). Map from the UG-fetched title where possible.
- Build/recon notes for the self-host live in Vikunja task 519 (project Alight).

## Wave 3 outcome (built 2026-05-26)

What actually shipped, and where the plan met reality:

- **Backend = a LEAN, CPU-only fork of ChordMini's `python_backend`** on the VPS (`deploy/chordmini/Dockerfile`). Chord-CNN-LSTM (Torch) for chords, **madmom** for beats, LRCLIB for lyrics. Dropped TensorFlow + Spleeter (both lazy-imported and unused) and the multi-GB CUDA Torch wheel (CPU wheel instead) -> 3.32GB image. Model weights came from git submodules (`models/Chord-CNN-LSTM`, `models/Beat-Transformer`), which the recon clone had not initialised. ChordMini's own youtube blueprint is broken in this build (imports a missing `routes.py`), so Alight adds one small ingest endpoint (`alight_ingest.py`, registered via `alight_app.py` without editing ChordMini) for "YouTube URL -> audio".
- **Exposure:** container bound to `127.0.0.1:8473`, resource-limited (`--memory=4g --cpus=2`, `--restart unless-stopped`). Public only via nginx at `https://chordmini.donnacha.app` (new Hostinger A record + Let's Encrypt cert), bearer-token gated + rate-limited. Token in `/opt/chordmini-recon/.alight_token`; mirrored to the Vercel env `CHORDMINI_TOKEN` (+ `CHORDMINI_URL`).
- **Gate:** Vercel Password Protection turned out to need the paid *Advanced Deployment Protection* add-on (not in Pro), so it is gated **in-app** instead - a password screen (`alight2026`, configured in code, override via `VITE_ALIGHT_PASSWORD` / `ALIGHT_PASSWORD`) plus an `x-alight-gate` header check on `api/analyze.ts` so synced lyrics cannot be fetched directly. See the residual-risk note in `docs/CLAUDE-TODO.md`.
- **Verified end-to-end on production** (`alight-rho.vercel.app`): gate -> unlock -> paste a YouTube link -> live analysis -> animated two-hand play-along with real chords, beat-derived BPM, and synced lyrics. Pure-logic layer has 21 passing tests.

## What this plan does NOT cover

- Print sheet, settings panel, word-level lyric sync, paste-capo field (see "Later" above).
- A custom domain (currently free `alight-rho.vercel.app`).
- Self-hosting fonts and finalising the octave-register decision (pre-launch chores, tracked in DESIGN.md).

## Notes

- GitHub remote: `github.com/m4cd4r4/alight`. Branches merge to `main` via PR (PR #2 landed Wave 4); `delete_branch_on_merge` is on. Deploys are manual snapshots to the existing Vercel project `m4cd4r4s-projects/alight`. (Earlier the repo was local-only; the remote + PR flow were added during Wave 4.)
- Wave-gate discipline: one wave at a time. Waves 1-4 are merged, so Wave 5 (`audio-playback`, `saved-songbook`) is now scoped. Both Wave 5 worktrees are file-disjoint and may run in parallel; do not pre-mint a Wave 6 while Wave 5 is open.
