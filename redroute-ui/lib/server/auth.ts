import jwt from "jsonwebtoken";
import { serialize, parse } from "cookie";

const SESSION_COOKIE = process.env.SESSION_COOKIE || "rr_session";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const ONE_DAY = 60 * 60 * 24;
const THIRTY_DAYS = ONE_DAY * 30;
const isProd = process.env.NODE_ENV === "production";

export type TokenPayload = { sub: string };

/** Create a JWT for a user id. */
export function signSession(userId: string, remember = false) {
  const expiresIn = remember ? "30d" : "1d";
  return jwt.sign({ sub: userId } as TokenPayload, JWT_SECRET, { expiresIn });
}

/** Verify a JWT string. Returns payload or null. */
export function verifySession(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** Build a Set-Cookie header value for the session cookie. */
export function makeSessionCookie(token: string, remember = false) {
  return serialize(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: remember ? THIRTY_DAYS : ONE_DAY,
  });
}

/** Build a Set-Cookie header value that clears the cookie. */
export function makeClearSessionCookie() {
  return serialize(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Read session token from request cookies (works with Express or raw Node). */
export function readSessionToken(req: { cookies?: any; headers?: any }) {
  // If using cookie-parser in Express, you'll have req.cookies
  const viaParser = req.cookies?.[SESSION_COOKIE];
  if (viaParser) return viaParser;

  // Fallback: parse Cookie header
  const header = req.headers?.cookie as string | undefined;
  if (!header) return undefined;
  const parsed = parse(header);
  return parsed[SESSION_COOKIE];
}

/** Helper: get userId (sub) from a request. Returns null if not logged in. */
export function getUserIdFromRequest(req: { cookies?: any; headers?: any }) {
  const token = readSessionToken(req);
  if (!token) return null;
  const payload = verifySession(token);
  return payload?.sub ?? null;
}
