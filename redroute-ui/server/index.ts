import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import * as bcrypt from "bcrypt";

import { prisma } from "../lib/server/db.js";
import {
  signSession,
  makeSessionCookie,
  makeClearSessionCookie,
  getUserIdFromRequest,
} from "../lib/server/auth.js";

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * CORS / server setup
 * ──────────────────────────────────────────────────────────────────────────────
 */
const app = express();

const normalize = (o?: string | null) => (o ? o.replace(/\/$/, "") : o);

// Allow any localhost:* and your Vercel domain (no trailing slash)
const DEV_ORIGIN = process.env.DEV_ORIGIN ?? "http://localhost:5173";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "https://red-route-voau.vercel.app";
const ALLOWED_ORIGINS = [DEV_ORIGIN, FRONTEND_ORIGIN].filter(Boolean) as string[];

const allowedSet = new Set([normalize(DEV_ORIGIN), normalize(FRONTEND_ORIGIN)].filter(Boolean) as string[]);

app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin / curl / proxy: no Origin header → allow
      if (!origin) return cb(null, true);

      const o = normalize(origin)!;
      if (o.startsWith("http://localhost")) return cb(null, true); // any localhost:* port
      if (allowedSet.has(o)) return cb(null, true);

      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Health check (useful for uptime checks / Render)
 * ──────────────────────────────────────────────────────────────────────────────
 */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV,
    origins: ALLOWED_ORIGINS,
  });
});

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Auth: Register
 * ──────────────────────────────────────────────────────────────────────────────
 */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, remember, firstName, lastName, dob } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // Minimal validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password too short" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email already in use" });

    // Parse dob (yyyy-mm-dd) to Date | null
    let dobDate: Date | null = null;
    if (typeof dob === "string" && dob.trim()) {
      const d = new Date(dob);
      if (!Number.isNaN(+d)) dobDate = d;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: typeof firstName === "string" ? firstName.trim() : null,
        lastName: typeof lastName === "string" ? lastName.trim() : null,
        dob: dobDate,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const token = signSession(user.id, !!remember);
    res.setHeader("Set-Cookie", makeSessionCookie(token, !!remember));
    return res.status(201).json({ ok: true, user });
  } catch (e) {
    console.error("Register error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Auth: Login
 * ──────────────────────────────────────────────────────────────────────────────
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, remember } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = signSession(user.id, !!remember);
    res.setHeader("Set-Cookie", makeSessionCookie(token, !!remember));
    return res.json({
      ok: true,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Auth: Logout
 * ──────────────────────────────────────────────────────────────────────────────
 */
app.post("/api/auth/logout", (_req, res) => {
  res.setHeader("Set-Cookie", makeClearSessionCookie());
  return res.json({ ok: true });
});

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Auth: Me
 * ──────────────────────────────────────────────────────────────────────────────
 */
app.get("/api/auth/me", async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.json({ user: null });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, dob: true },
    });

    return res.json({ user });
  } catch (e) {
    console.error("Me error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));


/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Start server (dev)
 * ──────────────────────────────────────────────────────────────────────────────
 */
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ") || "(none)"}`);
});
export default app;
