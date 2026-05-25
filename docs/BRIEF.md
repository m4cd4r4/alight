# Project Brief - Alight

> Status: v0.1 - DRAFT, NOT LOCKED. Decisions from planning Rounds 1-4 captured. Open questions remain (see end). No code until this is locked.
> Last updated: 2026-05-25

## One-liner

Type a song title, the app finds its chords, and shows a dead-simple illustration of two mini piano keyboards (left hand + right hand) lighting up exactly which keys to press for each chord as you click through the song.

## Target user

A hobbyist piano player who cannot read musical notation well and just wants "which keys do I press" guidance. Not a music-theory student. The output must be immediately playable and calm to look at, never a notation or theory lesson.

## Audience and what it unlocks

**Personal tool, one user (me).** This is the most important framing decision:
- Legal exposure is near zero, so fetching chords by title via scraping Ultimate Guitar is acceptable for personal use.
- No auth, no accounts, no monetization, no commercial polish required.
- Still want a clean name and a pleasant UI because I will use it often.

## Locked decisions (Rounds 1-4)

| Area | Decision |
|------|----------|
| Audience | Personal tool, just me |
| Chord source | Auto-fetch by song title (primary) + paste/import chord sheet (fallback, mandatory) |
| Platform | Web app in the browser (React + TypeScript) |
| Hosting | Deploy static app + serverless proxy to Vercel (free). Bookmark a URL, nothing to start locally. |
| Song movement | Click-through: tap Next to advance one chord at a time |
| Song organisation | Both a sectioned view (Verse/Chorus/etc.) and a flat chord-sequence view, toggleable |
| Transposition | Auto-correct guitar capo to true piano pitch + manual transpose buttons to shift the whole song to an easier key |
| Persistence | Saved songbook on device (survives UG outages, works offline) + export/import to a file for backup |
| Keyboard layout | Two mini keyboards, one labelled Left Hand and one Right Hand |
| Key labels | Colour the lit keys + show note name (C, E, G) + show finger number (1-5), with a toggle to hide fingering |
| Chord richness | Simple by default (reduce to triad), with a toggle to reveal the full voicing (7ths/extensions) |
| Left hand | Independent single-note / octave toggle, separate from the richness toggle |
| Audio | Yes - realistic sampled piano (smplr). Land on or press a chord, hear those exact notes. |
| Song search | Auto-pick the best-rated UG version; one-tap switch to reveal alternates if it's wrong |
| Next-chord preview | Ghost the upcoming chord as dimmed keys so hands can pre-position |
| Hand differentiation | Colour AND a shape marker (dot vs ring) - never rely on colour alone |
| Inversions | Label chord + inversion fully (e.g. "C/E, 1st inversion"). User wants the theory info surfaced on top of the simple keys. |
| Failure handling | Skip unparseable chords (show greyed with '?'), keep playing; on full fetch failure drop straight to the paste box |
| Octaves shown | PROVISIONAL (my rec on "advise me"): fixed registers, LH ~C2-C3, RH ~C4-C5, with an overflow guard that expands a keyboard one octave only if a voicing exceeds the window. Finalise after voicing-engine range is known. |
| Tempo aids | BPM display + optional metronome click; chords still advance manually |
| Export | Printable one-page per-song chord sheet (PDF, with chord names + small key diagrams) + single-chord PNG export |
| Advance controls | Spacebar / right-arrow = next, left-arrow = back, plus large touch Back/Next buttons. Foot-pedal (Page Up/Down) friendly as a later add. |
| Tempo source | Tap-tempo button + manual BPM entry, saved per song. No auto-detect (UG tempo unreliable). |
| First run | Preload one legally-clean public-domain demo song so the app is alive and self-explanatory on first open |
| Repeats | Collapse repeats with an 'xN' counter; tap a section to expand its full passes |

## Hard design principle (from Round 2)

**WYSIWYG: what is lit is exactly what you press.** No hidden notes, no faked reductions in the rendering. If the active voicing has 4 keys, show 4; if 3, show 3. The "simple/full" toggle changes the voicing itself, not the honesty of the display.

## Architecture

