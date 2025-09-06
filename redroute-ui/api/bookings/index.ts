import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { hotelId, userId, startDate, endDate, guests = 2 } = req.body ?? {};
  if (!hotelId) return res.status(400).json({ error: 'hotelId required' });

  // Parse optional dates (only attach to data if valid)
  const sd = startDate ? new Date(startDate) : undefined;
  const ed = endDate ? new Date(endDate) : undefined;

  // Build the Prisma create payload without undefined fields
  const data: any = {
    hotelId: String(hotelId),                 // Hotel.id is a string (cuid)
    ...(userId ? { userId: String(userId) } : {}),
    ...(sd ? { startDate: sd } : {}),
    ...(ed ? { endDate: ed } : {}),
    guests: Number(guests) || 1,
    status: 'CONFIRMED',
  };

  try {
    const booking = await prisma.booking.create({ data });
    return res.status(201).json(booking);
  } catch (e: any) {
    console.error('Create booking failed:', e);
    return res.status(500).json({ error: e?.message ?? 'Server error' });
  }
}
