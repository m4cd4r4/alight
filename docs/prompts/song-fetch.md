# Alight - Song Fetch (auto-by-title + paste) Brief

Open this in a **fresh Claude Code session** in `I:/Scratch/piano-chords-song-fetch/`. Do not carry context from the planning session.

## First action: read before any code

This is Wave 2, branched off `main` at `5951710` (Wave 1 scaffold + Play view is already merged). Local-only repo, no remote, so there is no rebase. Confirm branch (`git branch --show-current` -> `feat/song-fetch`), then read IN FULL:

1. [docs/BRIEF.md](../BRIEF.md) - especially the "Architecture", "Data-cleaning checklist", and "Reliability and risk" sections. This is the source of truth.
2. [docs/PROJECT-PLAN.md](../PROJECT-PLAN.md) - your scope + what is out of scope (Wave 3).
3. [src/music/types.ts](../../src/music/types.ts) and [src/data/songs.ts](../../src/data/songs.ts) - the exact `Song` shape the Play view consumes. Your parser MUST output this shape.
4. [src/components/PlayView.tsx](../../src/components/PlayView.tsx) and [src/App.tsx](../../src/App.tsx) - how a song is loaded and rendered today; you will wire a Load view in front of this.
5. [design/system/ui_kits/load/](../../design/system/ui_kits/load/) - the Load view design reference (title search, best-match row, "wrong version?" alternates, paste box). Port its look.
6. [docs/CLAUDE-TODO.md](../CLAUDE-TODO.md) - notes the scaffold session left.

If anything here contradicts those files, **the files win**. The aesthetic and the `Song` data shape are LOCKED. Do not run a design skill.

## The problem

Alight plays one hardcoded song. The goal is to choose any song: type a title and the app fetches its chords, with a paste-a-sheet fallback for when fetch fails or the song is not found. Per the brief, ONE parser serves both paths, and the paste fallback is mandatory, not optional.

## What's in scope

- **Serverless proxy** (`api/chords.ts`, Vercel function): GET with a `title` query. Search Ultimate Guitar, pick the best non-Pro version (highest rating x votes), fetch its page, extract the embedded JSON from `div.js-store[data-content]` (-> `store.page.data.tab` + `tab_view`), and return clean JSON: `{ artist, song, capo, tuning, content, versions[] }` plus permissive CORS headers. Use a browser User-Agent. UG sits behind Cloudflare and will sometimes 403 - return a clear error the UI can surface, do not crash.
- **Shared parser** (`src/music/parse.ts`): input = UG `wiki_tab.content` (the `[ch]...[/ch]` / `[tab]` / `[Section]` format) plus capo. Output = the `Song` shape from `src/music/types.ts`. Must: split into sections on `[Verse]`/`[Chorus]`/`[Intro]`/`[Bridge]`; expand `x4`/`(2x)` repeats; **transpose every chord up by `capo` semitones** (tonal is already a dependency); filter `N.C.`/`NC`; map European `H` to `B`; survive slash chords, add9, sus, dim, aug, m7b5; wrap per-token parsing in try/catch and skip junk.
- **Paste fallback**: a textarea that runs the SAME parser on pasted UG-format text. This is the resilience path and must feel first-class, not a failure state.
- **Load view** (`src/components/LoadView.tsx`): title input -> calls `/api/chords` -> shows the best match (song + artist) with a "wrong version?" control to reveal alternates -> loads the chosen song into the Play view. Includes the paste box. Port the look from the design kit's load view.
- **View switch** in `src/App.tsx`: Load <-> Play.

## Out of scope (do NOT build - Wave 3)

- Audio playback (smplr).
- Saved songbook / library / export-import.
- Printable chord sheet.
- Settings panel.

Leave clean seams, do not implement these.

## What "good" looks like

- Typing a known title (e.g. "Landslide") fetches real chords and the Play view steps through them.
- Pasting a UG chord sheet produces the same playable result via the same parser.
- Capo songs sound on the right piano keys (transposed by the capo amount).
- A failed or empty fetch drops cleanly to the paste box with a readable message, never a blank screen or crash.
- `npm run build` type-checks clean; the serverless function runs under `vercel dev`.

## Required deliverables

1. A short build plan / rationale before code (the proxy contract, the parser's input/output, the Load view states).
2. The serverless function + parser + paste + Load view + App wiring, scoped to the in-scope list.
3. A parser test against a real UG-format fixture (capture one sample `content` string with `[ch]`/`[tab]`/sections/a capo and assert the parsed `Song`). Put fixtures under `src/music/__fixtures__/`.
4. Verification: run `vercel dev`, fetch a real title, and confirm it plays; paste a sheet and confirm; state what you actually tested.
5. Update `docs/PROJECT-PLAN.md` (mark song-fetch merged) in your final commit. One branch: `feat/song-fetch`.

## Security (run `/security-audit` at the end)

The proxy is internet-reachable and parses untrusted upstream HTML/JSON. Before finishing: validate and cap the `title` input length; only fetch `ultimate-guitar.com` URLs (no open relay); set request timeouts; guard `JSON.parse` in try/catch; do not reflect raw upstream errors to the client. It is a personal tool, but a careless proxy is an abusable one.

## Suggested workflow

1. Read the six source-of-truth files.
2. Write the build plan (no code).
3. Build the parser first against a static fixture (pure function, easy to test), then the serverless proxy, then the Load view, then wire App.
4. Verify with `vercel dev` and a real fetch + a paste.
5. Run `/security-audit` on the proxy + parser. Fix findings.
6. Capture anything out of scope in `docs/CLAUDE-TODO.md`, do not fix inline.

## Constraints

- One branch: `feat/song-fetch`, off `main`. No remote yet; commit locally. Deploys are manual (the user redeploys snapshots to the existing Vercel project `alight`).
- TypeScript strict. Keep deps minimal: native `fetch` (Node 18+), `tonal` (already present) for transpose. A tiny HTML helper (`node-html-parser`) is acceptable only if regex + entity-decode for the `data-content` attribute proves fragile.
- Do not change the Play view's internals or the design tokens beyond what wiring requires.
- British English. No em-dashes, en-dashes, or ellipsis characters in copy or comments.

## Why this brief is structured this way

The product and data decisions are locked in `docs/BRIEF.md`; this worktree executes the riskiest external-dependency piece. Pointing you at the real `Song` type and the data-cleaning checklist prevents the parser from drifting into a shape the Play view cannot render, and the security section exists because a scraping proxy is the one place this personal tool touches the open internet.
