// api/bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js"; // <- keep the .js extension for Vercel

type Body = {
  hotelId?: number | string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  contactName?: string | null;
  contactEmail?: string | null;
};

function bad(res: VercelResponse, code: number, msg: string) {
  return res.status(code).json({ error: msg });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return bad(res, 405, "Use POST");
  }

  let body: Body;
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) ?? {};
  } catch {
    return bad(res, 400, "Invalid JSON body");
  }

  const { hotelId, checkIn, checkOut, guests = 1, contactName, contactEmail } = body;

  // Basic validation
  const hotelIdNum = Number(hotelId);
  if (!hotelId || Number.isNaN(hotelIdNum)) {
    return bad(res, 400, "hotelId must be a number");
  }
  if (!checkIn || !checkOut) {
    return bad(res, 400, "checkIn and checkOut are required (ISO date strings)");
  }

  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  if (Number.isNaN(+ci) || Number.isNaN(+co) || +co <= +ci) {
    return bad(res, 400, "Invalid date range");
  }

  try {
    // Ensure hotel exists + get capacity
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelIdNum },
      select: { id: true, capacity: true, name: true },
    });
    if (!hotel) return bad(res, 404, "Hotel not found");

    const cap = typeof hotel.capacity === "number" ? hotel.capacity : 10;
    if (guests < 1 || guests > cap) {
      return bad(res, 400, `guests must be between 1 and ${cap}`);
    }

    // Overlap check (same hotel)
    const overlap = await prisma.booking.findFirst({
      where: {
        hotelId: hotelIdNum,
        // overlap logic: (existing.checkIn < co) && (existing.checkOut > ci)
        AND: [{ checkIn: { lt: co } }, { checkOut: { gt: ci } }],
      },
      select: { id: true },
    });
    if (overlap) {
      return bad(res, 409, "This date range is unavailable for the selected hotel.");
    }

    // Resolve userId:
    // 1) Allow callers to pass a header "x-user-id" if your auth sets one
    // 2) Otherwise, upsert a demo user so bookings always have a user
    let userId: string | null = null;

    const headerUser = req.headers["x-user-id"];
    if (typeof headerUser === "string" && headerUser.trim()) {
      const maybe = await prisma.user.findUnique({ where: { id: headerUser.trim() } });
      userId = maybe?.id ?? null;
    }

    if (!userId) {
      const demoEmail = "demo@redroute.local";
      const demo = await prisma.user.upsert({
        where: { email: demoEmail },
        update: {},
        create: {
          email: demoEmail,
          passwordHash: "demo", // placeholder; not used for auth
          firstName: "Demo",
          lastName: "User",
        },
        select: { id: true },
      });
      userId = demo.id;
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        hotelId: hotelIdNum,
        checkIn: ci,
        checkOut: co,
        guests,
        contactName: contactName ?? null,
        contactEmail: contactEmail ?? null,
      },
      select: {
        id: true,
        userId: true,
        hotelId: true,
        checkIn: true,
        checkOut: true,
        guests: true,
        contactName: true,
        contactEmail: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ ok: true, booking });
  } catch (err: any) {
    // Surface Prisma error codes when helpful (e.g., P2002/P2022/etc.)
    const code = err?.code ? ` (code ${err.code})` : "";
    console.error("Create booking error:", err);
    return bad(res, 500, `Server error${code}`);
  }
}
