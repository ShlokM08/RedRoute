// api/db/test-create.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const ts = Date.now();
    const email = `debug+${ts}@redroute.dev`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "debug",
        firstName: "Debug",
        lastName: "User"
      }
    });

    res.status(200).json({ ok: true, created: user });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.code || e?.name, message: e?.message });
  }
}
