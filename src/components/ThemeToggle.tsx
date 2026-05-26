// The one top-bar control wired in Wave 2: light/dark theme. Shared by the
// Load and Play views so dark mode is available, and consistent, on both.

export function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="icon-btn"
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      aria-label="Toggle theme"
      aria-pressed={theme === "dark"}
      onClick={onToggle}
    >
      {theme === "light" ? (
        <svg viewBox="0 0 24 24"><path d="M19 14.5 A8 8 0 0 1 9.5 5 A7 7 0 1 0 19 14.5 Z" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" /></svg>
      ) : (
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.25" /><path d="M12 3 V5 M12 19 V21 M3 12 H5 M19 12 H21 M5.6 5.6 L7 7 M17 17 L18.4 18.4 M5.6 18.4 L7 17 M17 7 L18.4 5.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
      )}
    </button>
  );
}
