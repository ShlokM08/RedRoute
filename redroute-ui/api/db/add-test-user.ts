import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "../_lib/prisma";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    const email = String(req.query.email || "").trim().toLowerCase();
    const firstName = String(req.query.firstName || "Test");
    const lastName = String(req.query.lastName || "User");

    if (!email || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "Provide ?email=someone@example.com" });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { firstName, lastName },
      create: {
        email,
        passwordHash: "debug_only_do_not_use",
        firstName,
        lastName,
      },
    });

    res.status(200).json({ ok: true, user });
  } catch (e: any) {
    console.error("ADD-TEST-USER ERROR:", e);
    res.status(500).json({ ok: false, error: e?.message || "failed" });
  }
}
