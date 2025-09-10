// api/db/add-test-user.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";
import crypto from "node:crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Allow GET in a browser for convenience
    const email =
      (req.body && typeof req.body === "object" && (req.body as any).email) ||
      `test+${Date.now()}@example.com`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: crypto.randomUUID().replace(/-/g, ""),
        firstName: "Test",
        lastName: "User",
      },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    });

    res.status(200).json({ ok: true, user });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
}
