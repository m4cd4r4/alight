// Controls.jsx — secondary controls: tempo + tap, voicing, fingering,
// sectioned/flat, transpose, theme.

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="ctl-block">
      {label && <div className="t-label-caps">{label}</div>}
      <div className="pck-segmented" role="group" aria-label={label}>
        {options.map(o => (
          <button key={o.value}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, children }) {
  return (
    <label className="pck-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="track"></span>
      {children}
    </label>
  );
}

function Tempo({ bpm, onTap, metronome, onMetronomeChange }) {
  return (
    <div className="ctl-block tempo">
      <div className="t-label-caps">Tempo</div>
      <div className="tempo-row">
        <div className="tempo-bpm t-mono">
          <span className="num">{bpm}</span>
          <span className="unit">bpm</span>
        </div>
        <button className="ctl-ghost" onClick={onTap} title="Tap a tempo">Tap</button>
        <ToggleSwitch checked={metronome} onChange={onMetronomeChange}>Click</ToggleSwitch>
      </div>
    </div>
  );
}

function Transpose({ semitones, onChange }) {
  const display = semitones === 0
    ? "Original key"
    : `${semitones > 0 ? "+" : ""}${semitones} semitone${Math.abs(semitones) === 1 ? "" : "s"}`;
  return (
    <div className="ctl-block transpose">
      <div className="t-label-caps">Transpose</div>
      <div className="transpose-row">
        <button className="ctl-ghost" onClick={() => onChange(semitones - 1)} aria-label="Down a semitone">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12 H19" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
        </button>
        <span className="t-mono transpose-value">{display}</span>
        <button className="ctl-ghost" onClick={() => onChange(semitones + 1)} aria-label="Up a semitone">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 5 V19 M5 12 H19" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
}

window.Segmented = Segmented;
window.ToggleSwitch = ToggleSwitch;
window.Tempo = Tempo;
window.Transpose = Transpose;
