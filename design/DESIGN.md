# DESIGN.md - Alight

> System of record for the visual design. Generated via claude.ai/design (cold-start seed at `design/claude-design-seed.md`), then refined. Source kit: `design/system/`. v0.1, 2026-05-25.
> NOTE: not visually re-verified in a browser yet after the refinement pass.

## Aesthetic

Luxury Quiet - extreme whitespace, refined high-contrast serif, muted tones, the two keyboards are the hero. Light theme primary, dark theme ("closed piano lid") secondary.

## Refinements applied after the first Claude Design pass

1. Light surface changed from generic warm ivory to **cool showroom white**, unified onto a cool hue spine (~255) shared with the dark theme. (Fixed the "Claude Design generic" background.)
2. Display face switched from Newsreader to **Spectral** (more modern-architectural, less literary).
3. Finger numbers and note names enlarged for arm's-length legibility at a piano.
4. Monoline icon stroke 1.25px -> 1.5px.
5. Print chord grid 6-across -> 4-across with larger diagrams.

## Colour - light theme (OKLCH)

| Token | Value | Use |
|-------|-------|-----|
| surface-base | oklch(97.8% 0.004 255) | page background, cool paper |
| surface-raised | oklch(96.0% 0.005 255) | card, panel |
| surface-sunken | oklch(93.8% 0.006 255) | search field, recessed |
| surface-key-white | oklch(99.0% 0.003 255) | white piano key |
| surface-key-black | oklch(22.0% 0.012 255) | black piano key |
| hairline | oklch(88.0% 0.007 255) | 1px borders |
| hairline-strong | oklch(78.0% 0.009 255) | emphasised dividers |
| ink-primary | oklch(20.0% 0.014 255) | chord names, headings |
| ink-secondary | oklch(42.0% 0.011 255) | body, secondary labels |
| ink-tertiary | oklch(60.0% 0.009 255) | metadata, chrome |
| ink-ghost | oklch(75.0% 0.007 255) | next-chord preview |

## Colour - dark theme (OKLCH)

surface-base oklch(16% 0.010 260), raised oklch(20% 0.012 260), sunken oklch(13% 0.010 260), key-white oklch(92% 0.006 80), key-black oklch(8% 0.008 260). Ink primary oklch(96% 0.005 85). (Unchanged - already distinctive.)

## Hand identity (both themes)

- Left hand: slate-teal. Light oklch(45% 0.075 215); dark oklch(62% 0.090 215). Shape marker: square.
- Right hand: ember-amber. Light oklch(68% 0.115 55); dark oklch(78% 0.125 55). Shape marker: triangle.
- ~23-point lightness gap = greyscale-safe. Colour is never the only cue (shape marker always present).
- Now = full fill + filled marker. Next = soft fill + outline marker only, clearly subordinate.
- Pulse (metronome): faint warm gold oklch(78% 0.070 90) light / oklch(82% 0.075 90) dark.

## Typography

- Display: **Spectral** (300-600). Chord names, section headings, wordmark.
- Text/UI: **Atkinson Hyperlegible** (Braille Institute, high low-vision legibility). Note names, finger numbers, lists, all UI.
- Both SIL Open Font License. Loaded via Google CDN in `colors_and_type.css`; self-host WOFF2 into `fonts/` for production.
- Scale: display-xl clamp(56-84px), lg 44, md 32, sm 22; text lg 19, md 15, sm 13, xs 11.
- Keyboard labels (post-bump): note 15px / finger 13px (full), 14/12 (md), 12/11 (sm).

## Other tokens

- Spacing: 4px grid (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128).
- Corners: mostly sharp. radius-0 keys, radius-1 (2px) cards/buttons, radius-2 (3px) pills, radius-full markers only.
- Elevation: near-flat. One soft shadow for floating elements only.
- Motion: chord crossfade 240ms, toggle 180ms, metronome 800ms, hover 80ms. prefers-reduced-motion fully respected.
- Icons: bespoke 24x24 monoline, 1.5px stroke, rounded caps, sharp corners. No Lucide/Heroicons.

## Non-negotiables (all 7 survived the first pass)

1. Keyboard is literal/WYSIWYG - lit = press exactly this.
2. Hands distinguishable without colour (colour + shape).
3. Note name + finger number on every lit key, legible at arm's length.
4. Now dominates; next is clearly subordinate.
5. Calm, uncluttered, keyboards are the hero.
6. Both themes, light primary.
7. Full chord+inversion label present but subordinate to keys.

Contrast hierarchy (strongest first): lit keys > current chord label > next-chord ghost > transport > secondary controls > metadata.

## Follow-ups before build

- DONE - Re-verified the refined kit in a browser (cool surface, Spectral, larger finger numbers, 4-across print all confirmed 2026-05-25).
- DONE - Name "Alight" applied across kit + docs (wordmark.svg, mark.svg, all views).
- DONE - Colour-blindness sim (Machado 2009 sev-1.0, script `design/cvd-check.py`): hands stay distinguishable under protan/deutan/tritan, ΔE(L vs R) 53-81 (worst 52.8, well above the ~25 "obvious" bar); both hands ΔE 55-87 vs surface. Caveat: dark-theme lightness gap narrows to ~10 under protanopia, carried by hue/chroma + the shape markers. Optional belt-and-braces: lift dark-theme `--hand-right` lightness a few points.
- TODO - Self-host the Spectral + Atkinson fonts (currently Google CDN) for production.
- TODO - Finalise the provisional octave-register decision once the voicing engine exists.
