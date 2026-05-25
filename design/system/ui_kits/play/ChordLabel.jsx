// ChordLabel.jsx — the current chord dominates; next is hushed.

function ChordLabel({ now, next }) {
  return (
    <div className="chord-label">
      <div className="pck-chord-now">
        <div className="name">{window.PCH_pretty(now.name)}</div>
        <div className="inversion">
          {now.inversion ? now.inversion : "Root position"}
        </div>
      </div>
      {next && (
        <div className="pck-chord-next" aria-label={`Next chord: ${next.name}`}>
          <span className="label-caps">Next</span>
          <span className="name">{window.PCH_pretty(next.name)}</span>
        </div>
      )}
    </div>
  );
}

window.ChordLabel = ChordLabel;
