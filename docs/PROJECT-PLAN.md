# Alight - Project Plan

Coordination doc for multi-worktree work. Source of truth for what each worktree owns. Update this in the same commit that mints, merges, or supersedes an entry.

Master functional brief: [docs/BRIEF.md](BRIEF.md). Design system: [design/DESIGN.md](../design/DESIGN.md).

## Worktree status

| # | Slug | Wave | Scope | Output paths | Status |
|---|------|------|-------|--------------|--------|
| 1 | scaffold-play-view | 1 | Vite + React + TS scaffold, ported tokens, Play view (SVG keyboards, voicing engine), width fix | `src/**`, `index.html`, build config | merged to main @ ad88030 |
| 2 | song-fetch | 2 | Auto-fetch chords by title (Vercel serverless proxy + UG scrape), the shared chord parser, paste-a-sheet fallback, Load view + view switch | `api/**`, `src/music/parse.ts`, `src/components/LoadView.tsx`, `src/App.tsx` | materialised |

## Waves

- **Wave 1 (done):** make the app real and playable on static data. Merged.
- **Wave 2 (current):** song input. Auto-fetch by title is the headline; it carries the shared parser, so the paste fallback ships with it (same parser, both paths - see BRIEF.md). Finish + merge before scoping Wave 3.
- **Wave 3 (later, not yet scoped):** audio (smplr), saved songbook + export/import, printable chord sheet, settings. Scope these AFTER Wave 2 lands, in light of what the parser actually produces.

## What this plan does NOT cover

- Audio playback, songbook persistence, print sheet, settings (Wave 3).
- A custom domain (currently free `alight-rho.vercel.app`).
- Self-hosting fonts and finalising the octave-register decision (pre-launch chores, tracked in DESIGN.md).

## Notes

- Local-only repo, no GitHub remote yet. Branches merge to `main` locally; deploys are manual snapshots to the existing Vercel project `m4cd4r4s-projects/alight`.
- Wave-gate discipline: one wave at a time. Do not pre-mint Wave 3 worktrees while Wave 2 is open.
