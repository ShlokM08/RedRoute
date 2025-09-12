// api/hotels/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // keep this path; it’s correct for /api/hotels



export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    // Validate and parse id
    const idParam = Array.isArray(id) ? id[0] : id;
    const hotelId = parseInt(idParam as string, 10);

    if (isNaN(hotelId)) {
      return res.status(400).json({ error: 'Invalid hotel ID' });
    }

    // Query database for the hotel
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: { images: true },
    });

    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // Send hotel details
    return res.status(200).json(hotel);
  } catch (error: any) {
    console.error('Error fetching hotel:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
