// api/seed.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Use POST to seed' });
    }

    const count = await prisma.hotel.count();
    if (count > 0) {
      return res.status(200).json({ ok: true, alreadySeeded: true });
    }

    const hotels = [
      {
        name: 'Skyline Luxe Hotel',
        city: 'Doha',
        price: 189,
        rating: 4.9,
        description: 'Glass-and-steel views with an infinity pool on the 30th.',
        images: { create: [{ url: '/images/featured_hotel.avif', alt: 'Skyline Luxe' }] },
      },
      {
        name: 'Coastal Escape Villa',
        city: 'Bali',
        price: 259,
        rating: 4.8,
        description: 'Private beach access, sunset deck and outdoor cinema.',
        images: { create: [{ url: '/images/featured_villa.jpeg', alt: 'Coastal Villa' }] },
      },
      {
        name: 'Downtown Creative Loft',
        city: 'Barcelona',
        price: 139,
        rating: 4.7,
        description: 'Industrial-chic loft with skyline terrace.',
        images: { create: [{ url: '/images/featured_loft.avif', alt: 'Loft' }] },
      },
    ];

    // Important: no createMany here because nested writes aren’t supported.
    await prisma.$transaction(hotels.map((h) => prisma.hotel.create({ data: h })));

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Seed error:', e);
    return res.status(500).json({ error: 'Seed failed', detail: String(e?.message ?? e) });
  }
}