- **Frontend:** React + TypeScript, static site on Vercel.
- **Fetch proxy:** ~40-line Vercel serverless function. Takes a title, scrapes Ultimate Guitar's embedded JSON (`div.js-store[data-content]` -> `store.page.data.tab` / `tab_view`), returns clean JSON + CORS headers. Browser cannot scrape UG directly (CORS + Cloudflare + User-Agent), so the server hop is required. The same code can run as a local Node proxy fallback.
- **Parser:** one parser serves BOTH auto-fetch and paste. UG content is the same `[ch]`/`[tab]` format in both cases.
- **Chord math:** tonal.js parses chord symbols to notes + MIDI, and exposes the slash-chord bass note separately. Wrap parsing in try/catch and skip unparseable tokens.
- **Voicing engine (the quality differentiator):** left hand = root or root-octave (per toggle), or the slash bass when present. Right hand = the chord tones, with the inversion chosen by a greedy nearest-voicing pass so the hand barely moves chord-to-chord (seed first chord in root position near middle C, then minimise semitone movement). ~30 lines. Reference: Tymoczko, "The Geometry of Musical Chords" (Science, 2006) for the formal version; greedy is enough for v1.
- **Keyboard render:** hand-rolled SVG (~100 lines). Off-the-shelf piano libs are unmaintained or built for playing, not chord diagrams. Hand-roll gives full control over two-colour hands + labels.
- **Audio:** smplr (maintained successor to soundfont-player), realistic piano samples.

## Data-cleaning checklist (from fetch research)

- Strip `[tab]`/`[/tab]`, decode HTML entities, extract chords from `[ch]...[/ch]`.
- Split into sections on `[Verse]`/`[Chorus]`/`[Intro]`/`[Bridge]` markers; expand `x4`/`(2x)` repeats heuristically.
- **Transpose every chord up by `meta.capo` semitones** (critical for piano - a guitarist's capo-2 "G" sounds as A).
- Key signature is often missing - infer from first/last chord or let me set it.
- Pick the best UG version by rating + votes; exclude "Pro"/"Official" (binary Guitar Pro, no text).
- Filter `N.C.`/`NC` (no chord); handle European `H` = B; survive slash chords, add9, sus, dim/aug, m7b5.

## Reliability and risk

- Auto-fetch succeeds ~80-90% when working, but UG changes break it for multiple days a few times a year. **Paste fallback is core, not optional.** The saved songbook means previously fetched songs keep working through outages.
- Legal: personal use only; show chords/keys only, never lyrics. Chord progressions themselves are largely uncopyrightable; lyrics are not.

## Tech stack (proposed)

React + TypeScript, Vite, Vercel (static + serverless function), tonal.js (chord math + voicing/voice-leading), smplr (audio), hand-rolled SVG keyboard. All MIT, all currently maintained.

## Out of scope for v1 (candidates)

- Synced-to-audio playback (chosen movement is click-through).
- Multiple instruments, MIDI keyboard input, recording.
- Accounts, sharing, multi-user, monetization.
- Melody / full sheet music / Synthesia falling notes.

## Competitive context

No existing product does "any song -> simple both-hands piano key illustration." Chordify is closest but shows one generic shape with no hand split and is guitar-first. Learning apps (flowkey, La Touche, Pianu) split hands but only for curated, paywalled songs with full note streams. The both-hands simple-voicing-for-any-song combination is the gap.

## Open questions for upcoming rounds

- **Final name** - DECIDED: **Alight** (chosen via `/name-forge`, 2026-05-25). Double meaning: keys *alight* (lit) + hands *alight* (land). Scored 26/30 (orig 9 / fluency 8 / surprise 9).
- **Visual aesthetic** - DECIDED: "Luxury Quiet" direction (extreme whitespace, refined thin type, muted tones, calm/focused so the keyboards are the hero). Theme: both light + dark, LIGHT primary.
- **Design approach** - UI generated via claude.ai/design from a brand seed crafted by `/claude-design` (cold-start mode). Seed saved at `design/claude-design-seed.md`. Paste into Claude Design -> Design Systems -> Additional Note. Not hand-built from design-brief menus.
- Minor build-time settings (decide during build, low stakes): sharps-vs-flats note display per key; whether toggle states persist globally or per-song; setlist/ordering of saved songs.

## Functional spec status

Rounds 1-7 complete. All functional, data, and interaction decisions are locked (octave register provisional pending the voicing engine). Remaining before full lock: NAME + AESTHETIC only.

## Research sources

Captured during planning (competitors, chord-data legal/sourcing, libraries, voicing, fetch mechanics). Full agent reports available in session history; key verified source: kmille/freetar (UG scrape mechanism, maintained 2026-05).
