// src/session.ts
// Persist session across reloads using localStorage

const SESSION_KEY = "rr_session_ts";

export function hasValidSession(): boolean {
  const ts = localStorage.getItem(SESSION_KEY);
  return Boolean(ts);
}

export function setSession() {
  localStorage.setItem(SESSION_KEY, Date.now().toString());
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
