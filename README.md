# Alight

Type a song, see two mini piano keyboards (left hand + right hand) light up
exactly which keys to press for each chord as you step through. A calm,
literal "which keys do I press" tool for hobbyist players.

This repo currently contains the **scaffold + Play view** built on static
sample data. See [docs/BRIEF.md](docs/BRIEF.md) for the full product and
[docs/CLAUDE-TODO.md](docs/CLAUDE-TODO.md) for what is deliberately not built yet.

## Run

```bash
npm install
npm run dev      # serves the Play view at http://localhost:5173
npm run build    # type-checks (tsc -b, strict) and builds to dist/
```

## What works

- The **Play view** on a static sample song (Landslide).
- Two keyboards (left `C2-E3`, right `F3-B4`) lighting the exact voiced keys,
  with note name + finger number, hands distinguished by colour AND shape
  (square = left, triangle = right).
- Current chord + full inversion label; next chord ghosted on the keys.
- Stepping with spacebar / right arrow / Next, back with left arrow / Back.
- Voicing toggle (Simple/Full), fingering on/off, light/dark theme.

## Architecture

```
src/
  components/   PlayView + Keyboard, HandMarker, ChordLabel, Transport, Controls
  music/        types, note helpers, and the voicing engine (pure, no React)
  data/         static sample songs (chord symbols, not pre-voiced notes)
  styles/       design tokens ported from design/system (colors_and_type, piano, play)
```

The **voicing engine** ([src/music/voicing.ts](src/music/voicing.ts)) is the
core. Given a progression of chord symbols it derives, per chord: the left-hand
bass, the right-hand chord tones (triad for Simple, full chord for Full), and
the inversion label. The right-hand octave placement is chosen by a greedy
nearest-voicing pass so the hand barely moves chord to chord. Chord parsing uses
[`tonal`](https://github.com/tonaljs/tonal). What the keyboards light is exactly
what the engine produces - no faked keys (WYSIWYG).

The design system of record lives in [design/](design/); the visual aesthetic is
locked (Luxury Quiet - cool showroom white, Spectral + Atkinson Hyperlegible).
