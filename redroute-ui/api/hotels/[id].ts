import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js'; // use the shared singleton

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET' });
  }

  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!idParam) return res.status(400).json({ error: 'Missing hotel id' });

  try {
    await prisma.$queryRaw`SELECT 1`;

    const hotel = await prisma.hotel.findUnique({
      where: { id: String(idParam) }, // id is String (cuid) in your schema
      include: {
        images: {
          orderBy: { id: 'asc' },
          take: 8,
          select: { id: true, url: true, alt: true },
        },
      },
    });

    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(hotel);
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
