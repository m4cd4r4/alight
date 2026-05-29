# Spec - Saved songbook (Wave 5)

Status: spec'd, not materialised. Owner worktree slug: `saved-songbook`.

Persist loaded songs so Alight becomes a tool you return to, not a single-session
scratchpad. Storage is a **Postgres database on the Donnacha VPS** (decided with
Macdara: "we can host a database on the VPS"), fronted by a token-gated service,
reached from the app through a Vercel serverless proxy - the exact shape already
proven by the ChordMini analyze path.

## Goal

Save the current song (chords, metadata, and the expensive analysis timeline if
present), see a list of saved songs, reopen one in one tap, and delete. Reopening
a saved song replays stored data and touches neither Ultimate Guitar nor
ChordMini - so saved songs survive a UG outage or a failed re-analysis, which is
the BRIEF's stated reason for a songbook.

## Scope

In:
- **Save** the current `{ song, timeline }` (App's `Loaded` unit) to the VPS.
- **List** saved songs (lightweight rows: id, title, artist, source, savedAt).
- **Open** a saved song -> fetch full record -> `onLoad(song, timeline)`.
- **Delete** a saved song.
- **Export** the whole songbook to a JSON file; **import** from that file.
- Same single-user gate as the rest of the app (`x-alight-gate`); no per-user
  accounts.

Out (later):
- Multi-user / sharing (schema leaves room; see Open decisions).
- Folders, tags, search, reordering.
- Edit-in-place of stored chords (re-save from Play instead).
- Offline IndexedDB mirror (VPS is the source of truth; add a read cache later
  if outage resilience of the *songbook service itself* becomes a need).

## What gets stored

The unit is App's `Loaded` plus light metadata. `Song` is small; `Timeline` (the
analysis) is the expensive, worth-keeping part.

```ts
interface SavedSong {
  id: string;            // uuid from the server
  title: string;
  artist: string;
  capoNote: string;
  chords: string[];      // Song.chords
  timeline: Timeline | null;
  source: "paste" | "ug" | "analyze" | "demo";
  createdAt: string;     // ISO
}
```

Transpose/voicing are *view* settings, not stored with the song.

## Architecture - three hops, no raw DB on the internet

```
browser  --x-alight-gate-->  Vercel /api/songbook  --Bearer SONGBOOK_TOKEN-->  VPS songbook service  -->  Postgres (localhost only)
```

This mirrors `api/analyze.ts` -> `chordmini.donnacha.app` exactly, and satisfies
the data-privacy rule (never expose a DB to the public internet; auth in front;
self-hosted). Postgres binds to `127.0.0.1`; the only public surface is the
token-gated service behind nginx + TLS. Vercel egress IPs rotate, so we do NOT
firewall-allowlist Vercel to a raw Postgres port - the service-in-front pattern
sidesteps that entirely.

### VPS service

A small REST service (`deploy/songbook/`), same operational shape as
`deploy/chordmini/`:
- Bound to `127.0.0.1:<port>`, `--restart unless-stopped`, resource-limited.
- nginx at `https://songbook.donnacha.app` (new Hostinger A record + Let's
  Encrypt cert), bearer-token gated + rate-limited.
- Token in `/opt/.../.alight_songbook_token`; mirrored to Vercel env
  `SONGBOOK_TOKEN` (+ `SONGBOOK_URL`).
- Stack: FastAPI + asyncpg is the lightest fit for Macdara's stack (Python
  backends = FastAPI per global prefs). A tiny Node service is equally fine if we
  want one less runtime on the box.

### Database

Postgres already runs on the VPS for the Brain API. Cheapest correct option: a
**dedicated `alight` database** (or schema) in that instance with its own role -
NOT a table inside the Brain API's database. Localhost-only.

ASK FIRST before touching the production Postgres instance (global rule:
production databases need confirmation). A dedicated DB + role in the same
cluster is low-risk; a separate Postgres container is the more isolated
alternative if preferred.

```sql
create table songs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  artist      text not null default '',
  capo_note   text not null default '',
  chords      jsonb not null,            -- string[]
  timeline    jsonb,                     -- Timeline | null
  source      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- single-user: no owner column. If multi-user lands, add owner_id + RLS.
```

`schema.sql` lives in `deploy/songbook/`.

### Vercel proxy - `api/songbook.ts`

Gate with `x-alight-gate` (copy the check from `api/analyze.ts`), then proxy to
`SONGBOOK_URL` with `Authorization: Bearer SONGBOOK_TOKEN`. Token never reaches
the client. `vercel.json` already pins `syd1`.

