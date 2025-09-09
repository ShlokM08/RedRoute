import express from "express";
import cookieParser from "cookie-parser";
import * as bcrypt from "bcrypt";
import { prisma } from "../lib/server/db.js";
import {
  signSession,
  makeSessionCookie,
  makeClearSessionCookie,
  getUserIdFromRequest
} from "../lib/server/auth.js";





const app = express();
app.use(express.json());
app.use(cookieParser());

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, remember, firstName, lastName, dob } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string")
      return res.status(400).json({ error: "Invalid payload" });

    // minimal validation
    if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: "Invalid email" });
    if (password.length < 6)     return res.status(400).json({ error: "Password too short" });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email already in use" });

    // parse dob string (yyyy-mm-dd) to Date or undefined
    let dobDate: Date | undefined = undefined;
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
        lastName:  typeof lastName  === "string" ? lastName.trim()  : null,
        dob: dobDate ?? null,
      },
      select: { id: true, email: true, firstName: true, lastName: true }
    });

    const token = signSession(user.id, !!remember);
    res.setHeader("Set-Cookie", makeSessionCookie(token, !!remember));
    res.json({ ok: true, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, remember } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = signSession(user.id, !!remember);
    res.setHeader("Set-Cookie", makeSessionCookie(token, !!remember));
    res.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.setHeader("Set-Cookie", makeClearSessionCookie());
  res.json({ ok: true });
});
app.get("/api/auth/me", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, dob: true }
  });
  res.json({ user });
});


// start server (dev)
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
