// Keyboard.jsx
// A keyboard limited to a fixed octave range, with per-key
// highlight state. The diagram is literal — a highlighted key
// means "press exactly this key". Hand identity is conveyed
// by colour AND shape marker.

const KB_WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const KB_BLACK_AFTER = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };

// Note name -> octave number (e.g. "C4" -> 4)
function octaveOf(n) { return parseInt(n.slice(-1), 10); }
function letterOf(n) { return n.slice(0, -1); }

function HandMarker({ kind, filled }) {
  if (kind === "left") {
    return (
      <svg viewBox="0 0 12 12">
        {filled
          ? <rect x="2" y="2" width="8" height="8" fill="currentColor" />
          : <rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12">
      {filled
        ? <path d="M6 10 L2 3 L10 3 Z" fill="currentColor" />
        : <path d="M6 9.5 L2.6 3.5 L9.4 3.5 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />}
    </svg>
  );
}

// hand: "left" | "right". Range can be given two ways:
//   startOctave + endOctave (inclusive, full octaves)
//   OR startNote + endNote (e.g. "C2" + "E3") for partial ranges
function Keyboard({ hand, startOctave, endOctave, startNote, endNote, nowNotes, nextNotes, size = "md", showFingering = true }) {
  // Build the list of white keys.
  const whites = [];
  if (startNote && endNote) {
    const startL = letterOf(startNote);
    const startO = octaveOf(startNote);
    const endL   = letterOf(endNote);
    const endO   = octaveOf(endNote);
    let started = false;
    outer:
    for (let o = startO; o <= endO; o++) {
      for (const w of KB_WHITE_NOTES) {
        if (!started) {
          if (w === startL && o === startO) started = true;
          else continue;
        }
        whites.push(`${w}${o}`);
        if (w === endL && o === endO) break outer;
      }
    }
  } else {
    for (let o = startOctave; o <= endOctave; o++) {
      for (const w of KB_WHITE_NOTES) whites.push(`${w}${o}`);
    }
  }

  // Build the list of black keys (offsets are in WHITE-key widths).
  const blacks = [];
  whites.forEach((name, i) => {
    const letter = letterOf(name);
    const oct = octaveOf(name);
    if (KB_BLACK_AFTER[letter]) {
      blacks.push({
        name: `${KB_BLACK_AFTER[letter]}${oct}`,
        offsetIndex: i + 1, // sits at the boundary between this white and the next
      });
    }
  });

  const nowMap  = new Map((nowNotes  || []).map(n => [n.note, n]));
  const nextMap = new Map((nextNotes || []).map(n => [n.note, n]));

  // Pixel width of a white key, used for black-key absolute positions.
  const widths = { sm: 26, md: 34, lg: 44 };
  const whiteW = widths[size];

  function keyState(name) {
    if (nowMap.has(name))  return { state: "now",  data: nowMap.get(name) };
    if (nextMap.has(name)) return { state: "next", data: nextMap.get(name) };
    return { state: null, data: null };
  }

  function Note({ name, finger, state }) {
    return (
      <>
        <span className="pck-marker">
          <HandMarker kind={hand} filled={state === "now"} />
        </span>
        <span className="pck-note t-mono">{window.PCH_pretty(letterOf(name))}</span>
        {showFingering && finger != null && (
          <span className="pck-finger">{finger}</span>
        )}
      </>
    );
  }

  return (
    <div className={`pck-keyboard pck-${size}`}>
      <div className="pck-whites">
        {whites.map((name) => {
          const { state, data } = keyState(name);
          const cls = ["pck-key", "pck-white"];
          if (state) cls.push(`is-${hand}`, `is-${state}`);
          return (
            <div key={name} className={cls.join(" ")}>
              {state && <Note name={name} finger={data.finger} state={state} />}
            </div>
          );
        })}
      </div>
      {blacks.map(({ name, offsetIndex }) => {
        const { state, data } = keyState(name);
        const cls = ["pck-key", "pck-black"];
        if (state) cls.push(`is-${hand}`, `is-${state}`);
        return (
          <div
            key={name}
            className={cls.join(" ")}
            style={{ "--offset": `${offsetIndex * whiteW}px` }}
          >
            {state && <Note name={name} finger={data.finger} state={state} />}
          </div>
        );
      })}
    </div>
  );
}

window.Keyboard = Keyboard;
window.HandMarker = HandMarker;
