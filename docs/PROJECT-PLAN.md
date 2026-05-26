# Alight - Project Plan

Coordination doc for multi-worktree work. Source of truth for what each worktree owns. Update this in the same commit that mints, merges, or supersedes an entry.

Master functional brief: [docs/BRIEF.md](BRIEF.md). Design system: [design/DESIGN.md](../design/DESIGN.md).

## Worktree status

| # | Slug | Wave | Scope | Output paths | Status |
|---|------|------|-------|--------------|--------|
| 1 | scaffold-play-view | 1 | Vite + React + TS scaffold, ported tokens, Play view (SVG keyboards, voicing engine), width fix | `src/**`, `index.html`, build config | merged to main @ ad88030 |
| 2 | song-fetch | 2 | Auto-fetch chords by title (Vercel serverless proxy + UG mobile API), the shared chord parser, paste-a-sheet fallback, Load view + view switch, theme-toggle polish | `api/**`, `src/music/parse.ts`, `src/components/LoadView.tsx`, `src/App.tsx` | merged to main |
| 3 | play-along | 3 | Synced lyrics + animated play-along guidance. Self-host ChordMini's MIT `python_backend` (chords + beats + synced-lyrics timing) on the VPS; Alight calls it and renders beat-accurate timing as a karaoke-style lyric highlight with the chord's keys lighting on the two-hand keyboard, tap-tempo + manual-step fallback. Gate the deploy (Vercel Pro password) before lyrics go live. | `api/analyze.ts` (ChordMini proxy), `src/music/lrc.ts`, `src/music/timeline.ts`, `src/components/**` (lyrics panel + play-along), `src/App.tsx`; VPS: ChordMini `python_backend` container (not in repo) | materialised |

## Waves

- **Wave 1 (done):** make the app real and playable on static data. Merged.
- **Wave 2 (done):** song input. Auto-fetch by title (serverless proxy + UG mobile API) carrying the shared parser, plus the paste fallback (same parser, both paths), the Load view, and the theme-toggle polish. Merged.
- **Wave 3 (current): play-along - synced lyrics + animation.** Add lyrics and a gentle animation that guides the player and indicates when to play. See "Wave 3 decisions" below. Worktree slug: `play-along`.
- **Later (post Wave 3, not yet scoped):** audio playback (smplr), saved songbook + export/import, printable chord sheet, settings panel, and the Wave 2 seams in `docs/CLAUDE-TODO.md` (sectioned view, manual transpose, paste-capo field, songbook caching).

## Wave 3 decisions (researched 2026-05-26)

- **Data source = self-host ChordMini's `python_backend`** (github.com/ptnghia-j/ChordMiniApp, MIT) on the Donnacha VPS. Endpoints Alight calls: `POST /api/recognize-chords` (chords + timestamps), `POST /api/detect-beats` (beats + BPM), `GET /api/lrclib-lyrics` (synced lyrics via LRCLIB). This solves the hard, already-built part (audio -> beat-accurate chords + word-synced lyrics).
- **Do NOT reskin / fork ChordMini's frontend.** Verified by deep live + code audit: its piano view is a Synthesia-style falling-notes roll (single 88-key, instrument-coloured, no hand-split, no finger numbers, no triad reduction) - the opposite paradigm to Alight's calm "which-keys-to-press for non-readers" view. Its stack (Next.js 16 + HeroUI + Firebase + Tone/three, ~101k LOC) and dark dashboard aesthetic are far from Alight's lean Vite + "Luxury Quiet". Reskinning = inherit 101k LOC and still rebuild the one view we want. Keep Alight lean with its own (stronger, voice-leading) engine and view. Cherry-pick at most chord-alias ideas from ChordMini's `utils/chordToMidi.ts`.
- **Timing model:** beat-accurate from ChordMini when available; **tap-tempo + manual-step** as the always-works fallback (and for paste/UG-only songs with no analysis).
- **Lyrics legality:** lyrics are copyrighted (chords are not), and AU has no general personal-use exception. Keep it strictly personal: **gate the deployed app behind a password** (Vercel Pro Password Protection on production) so the public URL is genuinely just the owner. Source synced lyrics via LRCLIB (no anti-scraping/storage terms). Never distribute/monetize.
- **Prototype order:** build Alight's animated two-hand play-along UI against a **captured sample ChordMini analysis JSON** first (the hosted demo's YouTube pipeline is currently degraded + Firebase-gated), then self-host the backend for the real thing.
- **Audio acquisition:** ChordMini's analysis endpoints take audio; Alight needs a song-input flow (YouTube URL via yt-dlp on the backend, or file upload). Map from the UG-fetched title where possible.
- Build/recon notes for the self-host live in Vikunja task 519 (project Alight).

## What this plan does NOT cover

- Audio playback, songbook persistence, print sheet, settings (Wave 3).
- A custom domain (currently free `alight-rho.vercel.app`).
- Self-hosting fonts and finalising the octave-register decision (pre-launch chores, tracked in DESIGN.md).

## Notes

- Local-only repo, no GitHub remote yet. Branches merge to `main` locally; deploys are manual snapshots to the existing Vercel project `m4cd4r4s-projects/alight`.
- Wave-gate discipline: one wave at a time. Wave 2 is merged, so Wave 3 (`play-along`) is now materialised. Do not pre-mint a Wave 4 while Wave 3 is open.
