# Alight - Project Plan

Coordination doc for multi-worktree work. Source of truth for what each worktree owns. Update this in the same commit that mints, merges, or supersedes an entry.

Master functional brief: [docs/BRIEF.md](BRIEF.md). Design system: [design/DESIGN.md](../design/DESIGN.md).

## Worktree status

| # | Slug | Wave | Scope | Output paths | Status |
|---|------|------|-------|--------------|--------|
| 1 | scaffold-play-view | 1 | Vite + React + TS scaffold, ported tokens, Play view (SVG keyboards, voicing engine), width fix | `src/**`, `index.html`, build config | merged to main @ ad88030 |
| 2 | song-fetch | 2 | Auto-fetch chords by title (Vercel serverless proxy + UG mobile API), the shared chord parser, paste-a-sheet fallback, Load view + view switch, theme-toggle polish | `api/**`, `src/music/parse.ts`, `src/components/LoadView.tsx`, `src/App.tsx` | merged to main |
| 3 | play-along | 3 | Synced lyrics + animated play-along guidance. Self-host ChordMini's MIT `python_backend` (chords + beats + synced-lyrics timing) on the VPS; Alight calls it and renders beat-accurate timing as a karaoke-style lyric highlight with the chord's keys lighting on the two-hand keyboard, tap-tempo + manual-step fallback. Gate the deploy before lyrics go live. | `api/analyze.ts` (ChordMini proxy), `api/gate` (app gate), `src/music/lrc.ts`, `src/music/timeline.ts`, `src/play/usePlayAlong.ts`, `src/components/**` (lyrics panel + play-along + gate), `src/App.tsx`, `deploy/chordmini/**`; VPS: ChordMini `python_backend` container (not in repo) | merged to main |

## Waves

- **Wave 1 (done):** make the app real and playable on static data. Merged.
- **Wave 2 (done):** song input. Auto-fetch by title (serverless proxy + UG mobile API) carrying the shared parser, plus the paste fallback (same parser, both paths), the Load view, and the theme-toggle polish. Merged.
- **Wave 3 (done): play-along - synced lyrics + animation.** Merged. Timeline contract + LRC parser + ChordMini->Alight mapper (tested); animated play-along Play view (karaoke lyric highlight, timed key-lighting, play/pause, tap-tempo, manual fallback); `api/analyze.ts` proxy (YouTube + upload, token-gated); self-hosted lean ChordMini backend on the VPS; deployed + app-gated. See "Wave 3 outcome" below.
- **Later (post Wave 3, not yet scoped):** audio playback (smplr), saved songbook + export/import, printable chord sheet, settings panel, and the Wave 2 seams in `docs/CLAUDE-TODO.md` (sectioned view, manual transpose, paste-capo field, songbook caching).

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

- Audio playback, songbook persistence, print sheet, settings (Wave 3).
- A custom domain (currently free `alight-rho.vercel.app`).
- Self-hosting fonts and finalising the octave-register decision (pre-launch chores, tracked in DESIGN.md).

## Notes

- Local-only repo, no GitHub remote yet. Branches merge to `main` locally; deploys are manual snapshots to the existing Vercel project `m4cd4r4s-projects/alight`.
- Wave-gate discipline: one wave at a time. Wave 2 is merged, so Wave 3 (`play-along`) is now materialised. Do not pre-mint a Wave 4 while Wave 3 is open.
