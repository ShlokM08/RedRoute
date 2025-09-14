// src/HotelDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";

/* ---------------- auth helper ---------------- */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const r = await fetch("/api/auth/me", { credentials: "include" });
  if (!r.ok) throw new Error("Not authenticated");
  const me = await r.json().catch(() => ({}));
  const id = me?.user?.id ?? me?.id ?? null;
  const email = me?.user?.email ?? me?.email ?? null;
  if (id) return { "x-user-id": String(id) };
  if (email) return { "x-user-email": String(email) };
  throw new Error("Not authenticated");
}

type HotelImage = { url: string; alt?: string | null };
type Hotel = {
  id: number;
  name: string;
  city: string;
  price: number;
  rating: number | null;
  capacity: number;
  images: HotelImage[];
};

function plusDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [checkIn, setCheckIn] = useState<string>(fmtDate(plusDays(new Date(), 1)));
  const [checkOut, setCheckOut] = useState<string>(fmtDate(plusDays(new Date(), 3)));
  const [guests, setGuests] = useState<number>(2);
  const [busy, setBusy] = useState(false);
  const [reserveMsg, setReserveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const today = new Date();

  useEffect(() => {
    (async () => {
      if (!id) { setErr("Missing hotel id"); setLoading(false); return; }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const r = await fetch(`/api/hotels/${encodeURIComponent(id)}`, {
          credentials: "include",
          signal: ac.signal,
        });

        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await r.text().catch(() => "");
          throw new Error(
            `Expected JSON but got ${ct || "unknown"}. First bytes: ${text.slice(0, 60) || "n/a"}`
          );
        }

        if (!r.ok) {
          const j = await r.json().catch(() => null);
          throw new Error(j?.error || `Failed to load (HTTP ${r.status})`);
        }

        const data: Hotel = await r.json();
        setHotel(data);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "Could not load hotel");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      abortRef.current?.abort();
    };
  }, [id]);

  const cap = hotel?.capacity ?? 10;
  const price = hotel?.price ?? 0;

  async function quickReserve() {
    setReserveMsg(null);
    if (!id) return;
    if (!checkIn || !checkOut) {
      setReserveMsg({ ok: false, text: "Please select check-in and check-out." });
      return;
    }
    if (guests < 1 || guests > cap) {
      setReserveMsg({ ok: false, text: `Guests must be between 1 and ${cap}.` });
      return;
    }

    setBusy(true);
    try {
      const authHeaders = await getAuthHeaders();

      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({
          hotelId: Number(id),
          checkIn: new Date(checkIn).toISOString(),
          checkOut: new Date(checkOut).toISOString(),
          guests,
        }),
      });

      const isJson = (r.headers.get("content-type") || "").includes("application/json");
      const payload = isJson ? await r.json().catch(() => null) : null;

      if (!r.ok) throw new Error(payload?.error || `Failed (HTTP ${r.status})`);

      setReserveMsg({ ok: true, text: "Reserved! We’ve saved your booking details." });
      // Optional: go to booking page
      // navigate(`/booking/${payload?.booking?.id}`);
    } catch (e: any) {
      setReserveMsg({ ok: false, text: e?.message || "Could not complete reservation." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-white/80">Loading hotel…</div>;
  }
  if (err || !hotel) {
    return <div className="p-6 text-red-400">{err || "Not found"}</div>;
  }

  return (
    <div className="text-white">
      {/* Header */}
      <div className="mx-auto max-w-5xl p-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-white/80 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {/* Hero image */}
      <div className="relative mx-auto max-w-5xl">
        <img
          src={hotel.images?.[0]?.url || "/images/featured_hotel.avif"}
          alt={hotel.images?.[0]?.alt ?? hotel.name}
          className="h-72 w-full rounded-2xl object-cover"
        />
        <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-sm">
          <MapPin className="mr-1 inline h-4 w-4" /> {hotel.city}
        </div>
      </div>

      {/* Info + Reserve */}
      <div className="mx-auto max-w-5xl p-6 space-y-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{hotel.name}</h1>
            <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
              <Star className="h-4 w-4" />
              {hotel.rating ?? "—"} • Capacity {cap}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${price}</div>
            <div className="text-xs text-white/60">per night</div>
          </div>
        </div>

        {/* Quick reserve controls */}
        <div className="flex flex-col gap-3 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="grid w-full max-w-xl grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <label className="mb-1 block text-xs text-white/70">Check-in</label>
              <input
                type="date"
                value={checkIn}
                min={fmtDate(plusDays(today, 0))}
                onChange={(e) => setCheckIn(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-600/60"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="mb-1 block text-xs text-white/70">Check-out</label>
              <input
                type="date"
                value={checkOut}
                min={fmtDate(plusDays(today, 1))}
                onChange={(e) => setCheckOut(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-600/60"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="mb-1 block text-xs text-white/70">Guests</label>
              <input
                type="number"
                min={1}
                max={cap}
                value={guests}
                onChange={(e) => setGuests(Math.max(1, Math.min(cap, Number(e.target.value) || 1)))}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-600/60"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <button
                disabled={busy}
                onClick={quickReserve}
                className="h-10 w-full rounded-xl bg-[#E50914] text-sm font-semibold hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "Reserving…" : "Reserve Now"}
              </button>
            </div>
          </div>

          {reserveMsg && (
            <div className={`text-sm ${reserveMsg.ok ? "text-green-400" : "text-red-400"}`}>
              {reserveMsg.text}
            </div>
          )}
        </div>

        {/* Gallery */}
        {hotel.images?.length > 1 && (
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Gallery</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {hotel.images.slice(1).map((img, i) => (
                <motion.img
                  key={i}
                  src={img.url}
                  alt={img.alt ?? hotel.name}
                  className="h-48 w-full rounded-xl object-cover"
                  whileHover={{ scale: 1.04 }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg";
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
