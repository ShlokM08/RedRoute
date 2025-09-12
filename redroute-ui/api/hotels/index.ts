import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const hotels = await prisma.hotel.findMany({
      include: { images: true },
      orderBy: { id: 'desc' }, // Int id exists
      take: 12,
    });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(hotels);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to load hotels' });
    //dd
  }
}
