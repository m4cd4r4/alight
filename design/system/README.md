# Alight — Design System

> A calm, single-purpose practice surface for a hobbyist pianist who cannot read musical notation. Open it at the piano, type a song title, see exactly which keys each hand presses.

This system is a **cold-start brand**. There is no existing codebase, Figma file, or marketing site to reference. The brief locked the mood and non-negotiables; this document records the specific choices made within that brief, so future work stays coherent.

---

## Index

| Path | What it is |
|---|---|
| `colors_and_type.css` | All tokens. OKLCH colour, type scale, spacing, corners, motion. Light + dark themes. |
| `README.md` | This file. Voice, visual foundations, iconography. |
| `SKILL.md` | Agent-readable entry point for Claude Code / skill loaders. |
| `preview/` | Card specimens shown in the Design System tab. |
| `ui_kits/play/` | Play view — the hero. Light and dark. |
| `ui_kits/load/` | Load-a-song view (search + paste fallback). |
| `ui_kits/songbook/` | Saved-songs library. |
| `ui_kits/print/` | Printable one-page chord sheet. |
| `assets/` | Logo mark, icon set, fonts. |
| `fonts/` | Self-host targets. Currently loaded via Google CDN. |

---

## Positioning

Voice: **plain, quiet, instructive**. State facts, never hype. The product is an instrument, not a course.

- Yes: "C major. Left hand: C. Right hand: C E G." / "Capo corrected. These are the real piano keys." / "Auto-fetch is down. Paste the chords to keep playing."
- No: "Unlock your musical journey." / "AI-powered chord magic." / "Master any song in minutes."

Feel anchor: **a Steinway showroom an hour before opening.** Hushed, full of light, every object placed with intent, nothing shouting.

---

## Non-negotiables (identity, not style)

1. The keyboard diagram is **literal and WYSIWYG**. A highlighted key means "press exactly this key." Highlighted keys are unmistakable from unlit ones at a glance.
2. Left and right hand are distinguishable **without relying on colour alone**: colour + shape marker (filled square = left, filled triangle pointing down = right). Survives colour-blindness and greyscale.
3. Every highlighted key carries a **note name and finger number**, legible at arm's length while seated.
4. The chord being played **now** dominates. The next-chord preview reads as clearly upcoming and subordinate.
5. Calm and uncluttered: the two keyboards are the hero of every play screen.
6. Both light and dark themes. **Light is primary.**
7. The full chord-and-inversion label (e.g. "C/E, 1st inversion") is always present and legible, but subordinate to the keys themselves.

---

## Content fundamentals

**Tone.** Plain, quiet, instructive. The product never hypes itself, never gamifies, never coaches. It states facts about which keys to press.

**Casing.** Sentence case for everything. No title case. No all-caps except for the small-label caps style used on micro-labels like `INVERSION`, `FINGERING`, `TEMPO`.

**Pronouns.** Avoid "you" where the product is just narrating ("Left hand: C." not "Your left hand plays C."). Use "you" sparingly, only when addressing a choice the user is making ("Paste the chords to keep playing.").

**Punctuation.**
- No em-dashes, en-dashes, or ellipsis characters. Use hyphens or rewrite.
- Period at end of standalone status lines.
- No exclamation marks. Anywhere. Ever.

**Numbers and notation.**
- Note names use a single capital letter plus a sharp or flat glyph: `C`, `F♯`, `B♭`. Use the real Unicode glyphs (U+266F, U+266D), not the ASCII `#` or `b`.
- Chord names follow the same: `C`, `Cm`, `Cmaj7`, `F♯m7`, `C/E`.
- Inversions are written out: `1st inversion`, `2nd inversion`, never abbreviated.
- Finger numbers are 1–5 (1 = thumb).

**Voice examples by surface.**

| Surface | Example copy |
|---|---|
| Play, current chord | `C major` / `1st inversion` |
| Play, hand label | `Left hand` / `Right hand` |
| Play, hand voicing | `C` (left) / `C  E  G` (right) |
| Load, empty state | `Type a song title. Or paste a chord sheet below.` |
| Load, no result | `No match. Try a different title, or paste the chords.` |
| Load, fetch down | `Auto-fetch is down. Paste the chords to keep playing.` |
| Songbook, empty | `Nothing saved yet. Songs you load are kept here.` |
| Transpose | `Transposed up 2 semitones. Real keys shown.` |
| Capo | `Capo corrected. These are the real piano keys.` |
| Print | `One page. Greyscale-safe. Music-stand size.` |

**Emoji and special chars.** No emoji. Unicode music glyphs only: `♯`, `♭`, `♩`, `𝄞` (used decoratively at most once, on the print sheet).

---

## Visual foundations

### Colour
Expressed in OKLCH for perceptual uniformity and smooth, banding-free gradients. Described by **role**, not by hue name, because both themes share roles.

- **Surfaces** read as quiet and spacious — warm ivory in light, deep blue-black in dark.
- **Hand identities** are anchored by a 23-point lightness gap (L=45 vs L=68 in light theme), so they remain distinguishable in greyscale. Hue choice is intentional: cool slate-teal for the left hand reads as gravity / bass; warm ember for the right hand reads as melody / treble. Both are low chroma (≤ 0.12), never candy.
- **Now vs next** is expressed as full opacity vs ~32% opacity, plus marker fill vs marker outline only. The hierarchy is unambiguous.
- **Pulse** is a single faint warm gold, used only for the metronome and the "something is playing" indicator.

### Typography
Two families:

