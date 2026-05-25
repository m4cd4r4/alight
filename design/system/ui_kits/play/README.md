# Play view

The hero surface. Two mini keyboards (left + right), the current chord with its inversion label, a hushed preview of the next chord, transport controls, and a quiet row of secondary controls along the bottom.

## Files

- `index.html` — entry point. Loads React, Babel, the foundation CSS, and renders `<PlayApp />`.
- `play.css` — layout. Top bar, chord row, keyboards row, transport row, footer.
- `song-data.js` — demo song progression. Notes are written as `LetterOctave`; `PCH_pretty()` swaps ASCII `#`/`b` for the real Unicode glyphs.
- `Keyboard.jsx` — a single keyboard. Accepts `hand`, `startNote`/`endNote` (or `startOctave`/`endOctave`), `nowNotes`, `nextNotes`, `size`, `showFingering`. Renders white and black keys, places hand markers, fades between states with `--dur-chord`.
- `ChordLabel.jsx` — the "now" chord display.
- `Transport.jsx` — Back, Play/Pause, Next. Spacebar steps forward; left/right arrows also work.
- `Controls.jsx` — `<Segmented>`, `<ToggleSwitch>`, `<Tempo>`, `<Transpose>`.
- `PlayApp.jsx` — root. Manages state (current step, playing flag, voicing, layout, fingering, metronome, BPM, transpose, theme).

## Layout principles

- Asymmetric. Chord label anchors hard-left. Capo note + next-chord preview anchor hard-right.
- Generous padding around the keyboards.
- Transport sits centred below the keyboards (4th in the contrast hierarchy — primary control, but never overpowering the keys themselves).
- Secondary controls sit at the very bottom, separated by a hairline, and read as the quietest line on the screen.

## Interactions

- Spacebar / right arrow / `Next` button → advance one chord.
- Left arrow / `Back` button → go back one chord.
- Play → auto-advance at the current BPM (one chord per 4 beats).
- Tap → records tempo from button taps and updates BPM.
- Theme icon → toggles `[data-theme="dark"]` on `<html>`.

## What is mocked

This is a UI kit, not production code. Audio playback is not wired; the metronome toggle and "Click" switch are visual only. Transpose does not actually transpose the notes shown — it only updates the display label. The chord progression is hard-coded in `song-data.js`. All of this is intentional: the kit demonstrates the visual language and interaction surface, not the music engine.
