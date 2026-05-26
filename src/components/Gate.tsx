// The admin gate screen. Blocks the app until the password is entered, then
// remembers the unlock per browser. The keyboards stay private; lyrics never
// load for a passer-by.

import { type FormEvent, useState } from "react";
import { GATE_PASSWORD, setGate } from "../gate.ts";
import { ThemeToggle } from "./ThemeToggle.tsx";

export function Gate({
  onUnlock,
  theme,
  onToggleTheme,
}: {
  onUnlock: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (password === GATE_PASSWORD) {
      setGate(password);
      onUnlock();
    } else {
      setError(true);
    }
  }

  return (
    <div className="gate-page">
      <div className="gate-topbar">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <main className="gate-stage">
        <span className="wordmark" aria-label="Alight">
          <svg viewBox="0 0 28 36" aria-hidden="true" className="wordmark-mark">
            <g transform="translate(2,4)">
              <rect x="0" y="6" width="22" height="26" fill="none" stroke="currentColor" strokeWidth="1.25" />
              <rect x="6" y="6" width="10" height="16" fill="currentColor" />
              <rect x="3" y="0" width="5" height="5" fill="currentColor" />
              <path d="M19 0 L13 0 L16 5 Z" fill="currentColor" />
            </g>
          </svg>
          <span className="wordmark-name">Alight</span>
        </span>
        <form className="gate-form" onSubmit={submit}>
          <input
            type="password"
            autoFocus
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            aria-label="Password"
            aria-invalid={error}
          />
          <button type="submit" className="btn-primary" disabled={password.length === 0}>
            Enter
          </button>
        </form>
        {error ? <div className="gate-error">That password is not right.</div> : null}
      </main>
    </div>
  );
}
