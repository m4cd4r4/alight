// A short demo progression. Notes are written as "letter+octave".
// Sharps and flats use # / b internally; the display function
// maps them to the real Unicode glyphs.
window.PCH_SONG = {
  title: "Landslide",
  artist: "Fleetwood Mac",
  capo: "Capo corrected. These are the real piano keys.",
  tempo: 72,
  steps: [
    {
      name: "C", inversion: null,
      left:  [{ note: "C3", finger: 5 }],
      right: [{ note: "C4", finger: 1 }, { note: "E4", finger: 3 }, { note: "G4", finger: 5 }],
    },
    {
      name: "G/B", inversion: "1st inversion",
      left:  [{ note: "B2", finger: 5 }],
      right: [{ note: "D4", finger: 1 }, { note: "G4", finger: 3 }, { note: "B4", finger: 5 }],
    },
    {
      name: "Am7", inversion: null,
      left:  [{ note: "A2", finger: 5 }],
      right: [{ note: "C4", finger: 1 }, { note: "E4", finger: 2 }, { note: "G4", finger: 4 }, { note: "A4", finger: 5 }],
    },
    {
      name: "F", inversion: null,
      left:  [{ note: "F2", finger: 5 }],
      right: [{ note: "F3", finger: 1 }, { note: "A3", finger: 3 }, { note: "C4", finger: 5 }],
    },
    {
      name: "C/E", inversion: "1st inversion",
      left:  [{ note: "E2", finger: 5 }],
      right: [{ note: "C4", finger: 1 }, { note: "E4", finger: 3 }, { note: "G4", finger: 5 }],
    },
    {
      name: "G", inversion: null,
      left:  [{ note: "G2", finger: 5 }],
      right: [{ note: "G3", finger: 1 }, { note: "B3", finger: 3 }, { note: "D4", finger: 5 }],
    },
  ],
};

// Map ASCII accidentals to real glyphs for display.
window.PCH_pretty = function (s) {
  return String(s).replace(/#/g, "\u266F").replace(/b(?![a-z])/g, "\u266D");
};
