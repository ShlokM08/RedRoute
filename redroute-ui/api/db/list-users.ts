// api/db/list-users.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // order by a field guaranteed to exist (id) to avoid type mismatches
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { id: "desc" },
      take: 25,
    });
    res.status(200).json({ ok: true, users });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
}
