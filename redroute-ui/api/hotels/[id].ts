// api/hotels/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // keep this path; it’s correct for /api/hotels

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    if (!idParam || typeof idParam !== "string") {
      return res.status(400).json({ error: "Missing or invalid hotel id" });
    }

    // Your DB appears to use a string id (you navigate with 'dxb', etc.)
    const hotel = await prisma.hotel.findUnique({
      where: { id: idParam },      // <-- id is a STRING
      include: { images: true },
    });

    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    return res.status(200).json(hotel);
  } catch (e: any) {
    // Always return JSON so the client doesn’t see “text/plain”
    return res.status(500).json({
      error: "Server error",
      message: e?.message ?? String(e),
    });
  }
}
