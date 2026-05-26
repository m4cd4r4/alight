// Back / Play-pause / Next stepping. Spacebar and arrow keys drive prev/next
// (wired in PlayView). Play/pause toggles the play-along clock (timed mode) or
// the tap-tempo auto-advance (manual mode); it is disabled until there is a
// tempo to play to.

function IconPrev() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M14.5 5.5 L7 12 L14.5 18.5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconNext() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M9.5 5.5 L17 12 L9.5 18.5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M8 5 L19 12 L8 19 Z" fill="currentColor" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <rect x="7" y="5" width="3.5" height="14" fill="currentColor" />
      <rect x="13.5" y="5" width="3.5" height="14" fill="currentColor" />
    </svg>
  );
}

interface TransportProps {
  onPrev: () => void;
  onNext: () => void;
  isPlaying: boolean;
  canPlay: boolean;
  onTogglePlay: () => void;
}

export function Transport({ onPrev, onNext, isPlaying, canPlay, onTogglePlay }: TransportProps) {
  return (
    <div className="pck-transport" role="group" aria-label="Transport">
      <button type="button" onClick={onPrev} aria-label="Previous chord">
        <IconPrev />
      </button>
      <button
        type="button"
        className="primary"
        onClick={onTogglePlay}
        disabled={!canPlay}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <IconPause /> : <IconPlay />}
      </button>
      <button type="button" onClick={onNext} aria-label="Next chord">
        <IconNext />
      </button>
    </div>
  );
}
