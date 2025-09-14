// src/HotelDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";

/* -------- auth helper added (keeps UI unchanged) -------- */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const r = await fetch("/api/auth/me", { credentials: "include" });
    if (!r.ok) throw new Error("Not authenticated");
    const me = await r.json().catch(() => ({}));
    const id = (me?.user?.id ?? me?.id) as string | undefined;
    const email = (me?.user?.email ?? me?.email) as string | undefined;
    if (id) return { "x-user-id": String(id) };
    if (email) return { "x-user-email": String(email) };
  } catch {}
  throw new Error("Not authenticated");
}

type HotelImage = { url: string; alt?: string | null };
type Hotel = {
  id: number;                 // DB is Int → number
  name: string;
  city: string;
  price: number;
  rating: number | null;
  capacity: number;           // returned by /api/hotels/:id
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

  const today = new Date();
  const [checkIn, setCheckIn] = useState<string>(fmtDate(plusDays(today, 1)));
  const [checkOut, setCheckOut] = useState<string>(fmtDate(plusDays(today, 3)));
  const [guests, setGuests] = useState<number>(2);

  const [busy, setBusy] = useState(false);
  const [reserveMsg, setReserveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const ci = useMemo(() => (checkIn ? new Date(checkIn) : null), [checkIn]);
  const co = useMemo(() => (checkOut ? new Date(checkOut) : null), [checkOut]);
  const datesValid = useMemo(() => {
    if (!ci || !co) return false;
    return +co > +ci;
  }, [ci, co]);

  useEffect(() => {
    (async () => {
      if (!id) {
        setErr("Missing hotel id");
        setLoading(false);
        return;
      }

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

    return () => abortRef.current?.abort();
  }, [id]);

  const cap = hotel?.capacity ?? 10;

  async function reserve() {
    setReserveMsg(null);
    if (!hotel || !id) return;

    if (!datesValid) {
      setReserveMsg({ ok: false, text: "Please select a valid date range." });
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
          hotelId: Number(id), // route param → number
          checkIn,
          checkOut,
          guests,
        }),
      });

      const isJson = (r.headers.get("content-type") || "").includes("application/json");
      const payload = isJson ? await r.json().catch(() => null) : null;

      if (!r.ok) throw new Error(payload?.error || `Failed (HTTP ${r.status})`);

      setReserveMsg({ ok: true, text: "Reserved! We’ve saved your booking details." });
    } catch (e: any) {
      setReserveMsg({ ok: false, text: e?.message || "Could not complete reservation." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm 
        font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/20"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {loading && (
        <div className="mx-auto max-w-5xl p-6">
          <div className="h-72 w-full rounded-2xl bg-white/5 border border-white/10 animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {!loading && err && (
        <div className="max-w-3xl mx-auto p-6">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-white/80 mb-4">{err}</p>
            <button
              onClick={() => navigate("/home")}
              className="rounded-xl bg-[#E50914] px-5 py-2 font-semibold hover:brightness-110"
            >
              Go Home
            </button>
          </div>
        </div>
      )}

      {!loading && !err && hotel && (
        <>
          {/* HERO */}
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

          {/* CONTENT */}
          <div className="mx-auto max-w-5xl p-6 space-y-10">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">{hotel.name}</h1>
                <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
                  <Star className="h-4 w-4" />
                  {hotel.rating ?? "—"} • Capacity {cap}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">${hotel.price}</div>
                <div className="text-xs text-white/60">per night</div>
              </div>
            </div>

            {/* Reserve panel (your UI) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:items-end">
                <label className="text-sm">
                  <span className="mb-1 block text-white/80">Check-in</span>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-600/60"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-white/80">Check-out</span>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-600/60"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-white/80">Guests (max {cap})</span>
                  <input
                    type="number"
                    min={1}
                    max={cap}
                    value={guests}
                    onChange={(e) =>
                      setGuests(Math.max(1, Math.min(cap, Number(e.target.value) || 1)))
                    }
                    className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-600/60"
                  />
                </label>
                <div className="md:col-span-2">
                  <button
                    onClick={reserve}
                    disabled={busy}
                    className="h-10 w-full rounded-xl bg-[#E50914] text-sm font-semibold hover:brightness-110 disabled:opacity-60"
                  >
                    {busy ? "Reserving…" : "Reserve Now"}
                  </button>
                  {reserveMsg && (
                    <div
                      className={`mt-2 text-sm ${
                        reserveMsg.ok ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {reserveMsg.text}
                    </div>
                  )}
                </div>
              </div>
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

            {/* Overview */}
            <div>
              <h2 className="mb-2 text-2xl font-semibold">Overview</h2>
              <p className="text-white/80">
                A modern stay in {hotel.city}, rated {hotel.rating ?? "—"}★ and starting at ${hotel.price}/night,
                awaits travelers looking for more than just a room. Perfect for a cinematic escape with RedRoute’s
                signature glow, feather-light interactions, and ultra-fast booking.
                <br />
                <br />
                Wake up to skyline views, unwind in a lobby that hums with style, and head out to
                explore local food, music, and culture — all a stone’s throw away. Expect streaming-fast Wi-Fi,
                generous beds, rain showers, and a breakfast spread that just hits.
                <br />
                <br />
                Located in the heart of {hotel.city}, you’ll be steps from cultural landmarks, buzzing nightlife, and
                hidden gems known only to locals. Whether you’re planning a romantic weekend, an adventure with friends,
                or a solo city break, the combination of attentive service, world-class amenities, and effortless
                RedRoute booking makes this hotel the perfect base for memories that linger long after checkout.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
