---
name: piano-chord-hands-design
description: Use this skill to generate well-branded interfaces and assets for Alight, a calm, single-purpose practice surface for pianists who cannot read musical notation. Contains essential design guidelines, OKLCH colour tokens, type stack, fonts, custom icon set, piano-keyboard primitives, and UI kit components.
user-invocable: true
---

Read the `README.md` file at the root of this skill first. It documents the brand's positioning, voice, non-negotiables, content fundamentals, visual foundations, and iconography. Then explore the other files in the system before producing anything.

Key files:

- `colors_and_type.css` — all design tokens. OKLCH colour, type scale, spacing, corners, motion. Light and dark themes via `[data-theme="dark"]`. Import this first into any new HTML you create.
- `piano.css` — keyboard primitives (`.pck-keyboard`, `.pck-key`, lit states, hand markers), chord label, transport, segmented controls, switches, hand badges, song row.
- `assets/icons.svg` — the custom 24×24 monoline icon set. 1.25px stroke. Use via `<svg><use href="assets/icons.svg#name"/></svg>` or copy inline.
- `assets/wordmark.svg`, `assets/mark.svg` — the working logo. Replace if `/name-forge` produces a final name.
- `ui_kits/` — the four product surfaces. `play/` is the hero and demonstrates the full token system in motion. `load/` shows the search + paste-fallback pattern. `songbook/` the list pattern. `print/` the greyscale-safe print sheet pattern.

**Non-negotiables — never violate.**

1. The keyboard diagram is literal and WYSIWYG. A highlighted key means "press exactly this key."
2. Left and right hand are distinguished by colour AND shape marker (square = left, downward triangle = right). Survives greyscale and colour-blindness.
3. Every highlighted key shows note name + finger number.
4. Current chord dominates. Next chord is hushed (~32% opacity, outline marker).
5. Calm and uncluttered. The keyboards are the hero of every play screen.
6. Light theme is primary. Dark theme is first-class.
7. The full chord-and-inversion label is always present.

**Voice — plain, quiet, instructive.** Never hype. No em-dashes, en-dashes, or ellipsis characters anywhere. No emoji. No exclamation marks. Sentence case for everything. See `README.md` § Content fundamentals for worked examples.

**Working scope.**

- If creating visual artifacts (slides, mocks, throwaway prototypes), import `colors_and_type.css` and `piano.css`, copy referenced assets out, and write a static HTML file.
- If working on production code, lift tokens and component recipes from these files; do not hand-roll new colour values, type sizes, or hand identities.
- If the user invokes this skill without other guidance, ask what they want to build, ask a few clarifying questions (which surface, light or dark, what content), then act as an expert designer who outputs HTML artifacts or production code as appropriate.

**When extending the system.**

- Stay in OKLCH. Match the existing chroma envelope (most tokens are ≤ 0.12).
- Stay with the two families (Spectral display, Atkinson Hyperlegible text). Do not introduce a third.
- New icons get drawn to match: 24×24, 1.5px stroke, monoline, rounded caps, sharp corners. Do not drop in Lucide or Heroicons.
- The corner language is mostly sharp. Resist 8 / 12 / 16 px rounded-rect SaaS conventions.
- Motion is restrained. 240ms ease-out crossfades for chord transitions. Never slide.
