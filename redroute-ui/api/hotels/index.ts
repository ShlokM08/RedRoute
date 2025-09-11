import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js'; // NOTE: .js required with nodenext

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET' });
  }

  try {
    // warm up connection (especially helpful right after deploy)
    await prisma.$queryRaw`SELECT 1`;

    const hotels = await prisma.hotel.findMany({
      take: 12,
      orderBy: { id: 'asc' },  // use a guaranteed column
      include: {
        images: {
          take: 1,                     // keep payload small; adjust as needed
          orderBy: { id: 'asc' },
          select: { id: true, url: true, alt: true },
        },
      },
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(hotels);
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
