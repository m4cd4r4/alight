// A lazily-loaded sampled grand piano so beginners can HEAR the chord they are
// playing, not just see the keys. The AudioContext may only start after a user
// gesture (browser autoplay policy), so nothing is created on mount - call
// prime() from a real interaction (the Sound toggle, a key tap, pressing Play).
// smplr streams its samples on demand and the browser caches them; the library
// itself is dynamically imported so it stays out of the initial bundle.

import { useCallback, useEffect, useRef, useState } from "react";
import type { SplendidGrandPiano } from "smplr";

export interface ChordPiano {
  /** Create + load the piano. Safe to call repeatedly; must originate from a gesture. */
  prime: () => void;
  /** True once samples are loaded and playback will actually be heard. */
  ready: boolean;
  /** Strike a whole chord, clearing the previous one so stabs stay clean. */
  playChord: (notes: string[]) => void;
  /** Strike a single note, ringing alongside anything already sounding. */
  playNote: (note: string) => void;
}

export function useChordPiano(): ChordPiano {
  const ctxRef = useRef<AudioContext | null>(null);
  const pianoRef = useRef<SplendidGrandPiano | null>(null);
  const loadingRef = useRef(false);
  const [ready, setReady] = useState(false);

  const prime = useCallback(() => {
    if (pianoRef.current || loadingRef.current) return;
    loadingRef.current = true;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    import("smplr")
      .then(async ({ SplendidGrandPiano }) => {
        // Self-hosted samples (served from /samples; vendored by
        // scripts/fetch-piano-samples.mjs) - no runtime dependency on smplr's CDN.
        // Sample names contain '#' (black keys); we serve them with '#' -> 's'
        // filenames and rewrite the request here, since a literal '#' in a URL
        // path is a fragment delimiter that some static hosts mishandle.
        const piano = new SplendidGrandPiano(ctx, {
          baseUrl: "/samples",
          formats: ["ogg"],
          storage: { fetch: (url: string) => fetch(url.replace(/%23/gi, "s").replace(/#/g, "s")) },
        });
        await piano.load;
        pianoRef.current = piano;
        setReady(true);
      })
      .catch(() => {
        loadingRef.current = false; // let the next gesture retry
      });
  }, []);

  const resume = () => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") void ctx.resume();
  };

  const playChord = useCallback((notes: string[]) => {
    const piano = pianoRef.current;
    if (!piano) return;
    resume();
    piano.stop();
    for (const note of notes) piano.start({ note, velocity: 88 });
  }, []);

  const playNote = useCallback((note: string) => {
    const piano = pianoRef.current;
    if (!piano) return;
    resume();
    piano.start({ note, velocity: 95 });
  }, []);

  useEffect(() => {
    return () => {
      try {
        pianoRef.current?.stop();
        void ctxRef.current?.close();
      } catch {
        /* context already closed */
      }
    };
  }, []);

  return { prime, ready, playChord, playNote };
}
