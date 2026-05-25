# Brand: Alight

> Mode: COLD START. Mood and non-negotiables are locked. Exact palette, type, corners, motion are left open for you to propose within the stated mood. Express distinctive choices over safe defaults.

## Positioning

A calm, single-purpose practice surface for one hobbyist pianist who cannot read musical notation. They open it at the piano, type a song title (or paste a chord sheet), and want one thing: to see exactly which keys each hand presses for each chord, then step through the song. Emotional state at use: relaxed, slightly impatient to start playing, easily put off by clutter or anything that feels like a lesson. The product is an instrument, not a course.

Voice: plain, quiet, instructive. State facts, never hype.
- Yes: "C major. Left hand: C. Right hand: C E G." / "Capo corrected - these are the real piano keys." / "Auto-fetch is down. Paste the chords to keep playing."
- No: "Unlock your musical journey." / "AI-powered chord magic." / "Master any song in minutes!" / any exclamation, any gamification, any theory lecture.

Feel anchor: a Steinway showroom an hour before opening. Hushed, full of light, every object placed with intent, nothing shouting.

## Non-negotiables (identity, not style - break these and it stops being itself)

1. The keyboard diagram is literal and WYSIWYG: a highlighted key means "press exactly this key." It is never decorative, never approximate. Highlighted keys must be unmistakable from the unlit ones at a glance.
2. Left hand and right hand must be instantly distinguishable WITHOUT relying on colour alone (colour plus a second cue such as a shape marker). The distinction must survive colour-blindness and greyscale printing.
3. Every highlighted key carries a note name and a finger number, both legible at arm's length while seated at a piano - this is read in quick glances, not studied up close.
4. The chord being played NOW must dominate. The "next chord" preview must read as clearly upcoming and subordinate, never confusable with the current chord.
5. Calm and uncluttered: the two keyboards are the hero of every play screen. Controls, labels, and chrome recede until wanted.
6. Equally usable in a bright room and a dim room. Both light and dark themes, light is primary.
7. The full chord-and-inversion label (e.g. "C/E, 1st inversion") is always present and legible, but subordinate to the keys themselves.

## Open for reinterpretation (propose with intent)

- **Colour palette** - express the ENTIRE palette in OKLCH. Describe by role, not by named colour: a surface that reads as quiet and spacious; one hand-identity hue and a second hand-identity hue that stay distinguishable in greyscale and to colour-blind eyes; a "this is now" emphasis vs a "this is coming" hush; a gentle "something is playing / metronome tick" pulse. Muted, low-chroma, never candy. Smooth, banding-free.
- **Typography** - two families max. One with quiet gravity for chord labels and headings; one with calm, highly readable discipline for note names, finger numbers, song lists, and controls. Note names and finger numbers must stay crisp at small sizes. Avoid the obvious agent defaults (see Forbidden).
- **Corner language** - sharp / soft / mixed, chosen with intent to support the hushed, refined mood.
- **Elevation and depth** - flat / layered / bordered, chosen with intent. Favour quiet separation over heavy shadow.
- **Motion** - still / restrained / expressive, chosen with intent. Chord-to-chord changes should feel smooth and reassuring, not flashy. Must fully respect prefers-reduced-motion.
- **Layout rhythm** - lead with generous, asymmetric negative space framing a clearly anchored instrument. Escape the centred, symmetric dashboard default; let the keyboards breathe.

## Explicit contrast hierarchy (required)

Order of visual dominance, strongest to weakest: (1) the highlighted keys on the two keyboards; (2) the current chord + inversion label; (3) the ghosted next-chord preview; (4) transport controls (Back / Next); (5) secondary controls (tempo, toggles, theme); (6) song metadata and chrome. The play screen must make this hierarchy obvious at a single glance. No flat, evenly-weighted layouts.

## User jobs (the acceptance test - every screen serves one of these)

- "I found a song I want to play - show me which keys to press, both hands, right now."
- "I'm mid-song and the next change is coming - what chord, and where do my hands go?"
- "This key is awkward to play or sing - move the whole song somewhere easier."
- "I want to check I've got it right - let me hear the chord and tap a tempo to play along."
- "Auto-fetch is down or the song isn't found - let me paste the chords and still play."
- "I want this away from the screen - print me a clean one-page chord sheet for the music stand."

## Surfaces the design must cover (propose the structure and layout)

- **Play view** (the hero): two mini keyboards (left + right) with highlighted keys, current chord + inversion label, ghosted next chord, transport (Back / Next, spacebar), tap-tempo + metronome, simple/full voicing toggle, fingering on/off, sectioned-vs-flat toggle, transpose controls.
- **Load a song**: title search with a clean "wrong version?" switch to alternates, plus a paste-a-chord-sheet fallback that feels first-class, not a failure state.
- **Songbook**: the saved-songs library, with export / import.
- **Printable chord sheet**: a one-page, print-optimised layout (chord names + small key diagrams), high-contrast, greyscale-safe.
- **Settings**: hand voicing (single root / octave), fingering, simple/full default, theme (light/dark), hand colours.

## Forbidden

- AI-slop signifiers: "Powered by AI", sparkle icons, generic chatbot avatars, robot imagery.
- Wellness-speak, motivational-app hype, gamification, streak-badges, confetti.
- Em-dashes, en-dashes, and the ellipsis character anywhere in copy. Use hyphens or rewrite.
- The named model defaults (this is a new project, so foreclose them up front): Inter and Geist as the type choice; a centred single-CTA hero block; the Lucide / default icon set used as-is; glassmorphic gradient cards; the generic SaaS purple-on-white palette.
- Anything that makes the keyboard look ornamental rather than literal.

## Deliverable

A full design system (colour tokens in OKLCH, type scale, spacing, components for keys / keyboards / chord label / transport / toggles / song list) plus rendered pages for the Play view (in both light and dark), the Load-a-song view, the Songbook, and the printable chord sheet. Demonstrate the contrast hierarchy and the colour-plus-shape hand distinction explicitly. Prefer distinctive, characterful choices over safe ones, while honouring the hushed, spacious, instrument-not-course mood.