- **Spectral** (display): a contemporary high-contrast serif with quiet gravity and a modern-architectural feel. Used for chord names, section headings, the wordmark. Weights 300-600.
- **Atkinson Hyperlegible** (text): designed by the Braille Institute for low-vision readability. Open apertures, distinctive `0`/`O` and `I`/`l`/`1`. Used for note names, finger numbers, song lists, all UI labels. Crisp at small sizes — passes the "read at arm's length from the piano bench" test.

Both are loaded from the Google Fonts CDN in `colors_and_type.css`. To self-host, drop WOFF2 files into `fonts/` and replace the `@import` with `@font-face`.

### Spacing
Strict 4px grid: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128.

The play view uses the larger end of the scale aggressively — the keyboards get 64–96px of breathing room above and below. Negative space is the brand.

### Backgrounds
Flat. No gradients, no textures, no illustrations, no full-bleed photography. The surface is paper-quiet. The exception: a single, almost-imperceptible 1px hairline can be used to anchor a section without introducing weight.

### Corners
Mixed, mostly sharp.
- Piano keys: **0px** (they are rectangles).
- Cards, panels, buttons, inputs: **2px**.
- Pill tags (e.g. inversion label): **3px**.
- Circular markers only: full radius.

No 8px / 12px / 16px rounding anywhere. The soft-corner SaaS look is explicitly avoided.

### Elevation
Bordered, not shadowed. A 1px hairline (`--hairline`) does the work of separation. The one shadow available (`--shadow-soft`) is reserved for genuinely floating UI — a popover, a toast. Keys carry a `--shadow-key` inset, which is the only inset shadow in the system.

### Hover, press, focus
- **Hover**: lift `--ink-secondary` to `--ink-primary`, or lift surface from `--surface-raised` to `--surface-base`. Never use a gradient, glow, or scale.
- **Press**: drop one step in lightness (e.g. surface → sunken). Optional 1% scale-down on the key itself (`scale(0.99)`), 80ms.
- **Focus**: 2px outline in `--ink-primary`, offset 2px. Always visible, always the same. Never a glow.

### Motion
Restrained. The system has four named durations:
- `--dur-instant` (80ms) for hover.
- `--dur-toggle` (180ms) for toggle and button states.
- `--dur-chord` (240ms) for chord-to-chord transitions.
- `--dur-pulse` (800ms) for the metronome tick.

Easing is `--ease-out` (cubic-bezier(0.22, 0.61, 0.36, 1)) by default. Chord transitions **crossfade**; they never slide. The metronome pulses opacity, not scale.

All motion respects `prefers-reduced-motion: reduce` — animations become instant, transitions vanish.

### Layout rhythm
Asymmetric. The play screen anchors the two keyboards horizontally and lets all chrome — chord label, transport, secondary controls — float at the edges. Avoid the centred, symmetric dashboard. Generous negative space frames the instrument.

### Transparency and blur
Used sparingly. The "next chord" preview uses 32% opacity. No backdrop-filter blur, no glassmorphism.

### Hand markers (the shape system)
Because the hand distinction must survive colour-blindness and greyscale, every hand-related element carries a **shape marker** alongside the colour:

- **Left hand**: filled square, 8px, positioned top-centre of the key.
- **Right hand**: filled triangle pointing down, 8px wide / 7px tall, positioned top-centre of the key.

The shape system extends to labels in the UI: a hand-left badge is a square chip, a hand-right badge is a triangle-tipped chip. Documented in `preview/hand-markers.html`.

---

## Iconography

**No third-party icon set is used unmodified.** The brief explicitly forbids the default Lucide / Heroicons look. The system ships a small **custom icon set** drawn for this product.

- **Stroke**: 1.25px, currentColor.
- **Caps**: rounded.
- **Corners**: sharp.
- **Grid**: 24×24, optical centring over geometric.
- **Style**: thin, precise, monoline. No filled icons except for the hand markers (which are not icons, they are markers).

The shipped set is small on purpose. The product only needs:

`transport.play`, `transport.pause`, `transport.prev`, `transport.next`,
`metronome`, `tempo.tap`,
`search`, `paste`, `print`, `library`, `settings`,
`theme.light`, `theme.dark`, `arrow.up`, `arrow.down`,
`hand.left.square`, `hand.right.triangle`.

All icons live in `assets/icons/` as inline-ready SVG. The `assets/icons.html` page indexes them.

**Music glyphs** use real Unicode (`♯`, `♭`, `♩`, `𝄞`). These are typography, not iconography, and inherit the current font.

**Emoji.** Not used.

**Substitutions.** None currently. If a future surface needs an icon not in the set, draw it to match (1.25px stroke, 24×24, monoline). Do not drop in Lucide.

---

## Themes

Both themes are first-class. Light is primary. Toggling sets `[data-theme="dark"]` on `<html>` or `<body>`. All tokens swap; no component code changes.

The hand hues stay anchored to the same OKLCH hue angles (215° and 55°) in both themes — only lightness and chroma shift to maintain contrast against the surface.

---

## Open questions / iteration asks

- The **name is Alight** (chosen via `/name-forge`, 2026-05-25), set into `assets/wordmark.svg` and `assets/mark.svg`. The mark glyph is still the generic placeholder icon - a bespoke Alight mark is a future iteration.
- **Fonts** are loaded from Google CDN. Self-hosted WOFF2 is preferred for production; the `fonts/` folder is empty pending that decision.
- **Hand colours** are verified. A Machado-2009 sim (`design/cvd-check.py`) confirms left/right stay distinguishable under protanopia/deuteranopia/tritanopia (ΔE 53-81, vs a ~25 "obvious" bar), backed by the square/triangle shape markers. A user-overridable hand-colour setting is still sketched in Settings.

