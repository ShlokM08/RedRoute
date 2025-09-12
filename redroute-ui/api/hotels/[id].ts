import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // reuse shared client
export const config = { runtime: "nodejs18.x" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
if (!idParam) return res.status(400).json({ error: "Missing hotel id" });

if (req.method !== "GET") {
  return res.status(405).json({ error: "Use GET" });
}

const id = Number(idParam);
if (!Number.isFinite(id)) {
  return res.status(400).json({ error: "Invalid hotel id" });
}

try {
  const hotel = await prisma.hotel.findUnique({
    where: {id},              // ✅ id is a number here
    include: { images: true },
  });
  if (!hotel) return res.status(404).json({ error: "Hotel not found" });
  return res.status(200).json(hotel);
} catch (e: any) {
  return res.status(500).json({ error: e?.message ?? "Server error" });
}

}
