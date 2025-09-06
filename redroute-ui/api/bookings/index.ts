// api/bookings/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { hotelId, userId, startDate, endDate, guests = 2 } = (req.body ?? {}) as {
    hotelId?: string | number;
    userId?: string | null;
    startDate?: string;     // ISO string is best
    endDate?: string;       // ISO string is best
    guests?: number;
  };

  if (!hotelId) {
    return res.status(400).json({ error: 'hotelId required' });
  }

  // Convert only if provided, otherwise leave undefined (omit the column)
  const sd: Date | undefined = startDate ? new Date(startDate) : undefined;
  const ed: Date | undefined = endDate ? new Date(endDate) : undefined;

  try {
    const booking = await prisma.booking.create({
      data: {
        hotelId: typeof hotelId === 'string' ? Number(hotelId) : hotelId,
        // If userId is nullable in your Prisma schema (String?), you can pass null.
        // If it is optional, prefer undefined so it is omitted.
        userId: userId ?? undefined,
        startDate: sd,   // Date | undefined (omitted if undefined)
        endDate: ed,     // Date | undefined
        guests,
        status: 'CONFIRMED',
      },
    });

    return res.status(201).json(booking);
  } catch (e: any) {
    console.error('Create booking error:', e);
    return res.status(500).json({ error: e.message ?? 'Server error' });
  }
}
