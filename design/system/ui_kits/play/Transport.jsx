// Transport.jsx — Back, Play/Pause, Next.

function IconPrev() {
  return <svg viewBox="0 0 24 24" width="20" height="20"><path d="M14.5 5.5 L7 12 L14.5 18.5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconNext() {
  return <svg viewBox="0 0 24 24" width="20" height="20"><path d="M9.5 5.5 L17 12 L9.5 18.5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconPlay() {
  return <svg viewBox="0 0 24 24" width="22" height="22"><path d="M7.5 5.5 L18 12 L7.5 18.5 Z" fill="currentColor"/></svg>;
}
function IconPause() {
  return <svg viewBox="0 0 24 24" width="22" height="22">
    <line x1="9.5" y1="6" x2="9.5" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="14.5" y1="6" x2="14.5" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

function Transport({ playing, onPrev, onNext, onTogglePlay }) {
  return (
    <div className="pck-transport" role="group" aria-label="Transport">
      <button onClick={onPrev} aria-label="Previous chord"><IconPrev /></button>
      <button className="primary" onClick={onTogglePlay} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <IconPause /> : <IconPlay />}
      </button>
      <button onClick={onNext} aria-label="Next chord"><IconNext /></button>
    </div>
  );
}

window.Transport = Transport;
