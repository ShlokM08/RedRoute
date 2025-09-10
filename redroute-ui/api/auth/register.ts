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
  const sameSite = ORIGIN ? 'None' : 'Lax'; // set SameSite=None when FE/BE can be cross-site
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAge}`,
  ]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { email, password, remember, firstName, lastName, dob } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Missing email/password' });

    // Basic normalization
    const normEmail = String(email).trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(normEmail)) {
      return res.status(400).json({ ok: false, error: 'Invalid email' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(String(password), 10);

    // Parse dob if present
    let dobDate: Date | null = null;
    if (dob) {
      const d = new Date(dob);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ ok: false, error: 'Invalid dob' });
      dobDate = d;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normEmail,
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        dob: dobDate,
      },
      select: { id: true, email: true, firstName: true, lastName: true, dob: true, createdAt: true },
    });

    // Set session and respond
    setSessionCookie(res, user.id, !!remember);
    return res.status(201).json({ ok: true, user });
  } catch (e: any) {
    // Prisma unique violation
    if (e?.code === 'P2002' && e?.meta?.target?.includes('email')) {
      return res.status(409).json({ ok: false, error: 'Email already registered' });
    }
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
}
