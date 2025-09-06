// api/hotels.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req: any, res: any) {
  const hotels = await prisma.hotel.findMany({
    include: { images: { select: { url: true, alt: true }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  });
  res.status(200).json(hotels);
}
