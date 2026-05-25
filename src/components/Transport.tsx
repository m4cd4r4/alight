// Back / Next stepping. Spacebar and arrow keys drive the same handlers
// (wired in PlayView). Play/auto-advance is a later worktree (tied to audio).

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

interface TransportProps {
  onPrev: () => void;
  onNext: () => void;
}

export function Transport({ onPrev, onNext }: TransportProps) {
  return (
    <div className="pck-transport" role="group" aria-label="Transport">
      <button type="button" onClick={onPrev} aria-label="Previous chord">
        <IconPrev />
      </button>
      <button type="button" className="primary" onClick={onNext} aria-label="Next chord">
        <IconNext />
      </button>
    </div>
  );
}
