# Printable chord sheet

A one-page, music-stand-sized layout. High contrast. Greyscale-safe — the page works in pure black and white because hand identity is conveyed by shape (square / downward triangle), not colour.

## Files

- `index.html` — static markup. No JS. A "Print this sheet" button calls `window.print()`.
- `print.css` — `@page { size: letter portrait; margin: 0 }` plus print-specific overrides under `@media print`.

## Anatomy (top to bottom)

1. **Header** — song title (display lg), artist, and a right-aligned meta block with Key / Tempo / Capo info.
2. **Chords used** — a strip of small cards, one per unique chord, each showing a mini keyboard with the highlighted keys and note names. Pure black on white. Hand markers are the only way to tell left from right; they are filled shapes.
3. **Progression by section** — `[Verse 1]`, `[Chorus]` etc, with chord names laid out in 4-bar rows above lyric lines. Beat marks render as small dots so the user can count.
4. **Hand markers legend** — a small reference at the bottom showing the square / triangle convention.
5. **Footer** — Alight wordline, then song · artist · key.

## Print behaviour

- The screen-only banner (back link + Print button) is hidden in print.
- The page itself goes edge-to-edge with a 0.5in inner padding.
- All colour is stripped — even the hand identities — because most home printers are monochrome and the brand explicitly chose shape as the second cue precisely for this case.
