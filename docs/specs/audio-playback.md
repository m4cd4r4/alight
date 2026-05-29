# Spec - Audio playback (Wave 5)

Status: spec'd, not materialised. Owner worktree slug: `audio-playback`.

Make Alight *sound*: when a chord lights, play those exact keys on a sampled
piano, plus an optional metronome. Today the play-along is silent - the practice
controls shipped in PR #2 (speed, A-B loop, count-in, tap-tempo) move the
playhead but produce no audio. This closes that gap.

WYSIWYG contract holds: the engine already resolves every chord to exact voiced
notes; audio plays *exactly* those notes. Nothing new is invented to be heard
that is not already lit.

## Goal

A hobbyist who cannot read music hears the chord they see, in time, so the
visual ("press these keys") and the aural ("this is how it sounds") reinforce
each other. Sound is always supplementary - every existing visual cue stays, and
the app is fully usable muted.

## Scope

In:
- Sampled piano triggered by the active chord. Plays `cur.left` + `cur.right`
  (the `VoicedNote.note` names, e.g. `"C#4"`) when the active step changes - in
  both timed and manual modes, on auto-advance and on manual step.
- A **Sound** toggle (off by default) and a master **volume** control in the
  footer controls. Toggling Sound on is the user gesture that starts the
  `AudioContext` (browsers block audio until a gesture).
- A **metronome** toggle: a click on each beat. Beats come from
  `timeline.beats` in timed mode, or from `bpm` (tap-tempo) in manual mode.
- Sustain a chord until the next one (timed: until the next chord's `start`;
  manual: a fixed release, retriggered on step).
- Preferences persisted to `localStorage` (`alight:sound`, `alight:volume`,
  `alight:metronome`), same pattern as `alight:theme`.

Out (later):
- Per-hand volume / mute, arpeggiation, swing, instruments other than piano.
- Look-ahead WebAudio scheduling for sample-accurate timing (v1 triggers on the
  React state change; rAF jitter is acceptable for a practice aid - see Timing).
- Self-hosted samples (v1 streams from a CDN; self-hosting is a pre-launch chore
  alongside the fonts, tracked in DESIGN.md).
- Recording / export of audio.

## Library

`smplr` (MIT) - `SplendidGrandPiano` for the keyboard, a small `Soundfont`
or a synthesised click for the metronome. Chosen in PROJECT-PLAN's "Later"
bucket. It wraps WebAudio, accepts note names or MIDI directly (our
`VoicedNote.note` is already a sharp-spelled scientific pitch), and returns
per-note stop handles for sustain/release. Add to `dependencies`.

## Architecture

Keep the audio engine isolated and React-thin, mirroring how `usePlayAlong`
isolates the clock.

```
src/audio/
  engine.ts      Imperative wrapper over smplr: load(), playChord(notes, opts),
                 click(accent), setVolume(v), stopAll(). Lazy-creates the
                 AudioContext on first use (must be a user gesture). No React.
  usePiano.ts    React hook. Given { enabled, volume, metronome } and the
                 current PlayAlong state, fires engine.playChord on activeIndex
                 change and engine.click on each beat. Owns load lifecycle and
                 cleanup. Returns { ready, loading }.
```

`PlayView` already exposes the two inputs the hook needs:
- `idx` (active chord) and `steps[idx].left/right` - the notes to play.
- `pa.isPlaying`, `pa.timed`, `pa.currentTime`, `pa.bpm`, `timeline.beats` - for
  the metronome and for deciding sustain length.

The hook subscribes to `idx`; on change, `stopAll()` the previous chord (or let
it release) and `playChord(notes)`. It must NOT play on the very first render of
a freshly loaded song (no chord "fires" until the user steps or presses play) -
gate the first trigger behind `pa.isPlaying || userStepped`.

### Timing

v1: trigger `playChord` from a `useEffect` on `idx`. Simple, good enough for a
practice tool. The metronome, if enabled in timed mode, schedules clicks against
`timeline.beats[].time` using the AudioContext clock (a short look-ahead loop) so
the click stays tight even if React lags; in manual mode it clicks every
`60/bpm` seconds while playing.

Enhancement (out of scope): schedule chord onsets the same look-ahead way in
timed mode for sample-accurate chord changes.

### AudioContext gesture

`AudioContext` starts suspended until a user gesture. The **Sound** toggle's
`onChange` is that gesture: flip on -> `engine.load()` (resume context + fetch
samples, show a brief "loading sound" state) -> ready. Pressing **Play** while
Sound is on but context somehow suspended must also `resume()`. Document this so
a future change does not try to autoplay on mount.

## UI / integration seams

All in `PlayView`'s footer `.footer-controls`, reusing `Segmented` /
`ToggleSwitch` from `Controls.tsx`:

- New `.ctl-block` "Sound": a `ToggleSwitch` (Sound on/off) + a volume control.
  Volume can be a native `<input type="range">` styled in `play.css`, or a small
  new `Slider` in `Controls.tsx` if we want it to match the design system.
- A `ToggleSwitch` "Metronome" next to Count-in/Fingering (only meaningful when a
  tempo is known: disable when `!pa.canPlay`).
- A subtle "loading sound" indicator near the Sound toggle on first arm.

State lives in `PlayView` (like `voicing`, `fingering`), persisted to
`localStorage`. No change to `usePlayAlong` or the voicing engine.

## Files touched (output paths - reserved for this worktree)

- `src/audio/engine.ts` (new)
- `src/audio/usePiano.ts` (new)
- `src/components/PlayView.tsx` (wire hook + 2 controls)
- `src/components/Controls.tsx` (only if a shared `Slider` is added)
- `src/styles/play.css` (control styling)
- `package.json` (+`smplr`)
- `docs/specs/audio-playback.md` (this file -> mark materialised)

## Security / privacy

No new data leaves the device. smplr fetches sample files from its CDN (audio
assets, not user data). No backend, no new env. Note the CDN dependency in
DESIGN.md's self-host chore list.

## Open decisions (resolve at build time)

- Default Sound state: **off** (no surprise audio; arming is one tap). Confirm.
- Manual-step sound: play on every step, or only during auto-advance? Lean
  **play on every step** - stepping is the main way beginners explore.
- Metronome sound: synth click vs sampled woodblock. Synth click is zero-asset;
  start there.
- Sustain/release feel: fixed 1.5s release in manual mode is a starting guess;
  tune by ear.

## Verification

- Manual is primary (audio): with `npm run dev`, load the demo, arm Sound, step
  and play in both modes; confirm the notes heard match the lit keys across a
  voicing change and a transpose (WYSIWYG by ear).
- `/design-review` / `/verify` pass for the new controls at the 4 breakpoints,
  light + dark.
- Pure-logic tests where they exist (e.g. beat-time -> click schedule helper if
  extracted); the WebAudio path itself is verified by ear, not unit-tested.
- Check no audio fires on load before the first user gesture (autoplay policy).

## Effort

Small-to-medium. One worktree. No backend. The risk is feel (timing/sustain),
not plumbing - budget time for tuning by ear, not for architecture.
