// src/HotelDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronLeft, Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";

type HotelImage = { url: string; alt?: string | null };
type Hotel = {
  id: string;                 // id comes in as string from URL
  name: string;
  city: string;
  price: number;
  rating: number | null;
  images: HotelImage[];
  capacity?: number | null;   // ← added; used for guest limit
};

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // reservation state
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [guests, setGuests] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [reserveMsg, setReserveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      if (!id) {
        setErr("Invalid hotel id in URL.");
        setLoading(false);
        return;
      }

      const url = `/api/hotels/${encodeURIComponent(id)}`;

      try {
        const r = await fetch(url, { credentials: "include" });

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
        // set sensible default guests within capacity
        const cap = typeof data.capacity === "number" ? data.capacity : 10;
        setGuests((g) => Math.max(1, Math.min(g, cap)));
      } catch (e: any) {
        setErr(e?.message || "Could not fetch hotel details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const cap = hotel?.capacity ?? 10;
  const mainImg = hotel?.images?.[0]?.url || "/images/featured_hotel.avif";

  function validDates() {
    if (!checkIn || !checkOut) return false;
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    return !isNaN(+ci) && !isNaN(+co) && +co > +ci;
  }

  async function reserve() {
    setReserveMsg(null);

    if (!hotel || !id) return;
    if (!validDates()) {
      setReserveMsg({ ok: false, text: "Please select a valid date range." });
      return;
    }
    if (guests < 1 || guests > cap) {
      setReserveMsg({ ok: false, text: `Guests must be between 1 and ${cap}.` });
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hotelId: Number(id), // convert route param string → number
          checkIn,
          checkOut,
          guests,
        }),
      });

      const isJson = (r.headers.get("content-type") || "").includes("application/json");
      const payload = isJson ? await r.json().catch(() => null) : null;

      if (!r.ok) {
        throw new Error(payload?.error || `Failed (HTTP ${r.status})`);
      }

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
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/20"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {loading && (
        <div className="p-6 max-w-5xl mx-auto">
          <div className="h-[50vh] w-full rounded-3xl bg-white/5 border border-white/10 animate-pulse" />
          <div className="mt-8 h-8 w-1/3 bg-white/5 rounded animate-pulse" />
          <div className="mt-4 h-4 w-2/3 bg-white/5 rounded animate-pulse" />
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
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
              className="rounded-xl bg-[#E50914] px-5 py-2 font-semibold shadow-[0_10px_30px_rgba(229,9,20,0.45)] hover:brightness-110"
            >
              Go back home
            </button>
          </div>
        </div>
      )}

      {!loading && hotel && !err && (
        <>
          {/* Hero image */}
          <div className="relative h-[50vh] w-full overflow-hidden">
            <motion.img
              src={mainImg}
              alt={hotel.name}
              className="h-full w-full object-cover"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <h1 className="text-4xl font-bold">{hotel.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-white/85">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {hotel.city}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4" /> {hotel.rating ?? "—"}
                </span>
                {typeof hotel.capacity === "number" && (
                  <span className="inline-flex items-center gap-1">
                    • Capacity: {hotel.capacity}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-5xl p-6 space-y-10">
            {/* Reserve panel */}
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
              <div className="flex-1">
                <div className="text-3xl font-bold">${hotel.price}</div>
                <div className="text-sm text-white/60">per night</div>
              </div>

              <div className="grid w-full max-w-xl grid-cols-2 gap-3 md:grid-cols-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-xs text-white/70">Check-in</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-600/60"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-xs text-white/70">Check-out</label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-red-600/60"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-xs text-white/70">
                    Guests <span className="text-white/50">(max {cap})</span>
                  </label>
                  <div className="flex h-10 items-center rounded-xl border border-white/15 bg-white/5">
                    <button
                      className="h-full w-10 rounded-l-xl border-r border-white/10 text-lg hover:bg-white/10 disabled:opacity-40"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      disabled={guests <= 1}
                      type="button"
                    >
                      –
                    </button>
                    <div className="flex-1 text-center text-sm">{guests}</div>
                    <button
                      className="h-full w-10 rounded-r-xl border-l border-white/10 text-lg hover:bg-white/10 disabled:opacity-40"
                      onClick={() => setGuests((g) => Math.min(cap, g + 1))}
                      disabled={guests >= cap}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-xs text-transparent select-none">Reserve</label>
                  <button
                    onClick={reserve}
                    disabled={busy}
                    className="h-10 w-full rounded-xl bg-[#E50914] px-6 font-semibold shadow-[0_10px_30px_rgba(229,9,20,0.45)] hover:brightness-110 disabled:opacity-60"
                  >
                    {busy ? "Reserving..." : "Reserve Now"}
                  </button>
                </div>
              </div>

              {reserveMsg && (
                <div
                  className={`mt-2 text-sm ${
                    reserveMsg.ok ? "text-emerald-400" : "text-red-400"
                  }`}
                >
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

            {/* Overview */}
            <div>
              <h2 className="mb-2 text-2xl font-semibold">Overview</h2>
              <p className="text-white/80">
                A modern stay in {hotel.city}, rated {hotel.rating ?? "—"}★ and starting at $
                {hotel.price}/night, awaits travelers looking for more than just a room. Perfect for
                a cinematic escape with RedRoute’s lightning-fast checkout, this hotel wraps
                contemporary design around classic comfort to create an unforgettable experience.
                <br />
                <br />
                Step into spacious, light-filled rooms featuring plush bedding, designer
                furnishings, and tech-forward touches like smart climate control and high-speed
                Wi-Fi. Many rooms open to sweeping city views or private balconies—ideal for morning
                coffee or sunset cocktails. Indulge in a rooftop pool that glows after dark, an
                inviting spa for mid-journey rejuvenation, and a vibrant lounge where local music
                and signature drinks set the tone for the night.
                <br />
                <br />
                Located in the heart of {hotel.city}, you’ll be steps from cultural landmarks,
                buzzing nightlife, and hidden gems known only to locals. Whether you’re planning a
                romantic weekend, an adventure with friends, or a solo city break, the combination
                of attentive service, world-class amenities, and effortless RedRoute booking makes
                this hotel the perfect base for memories that linger long after checkout.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
