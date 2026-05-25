# Alight - Scaffold + Play View Brief

Open this in a **fresh Claude Code session** in `I:/Scratch/piano-chords-scaffold-play-view/`. Do not carry context from the planning session.

## First action: read before any code

There is no git remote yet. This is the first worktree off local `main`, so there is no rebase to do. Confirm you are on the right branch (`git branch --show-current` should print `feat/scaffold-play-view`), then read these IN FULL before writing any code:

1. [docs/BRIEF.md](../BRIEF.md) - the locked functional brief (the whole product)
2. [design/DESIGN.md](../../design/DESIGN.md) - the token system of record
3. [design/system/colors_and_type.css](../../design/system/colors_and_type.css) - the actual OKLCH tokens + type to port
4. [design/system/piano.css](../../design/system/piano.css) - keyboard, chord-label, transport, toggle primitives
5. [design/system/ui_kits/play/](../../design/system/ui_kits/play/) - the reference demo (PlayApp.jsx, Keyboard.jsx, ChordLabel.jsx, Transport.jsx, song-data.js) to port from

If anything in this brief contradicts those files, **the files win**. The aesthetic is LOCKED (Luxury Quiet, cool showroom white, Spectral + Atkinson Hyperlegible). Do not re-open it and do not run a design skill.

## The problem

Alight is fully planned and designed but has zero application code. The kit under `design/system/` is a static React-via-Babel demo, not a real app. This worktree turns the locked brief + design into a running Vite + React + TypeScript app with the core Play view working on static sample data.

## What's in scope

- Scaffold Vite + React + TS at the repo root (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/`).
- Port the design tokens: bring `colors_and_type.css` and `piano.css` into the app styles unchanged (OKLCH tokens, light + dark themes, Spectral + Atkinson).
- Build the Play view as real TS components:
  - Two hand-rolled SVG keyboards (left + right) with lit keys showing note name + finger number, hands distinguished by colour AND shape marker (square = left, triangle = right).
  - Current chord + full inversion label (e.g. "C/E, 1st inversion").
  - Ghosted next-chord preview on the keys.
  - Transport: spacebar / right-arrow = next, left-arrow = back, plus on-screen Back/Next buttons.
  - Voicing toggle (Simple/Full), fingering on/off, theme toggle (light/dark).
- Chord engine: use `tonal` to parse chord symbols to notes (it exposes the slash-chord bass separately). Write a greedy nearest-inversion voicing function: left hand = root, or octave, or the slash bass; right hand = the triad with the inversion chosen to minimise semitone movement from the previous chord. See BRIEF.md "Voicing engine" section.
- Drive everything with static sample song data ported from `design/system/ui_kits/play/song-data.js` (e.g. Landslide). No fetching.

## Out of scope (do NOT build here - these are later worktrees)

- The Ultimate Guitar fetch serverless proxy and any network fetching.
- The paste-a-chord-sheet parser.
- The saved songbook (library / export / import).
- The printable one-page sheet.
- smplr / audio playback.
- The Load, Songbook, Settings, and Print views (port later).

Build clean seams so these slot in later, but do not implement them.

## What "good" looks like

- `npm install && npm run dev` serves a Play view that matches the kit screenshots ([play-light.png](../../design/system/screenshots/play-light.png), [play-dark-full.png](../../design/system/screenshots/play-dark-full.png)).
- Stepping with the spacebar advances chords; the keyboards relight correctly and the right hand barely moves between chords (voice leading works).
- Lit keys show correct note names + finger numbers; left and right are distinguishable in greyscale (colour + shape).
- Light theme is the cool showroom white; dark theme is the piano-lid dark; the toggle works.
- WYSIWYG honoured: what is lit is exactly what the voicing produces, no faked keys.
- `npm run build` type-checks clean; no console errors.

## Required deliverables

1. A short build plan / rationale before any code (component tree, where the voicing engine lives, how song data is shaped).
2. The scaffolded app + ported tokens + working Play view, scoped to the in-scope list only.
3. Verification: run the dev server and confirm in a browser against the screenshots (golden path: load the sample song, step through with the spacebar, toggle theme and Simple/Full). State clearly what was visually checked, do not just claim it works.
4. One logical change on `feat/scaffold-play-view`.

## Suggested workflow

1. Read the five source-of-truth files in full.
2. Write the build plan (no code yet).
3. Scaffold Vite + React + TS; get a blank page rendering.
4. Port tokens, then build the keyboard component, then the voicing engine, then wire the Play view + transport.
5. Verify in-browser against the screenshots; fix deltas.
6. Capture any out-of-scope problems in `docs/CLAUDE-TODO.md`, do not fix inline.

## Constraints

- One PR-sized change. Branch: `feat/scaffold-play-view`. No remote yet, so commit locally; the user will decide on a GitHub remote later.
- TypeScript strict. Minimal dependencies: react, react-dom, vite, typescript, tonal. No UI framework or component library. Keyboards are hand-rolled SVG.
- Do not run `/design-brief` or `/claude-design`. The design is locked.
- British English. No em-dashes, en-dashes, or ellipsis characters in copy or comments.

## Why this brief is structured this way

The planning session deliberately locked every product and design decision before any code, on the user's explicit instruction (no code until the brief is locked). This worktree's job is faithful execution of `docs/BRIEF.md`, not re-litigation. Pointing you at the real token files prevents drift from the locked aesthetic.