| Method | Path | Body / query | Returns |
|--------|------|--------------|---------|
| GET | `/api/songbook` | - | `SavedSong[]` minus `chords`/`timeline` (list rows) |
| GET | `/api/songbook?id=` | - | full `SavedSong` |
| POST | `/api/songbook` | `{ song, timeline, source }` | `{ id }` |
| DELETE | `/api/songbook?id=` | - | `{ ok: true }` |

Validate/cap body size (timelines can be large); reject unparseable JSON; never
reflect raw upstream errors (same discipline as the other two functions).

## Frontend / integration seams

- `src/songbook/api.ts` - client wrapper, mirrors `getChords()` in `LoadView`;
  attaches the gate header from `gate.ts`. Typed results, graceful network
  fallback (songbook down -> the rest of the app still works).
- **Save**: a "Save to songbook" action in `PlayView`'s topbar (next to the
  theme toggle). Saves the current `song` + `timeline`. Show saved/failed
  feedback; v1 allows duplicates (no dedup) and just confirms.
- **Songbook view/section**: re-add the songbook icon the `LoadView` TopBar
  comment reserves (`{/* Songbook / Settings icons land with their features */}`).
  Either a third column/section in `LoadView` or a small routed view off App's
  state (App currently switches Load <-> Play via `loaded`; a `view` enum or a
  `songbook` boolean is the minimal extension). Each row: open (-> `onLoad`) and
  delete.
- **Export/import**: a button in the songbook view. Export = GET all + download
  JSON. Import = read file + POST each (or a bulk endpoint).

App stays the owner of `loaded`; the songbook only ever calls the existing
`onLoad(song, timeline)` to hand a song to Play - no new coupling to the engine.

## Files touched (output paths - reserved for this worktree)

- `api/songbook.ts` (new Vercel proxy)
- `deploy/songbook/**` (service, Dockerfile/systemd, `schema.sql`,
  `nginx-songbook.conf`, `run.sh`, `endpoint_test.sh`) - mirrors
  `deploy/chordmini/`
- `src/songbook/api.ts` (new client)
- `src/components/Songbook.tsx` (new view/section) + a save control in
  `src/components/PlayView.tsx`
- `src/components/LoadView.tsx` (entry point to the songbook) + `src/App.tsx`
  (view switch, minimal)
- `src/styles/load.css` (songbook list styling)
- `docs/specs/saved-songbook.md` (this file -> mark materialised)
- VPS (not in repo): `alight` Postgres DB + role; Hostinger A record
  `songbook.donnacha.app` + cert; Vercel env `SONGBOOK_URL`, `SONGBOOK_TOKEN`

## Security / privacy

- Songs + timelines are personal; timelines embed copyrighted synced lyrics
  (same class as the analyze path). The songbook is gated, the service is
  token-protected, Postgres is localhost-only. Never expose publicly, never
  distribute - identical posture to the Wave 3 lyrics decision.
- Reuse the existing app gate. The known residual-risk note about the shared
  `alight2026` gate secret (docs/CLAUDE-TODO.md) applies here too; setting a
  distinct `ALIGHT_PASSWORD` hardens analyze and songbook together.

## Open decisions (resolve at build time)

- DB placement: dedicated `alight` database in the existing cluster (lean) vs a
  separate Postgres container (isolated). Confirm with Macdara before touching
  the production instance.
- Dedup on save (same title+artist+source) vs allow duplicates. v1: allow.
- Service runtime: FastAPI (matches global prefs) vs tiny Node (one less runtime
  on the box).
- Subdomain `songbook.donnacha.app` vs a path on an existing host.

## Verification

- `deploy/songbook/endpoint_test.sh` - create, list, fetch, delete round-trip
  against the service (token in hand), like the chordmini endpoint test.
- Pure-logic test for `src/songbook/api.ts` serialization (Song/Timeline round
  trips through JSON unchanged).
- End-to-end on production: gate -> load a song -> save -> reload page -> open
  from songbook -> identical Play view, including a stored timeline, with UG and
  ChordMini untouched (pull the network tab to confirm no UG/ChordMini calls on
  reopen).
- `/design-review` for the songbook view at the 4 breakpoints, light + dark.

## Effort

Medium. One worktree, but it spans frontend + a new Vercel function + a new VPS
service + DB - more moving parts than audio. The DB-on-VPS step needs Macdara's
go-ahead before provisioning. Independent of and parallelisable with the audio
worktree (file-disjoint except a trivial App.tsx view-switch touch).
