import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../_lib/prisma.js';

const COOKIE_NAME = process.env.SESSION_COOKIE || 'rr_session';
const JWT_SECRET = process.env.JWT_SECRET!;
const ORIGIN = process.env.FRONTEND_ORIGIN || '';

function setSessionCookie(res: VercelResponse, uid: string, remember = false) {
  const token = jwt.sign({ uid }, JWT_SECRET, { expiresIn: remember ? '30d' : '1d' });
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // seconds
  const sameSite = ORIGIN ? 'None' : 'Lax';
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAge}`,
  ]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { email, password, remember } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Missing email/password' });

    const normEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normEmail } });
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    setSessionCookie(res, user.id, !!remember);

    const safe = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      dob: user.dob,
      createdAt: user.createdAt,
    };
    return res.status(200).json({ ok: true, user: safe });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
}
