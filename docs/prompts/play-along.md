# Alight - Play-along (synced lyrics + animation) Brief

Open this in a **fresh Claude Code session** in `I:/Scratch/piano-chords-play-along/`. Do not carry context from the planning session.

## First action: read before any code

This is **Wave 3**, branched off `main` at `06f8f7e` (Waves 1-2 are merged: scaffold + Play view + song-fetch + theme polish). Local-only repo, no remote, so there is no rebase. Confirm branch (`git branch --show-current` -> `feat/play-along`), then read IN FULL:

1. [docs/PROJECT-PLAN.md](../PROJECT-PLAN.md) - the **"Wave 3 decisions"** section is the source of truth for this work. Read it first.
2. [docs/BRIEF.md](../BRIEF.md) - the master product brief (the WYSIWYG principle, the "non-reader hobbyist" user, the locked aesthetic).
3. [src/music/voicing.ts](../../src/music/voicing.ts) and [src/music/types.ts](../../src/music/types.ts) - the existing voicing engine (chord symbol -> exact keys with greedy voice-leading) and the `Song`/`VoicedStep` shapes. You build ON these; do not replace them.
4. [src/music/parse.ts](../../src/music/parse.ts) - the shared UG parser (produces `Song.chords: string[]`).
5. [src/components/PlayView.tsx](../../src/components/PlayView.tsx) and [src/components/Keyboard.tsx](../../src/components/Keyboard.tsx) - the two-hand keyboard you will animate.
6. Vikunja task 519 (project Alight) - the ChordMini self-host build notes (endpoints, model caveats, Dockerfile). Read via `python ~/.claude/scripts/vikunja-cli.py ls alight`.

If anything here contradicts those files, **the files win**. The aesthetic and the two-hand keyboard view are LOCKED. Do not run a design skill, and **do not reskin ChordMini** (see below).

## The goal

Add **synced lyrics** and a **gentle animation** that guides a non-reading hobbyist pianist through the chosen song and indicates when to play each chord. The lit keys on the two existing keyboards stay the hero; lyrics and a "now" cursor ride alongside to show *where you are* and *when the next chord lands*.

## Locked decisions (from the 2026-05-26 research - see PROJECT-PLAN Wave 3)

- **Data = self-host ChordMini's MIT `python_backend`** on the Donnacha VPS (Docker). Endpoints Alight calls: `POST /api/recognize-chords` (chords + timestamps), `POST /api/detect-beats` (beats + BPM), `GET /api/lrclib-lyrics` (synced lyrics via LRCLIB). This is the hard, already-built MIR layer.
- **Do NOT reskin or fork ChordMini's frontend.** A deep live + code audit confirmed its piano view is a Synthesia-style falling-notes roll (single 88-key, instrument-coloured, no hand-split, no finger numbers) on a heavy Next.js/Firebase/~101k-LOC stack - the opposite of Alight's calm two-hand non-reader view. Keep Alight lean with its own engine and view. At most, read `utils/chordToMidi.ts` for chord-alias ideas; copy a table, not the app.
- **Timing:** beat-accurate from ChordMini when available; **tap-tempo + manual-step** as the always-works fallback (and for paste/UG-only songs with no analysis). The Play view must still work with no timing data.
- **Lyrics are copyrighted** (chords are not), and AU has no general personal-use exception. Keep it strictly personal: the deploy is **gated behind a Vercel Pro password** before any lyric ships. Source synced lyrics via LRCLIB. Never distribute or monetize.

## What's in scope

