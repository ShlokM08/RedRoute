import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcrypt";
import prisma from "../_lib/prisma";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { email, password, firstName, lastName, dob } = (req.body ?? {}) as {
    email?: string; password?: string; firstName?: string; lastName?: string; dob?: string;
  };

  if (!email || !password) return res.status(400).json({ error: "email & password required" });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        dob: dob ? new Date(dob) : null,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    res.status(201).json({ ok: true, user });
  } catch (e: any) {
    if (e?.code === "P2002") return res.status(409).json({ ok: false, error: "Email already exists" });
    res.status(500).json({ ok: false, error: e?.message || "server error" });
  }
}
