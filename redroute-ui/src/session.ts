// src/session.ts
const KEY_AUTH = "rr_demo_user";
const KEY_GUEST = "rr_guest";
const KEY_TS = "rr_session_ts";
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h (tune as you like)

export function setSession(type: "auth" | "guest") {
  try {
    if (type === "auth") {
      localStorage.setItem(KEY_AUTH, "auth");
      localStorage.removeItem(KEY_GUEST);
    } else {
      localStorage.setItem(KEY_GUEST, "guest");
      localStorage.removeItem(KEY_AUTH);
    }
    localStorage.setItem(KEY_TS, String(Date.now()));
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY_AUTH);
    localStorage.removeItem(KEY_GUEST);
    localStorage.removeItem(KEY_TS);
    localStorage.removeItem("rr_name");
  } catch {}
}

export function hasValidSession() {
  try {
    const val = localStorage.getItem(KEY_AUTH) || localStorage.getItem(KEY_GUEST);
    if (!val) return false;

    const tsRaw = localStorage.getItem(KEY_TS);
    const ts = tsRaw ? Number(tsRaw) : 0;
    // Expire very old/stuck sessions automatically
    if (!ts || Date.now() - ts > MAX_AGE_MS) {
      clearSession();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
