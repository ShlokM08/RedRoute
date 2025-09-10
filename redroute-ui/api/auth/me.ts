import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse as parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import prisma from '../_lib/prisma.js';

const COOKIE_NAME = process.env.SESSION_COOKIE || 'rr_session';
const JWT_SECRET = process.env.JWT_SECRET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ ok: false });

    const payload = jwt.verify(token, JWT_SECRET) as { uid: string };
    if (!payload?.uid) return res.status(401).json({ ok: false });

    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) return res.status(401).json({ ok: false });

    res.status(200).json({ ok: true, user });
  } catch {
    res.status(401).json({ ok: false });
  }
}
