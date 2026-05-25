// The shared chord parser. ONE parser serves both paths: the chords fetched
// from Ultimate Guitar and a sheet pasted by hand. Both arrive in UG's
// `[ch]...[/ch]` / `[tab]` / `[Section]` text format, so both flow through here.
//
// Input  = UG-format content plus the guitar capo.
// Output = the flat `Song` shape the Play view and voicing engine consume.
//
// The voicing engine (voicing.ts) splits slash chords and validates each
// symbol with tonal, so this parser emits chord SYMBOLS, not voiced notes.
// Sections are flattened into one chord sequence; a sectioned view is later work.

import { Chord, Interval, Note } from "tonal";
import type { Song } from "./types.ts";

export interface ParseOptions {
  /** Guitar capo fret. Every chord is transposed up this many semitones. */
  capo?: number;
  title?: string;
  artist?: string;
}

/** A chord split into the parts we need to transpose and reassemble. */
interface ChordParts {
  root: string;
  /** Everything after the root: "m7", "sus4", "add9", "" for a bare major. */
  quality: string;
  /** Slash-bass note, or null. */
  bass: string | null;
}

const NC_RE = /^n\.?c\.?$/i; // N.C., NC, N.C, NC. - "no chord"
const CH_RE = /\[ch\](.*?)\[\/ch\]/gi; // a fetched chord token
const FRET_RE = /[0-9xX]{4,}/; // a guitar fret pattern (320003, x32010) - marks a chord-diagram legend line
const SECTION_RE = /^\s*\[[^\]]+\]\s*$/; // a whole-line section marker, e.g. [Chorus]
// Trailing repeat count: "x4", "(x4)", "4x", "(4x)", preceded by start or space.
const REPEAT_RE = /(^|\s)\(?\s*(?:x\s*(\d+)|(\d+)\s*x)\s*\)?\s*$/i;
const MAX_REPEAT = 8; // bound expansion so odd upstream "x999" cannot blow up the song
const ROOT_RE = /^([A-G][#b]?)(.*)$/;
const BASS_RE = /^([A-G][#b]?)$/;

/** Decode the HTML entities UG leaves in content. Pure, no DOM, so it tests. */
function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d: string) => safeCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => safeCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&"); // last, so a double-encoded "&amp;quot;" resolves
}

function safeCodePoint(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return "";
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

/** German "H" means B natural. Map it before we read the root. */
function normaliseRoot(token: string): string {
  return token.replace(/^H/, "B");
}

/**
 * Validate and split a chord symbol. Returns null for anything tonal does not
 * recognise as a chord, which is how junk tokens are skipped.
 */
function parseChordSymbol(raw: string): ChordParts | null {
  const token = normaliseRoot(raw.trim());
  if (!token) return null;

  const slash = token.indexOf("/");
  const mainPart = slash === -1 ? token : token.slice(0, slash);
  const bassPart = slash === -1 ? null : token.slice(slash + 1);

  const m = mainPart.match(ROOT_RE);
  if (!m) return null;
  if (Chord.get(mainPart).empty) return null;

  let bass: string | null = null;
  if (bassPart !== null) {
    const bm = normaliseRoot(bassPart).match(BASS_RE);
    if (!bm) return null; // a malformed bass means this is not a clean chord token
    bass = bm[1];
  }

  return { root: m[1], quality: m[2], bass };
}

/** Transpose a single note name up by `semitones`, keeping a sane spelling. */
function transposeNote(note: string, semitones: number): string {
  if (semitones === 0) return note;
  const interval = Interval.fromSemitones(((semitones % 12) + 12) % 12);
  const moved = Note.transpose(note, interval);
  return Note.simplify(moved) || moved || note;
}

/** Reassemble a chord symbol after transposing its root and slash bass. */
function transposeChord(parts: ChordParts, semitones: number): string {
  const root = transposeNote(parts.root, semitones);
  const head = root + parts.quality;
  return parts.bass ? `${head}/${transposeNote(parts.bass, semitones)}` : head;
}

/** True when every whitespace-separated token on a line is a chord (paste path). */
function isBareChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => NC_RE.test(t) || parseChordSymbol(t) !== null);
}

/** Pull the trailing repeat count off a line and return the line without it. */
function splitRepeat(line: string): { body: string; count: number } {
  const m = line.match(REPEAT_RE);
  if (!m) return { body: line, count: 1 };
  const raw = parseInt(m[2] ?? m[3] ?? "1", 10);
  const count = Number.isFinite(raw) ? Math.max(1, Math.min(raw, MAX_REPEAT)) : 1;
  return { body: line.slice(0, m.index), count };
}

/** Extract the in-order chord tokens from a single content line, or null. */
function chordTokensFromLine(body: string): string[] | null {
  if (body.includes("[ch]")) {
    // Skip chord-diagram legend lines, e.g. "[ch]G[/ch]   320003": a chord
    // followed by a fret pattern defines a shape, it is not the progression.
    if (FRET_RE.test(body.replace(CH_RE, " "))) return null;
    return [...body.matchAll(CH_RE)].map((m) => m[1]);
  }
  if (isBareChordLine(body)) {
    return body.trim().split(/\s+/).filter(Boolean);
  }
  return null;
}

/**
 * Parse UG-format `content` into a playable `Song`. `capo` transposes every
 * chord up to its true piano pitch (a capo-3 "C" sounds as "E flat").
 */
export function parse(content: string, opts: ParseOptions = {}): Song {
  const capo = Number.isFinite(opts.capo) ? Math.max(0, Math.trunc(opts.capo as number)) : 0;

  const text = decodeEntities(content)
    .replace(/\r\n?/g, "\n")
    .replace(/\[\/?tab\]/gi, ""); // drop tab wrappers, keep the [ch] tokens inside

  const chords: string[] = [];

  for (const line of text.split("\n")) {
    if (SECTION_RE.test(line) && !line.includes("[ch]")) continue;

    const { body, count } = splitRepeat(line);
    const tokens = chordTokensFromLine(body);
    if (!tokens) continue;

    const lineChords: string[] = [];
    for (const token of tokens) {
      try {
        const trimmed = token.trim();
        if (!trimmed || NC_RE.test(trimmed)) continue; // filter "no chord" markers
        const parts = parseChordSymbol(trimmed);
        if (!parts) continue; // skip junk
        lineChords.push(transposeChord(parts, capo));
      } catch {
        // A single unparseable token never breaks the song; skip it.
      }
    }

    for (let pass = 0; pass < count; pass++) chords.push(...lineChords);
  }

  // Collapse consecutive duplicates: the player advances one chord change at a
  // time, so a held chord is one step, not many. WYSIWYG is preserved - the
  // chord is unchanged, only the redundant repeat is removed.
  const deduped = chords.filter((chord, i) => chord !== chords[i - 1]);

  return {
    title: opts.title?.trim() || "Untitled",
    artist: opts.artist?.trim() || "",
    capoNote: capo > 0 ? `Capo ${capo} corrected. These are the real piano keys.` : "",
    chords: deduped,
  };
}
