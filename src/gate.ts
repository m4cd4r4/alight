// A simple admin gate. Not Fort Knox - a deterrent so the deployed app (and the
// copyrighted synced lyrics it can fetch) is not openly usable by passers-by.
// The same password guards /api/analyze server-side (see api/analyze.ts), so
// lyrics cannot be fetched by calling the API directly without it.
//
// Configured here in development; override with VITE_ALIGHT_PASSWORD (client)
// and ALIGHT_PASSWORD (the serverless function) without a code change.

export const GATE_PASSWORD = import.meta.env.VITE_ALIGHT_PASSWORD || "alight2026";
const GATE_KEY = "alight:gate";

export function storedGate(): string {
  try {
    return localStorage.getItem(GATE_KEY) || "";
  } catch {
    return "";
  }
}

export function isUnlocked(): boolean {
  return storedGate() === GATE_PASSWORD;
}

export function setGate(password: string): void {
  try {
    localStorage.setItem(GATE_KEY, password);
  } catch {
    // private mode / storage disabled - unlock holds for the session only
  }
}
