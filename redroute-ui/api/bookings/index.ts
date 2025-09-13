// api/bookings/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../_lib/prisma.js";
import jwt from "jsonwebtoken";

/** --- helpers --- */
function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    out[decodeURIComponent(k)] = decodeURIComponent(rest.join("=") ?? "");
  }
  return out;
}

type JwtShape = { id?: string; userId?: string; email?: string; sub?: string };

async function resolveUserId(req: VercelRequest): Promise<string> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies["token"] || cookies["auth"] || "";
    if (token) {
      const secret = process.env.JWT_SECRET || process.env.JWT_KEY || "secret";
      const decoded = jwt.verify(token, secret) as JwtShape;

      // Try by explicit id first
      const guessId = decoded.id || decoded.userId || decoded.sub;
      if (guessId) {
        const u = await prisma.user.findUnique({ where: { id: String(guessId) } });
        if (u) return u.id;
      }
      // Fallback by email
      if (decoded.email) {
        const u = await prisma.user.findUnique({ where: { email: decoded.email } });
        if (u) return u.id;
      }
    }
  } catch (e) {
    // token invalid/expired -> ignore, we’ll use demo user below
    console.warn("[/api/bookings] JWT verify failed:", (e as Error).message);
  }

  // Final fallback: demo user
  const demo = await prisma.user.upsert({
    where: { email: "demo@redroute.local" },
    update: {},
    create: {
      email: "demo@redroute.local",
      passwordHash: "demo",
      firstName: "Demo",
      lastName: "User",
    },
  });
  return demo.id;
}

function toDateSafe(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  // Accept "YYYY-MM-DD" or locale strings
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** --- handler --- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    // Get body regardless of framework body parsing
    const body =
      (req.body && typeof req.body === "object" ? req.body : undefined) ??
      (await new Promise<any>((resolve) => {
        const chunks: Uint8Array[] = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
          } catch {
            resolve({});
          }
        });
      }));

    const {
      hotelId,
      checkIn,
      checkOut,
      guests = 1,
      contactName = null,
      contactEmail = null,
    } = body ?? {};

    const hotelIdNum = Number(hotelId);
    if (!Number.isFinite(hotelIdNum)) {
      return res.status(400).json({ error: "hotelId must be a number" });
    }

    const ci = toDateSafe(checkIn);
    const co = toDateSafe(checkOut);
    if (!ci || !co || ci >= co) {
      return res.status(400).json({ error: "Invalid check-in / check-out" });
    }

    const g = Number(guests);
    if (!Number.isFinite(g) || g < 1) {
      return res.status(400).json({ error: "guests must be >= 1" });
    }

    // capacity check
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelIdNum },
      select: { capacity: true },
    });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    const maxCap = hotel.capacity ?? 2;
    if (g > maxCap) {
      return res.status(400).json({ error: `Capacity exceeded. Max ${maxCap} guests.` });
    }

    const userId = await resolveUserId(req);

    const booking = await prisma.booking.create({
      data: {
        userId,
        hotelId: hotelIdNum,
        checkIn: ci,
        checkOut: co,
        guests: g,
        contactName,
        contactEmail,
      },
    });

    return res.status(201).json({ ok: true, bookingId: booking.id });
  } catch (e: any) {
    console.error("[/api/bookings] error", e);
    return res.status(500).json({ error: "Server error" });
  }
}