- **Timeline data contract + sample fixture** (`src/music/timeline.ts`, `src/music/__fixtures__/`): define the typed shape Alight consumes (chords with times, beats/BPM, synced lyric lines with times) and a hand-authored sample so UI work does not block on the backend.
- **LRC parser** (`src/music/lrc.ts`): pure `[mm:ss.xx]` LRC -> `[{ time, text }]`, with a test.
- **Play-along UI** in the Play view: a lyrics panel with karaoke-style line highlight on the timeline clock; the current chord's keys light in sync; play/pause; tap-tempo; manual step (space/arrows) stays. Calm, on-aesthetic.
- **Serverless proxy** (`api/analyze.ts`): Alight -> the self-hosted ChordMini backend (token-gated), returning the timeline contract. Plus the song-input path (a YouTube URL or upload feeding the backend's audio analysis; map from the UG title where possible).
- **Self-host ChordMini `python_backend`** on the VPS (Docker, resource-limited so it cannot starve the VPS's production services), exposed token-gated and reachable from Vercel.
- **Gate** the production deploy (Vercel Pro Password Protection) before lyrics go live.

## Out of scope (do NOT build / touch)

- Reskinning or forking ChordMini's frontend (decision is final).
- The voicing engine's internals, the parser's chord output, or the design tokens (use as-is; wire only).
- Saved songbook, printable sheet, settings panel, smplr audio playback (later waves).
- Word-level (karaoke-per-syllable) lyrics - line-level is the target.

## What "good" looks like

- Pick a song, and the lyrics scroll/highlight line-by-line in time while the two keyboards light the right keys, so a non-reader can follow "play this now".
- A clear "next chord lands in ..." cue (the existing ghosted next-chord, now timed).
- With no analysis available (paste / UG-only), tap-tempo + manual step still give a usable play-along - nothing crashes when timing is absent.
- The screen stays calm and on-brand (Luxury Quiet); the keyboards remain the hero.
- Lyrics only ever appear on a password-gated deploy (or locally), never the open public URL.

## Required deliverables

1. A short build plan / rationale before code: the timeline data contract, the ChordMini->Alight mapping, the Play-view animation states, the fallback behaviour.
2. The timeline contract + sample fixture, the LRC parser (+ test), the animated play-along Play view, the `api/analyze.ts` proxy, the self-hosted backend, and the gate - sequenced (see workflow).
3. A test for the LRC parser and the timeline mapping (pure functions), runnable via `npm test` (Node's built-in runner, as in `src/music/parse.test.ts`).
4. Verification: prove the animation against the sample fixture locally; then prove a real analysis end-to-end against the self-hosted backend; state what you actually tested.
5. Update `docs/PROJECT-PLAN.md` (mark play-along merged) and `docs/CLAUDE-TODO.md` in your final commit.

## Suggested workflow (sequenced to de-risk)

1. Read the source-of-truth files + PROJECT-PLAN Wave 3 + Vikunja 519.
2. Write the build plan (no code).
3. **Phase 1 - decouple from infra:** define `src/music/timeline.ts` contract + a hand-authored sample fixture + the LRC parser (+ tests).
4. **Phase 2 - build the play-along UI** against the sample fixture: lyrics highlight, timed key-lighting, play/pause, tap-tempo, manual fallback. Verify in the browser (`npm run dev`).
5. **Phase 3 - self-host ChordMini backend** on the VPS (Docker, resource-limited): resolve the model weights (the Chord-CNN-LSTM / Beat-Transformer dirs are empty in the clone - likely submodules/downloads; the recon clone is at VPS `/opt/chordmini-recon`), build, run, verify `/api/recognize-chords` + `/api/detect-beats` + `/api/lrclib-lyrics` produce real data. Capture one real analysis JSON to replace/validate the sample fixture.
6. **Phase 4 - wire it:** `api/analyze.ts` proxy (token-gated) + the song-input UX; swap the UI from fixture to live.
7. **Phase 5 - gate + verify + ship:** enable Vercel Pro Password Protection on production, deploy, verify live behind the gate. Update the plan docs.
8. Run `/security-audit` on `api/analyze.ts` + the VPS exposure before finishing.

## Constraints

- One branch: `feat/play-along`, off `main`. No remote; commit locally; deploys are manual snapshots to the Vercel project `m4cd4r4s-projects/alight`.
- Keep Alight lean: minimal deps. A small LRC parser is hand-rolled (no library needed). `tonal` is already present.
- Resource-limit the ChordMini container (`--memory`, `--cpus`) so it cannot destabilise the VPS's production services (chlann, donnacha, etc.). Tear it down cleanly if abandoning.
- British English. No em-dashes, en-dashes, or ellipsis characters in copy or comments.

## Out-of-scope follow-ups (capture, don't build)

Append anything beyond scope to [docs/CLAUDE-TODO.md](../CLAUDE-TODO.md). Do not fix inline.

## Why this brief is structured this way

The riskiest part is the external ML backend, so Phases 1-2 build the visible play-along feature against a sample fixture first (zero infra risk, fast payoff), and only then commit to the heavy self-host. The "do not reskin ChordMini" decision is locked because a thorough audit proved its piano view solves a different problem on an incompatible stack; reskinning would mean inheriting 101k LOC and still rebuilding Alight's core view. Lyrics are gated because they are copyrighted and a public URL serving them is no longer personal use.
