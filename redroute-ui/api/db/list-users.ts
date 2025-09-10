import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "../_lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    });
    res.status(200).json({ ok: true, users });
  } catch (e: any) {
    console.error("LIST-USERS ERROR:", e);
    res.status(500).json({ ok: false, error: e?.message || "failed" });
  }
}
