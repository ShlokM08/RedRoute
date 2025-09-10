// api/db/list-users.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const users = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, firstName: true, createdAt: true }
    });
    const count = await prisma.user.count();
    res.status(200).json({ ok: true, count, sample: users });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.code || e?.name, message: e?.message });
  }
}
