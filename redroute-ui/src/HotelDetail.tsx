// src/HotelDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, MapPin, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------- auth helper (keeps real user) -------------------- */
// async function getAuthHeaders(): Promise<Record<string, string>> {
//   const r = await fetch("/api/auth/me", { credentials: "include" });
//   if (!r.ok) throw new Error("Not authenticated");
//   const me = await r.json().catch(() => ({}));
//   const id = me?.user?.id ?? me?.id ?? null;
//   const email = me?.user?.email ?? me?.email ?? null;
//   if (id) return { "x-user-id": String(id) };
//   if (email) return { "x-user-email": String(email) };
//   throw new Error("Not authenticated");
// }

/* ------------------------- types & helpers ------------------------- */
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
function fmtDateYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ~~~~~~~~~~~~~~~~~~~~~ DateRangePopover (pill calendar) ~~~~~~~~~~~~~~~~~~~~~ */
type DayCell = { date: Date; currentMonth: boolean; isToday: boolean };

const isSameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isWithin = (d: Date, a: Date | null, b: Date | null) => {
  if (!a || !b) return false;
  const t = +new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const t1 = +new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const t2 = +new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const [min, max] = t1 <= t2 ? [t1, t2] : [t2, t1];
  return t > min && t < max;
};

const fmtShort = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

function useMonthMatrix(year: number, month: number) {
  return useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: DayCell[] = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const date = new Date(year, month - 1, d);
      cells.push({ date, currentMonth: false, isToday: isSameDate(date, new Date()) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, currentMonth: true, isToday: isSameDate(date, new Date()) });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1]?.date ?? new Date(year, month, 1);
      const date = new Date(last);
      date.setDate(date.getDate() + 1);
      cells.push({ date, currentMonth: false, isToday: isSameDate(date, new Date()) });
    }
    return cells;
  }, [year, month]);
}

function DateRangePopover({
  startYMD,
  endYMD,
  onChange,
  placeholder = "Select dates",
}: {
  startYMD: string;
  endYMD: string;
  onChange: (start: string, end: string) => void; // YYYY-MM-DD
  placeholder?: string;
}) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const initStart = startYMD ? new Date(startYMD) : null;
  const initEnd = endYMD ? new Date(endYMD) : null;
  const [start, setStart] = useState<Date | null>(initStart);
  const [end, setEnd] = useState<Date | null>(initEnd);

  useEffect(() => {
    setStart(startYMD ? new Date(startYMD) : null);
    setEnd(endYMD ? new Date(endYMD) : null);
  }, [startYMD, endYMD]);

  const now = new Date();
  const [viewY, setViewY] = useState((start ?? now).getFullYear());
  const [viewM, setViewM] = useState((start ?? now).getMonth());

  const cells = useMonthMatrix(viewY, viewM);
  const monthName = (y: number, m: number) =>
    new Date(y, m, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

  const label =
    start && end ? `${fmtShort(start)} — ${fmtShort(end)}` : start ? `${fmtShort(start)} — …` : "";

  const onPrev = () => {
    const m = viewM - 1;
    if (m < 0) {
      setViewM(11);
      setViewY((y) => y - 1);
    } else setViewM(m);
  };
  const onNext = () => {
    const m = viewM + 1;
    if (m > 11) {
      setViewM(0);
      setViewY((y) => y + 1);
    } else setViewM(m);
  };

  const onPick = (d: Date) => {
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
    } else {
      const newStart = start;
      const newEnd = d;
      setEnd(d);
      setTimeout(() => {
        onChange(fmtDateYMD(newStart), fmtDateYMD(newEnd));
        setOpen(false);
      }, 80);
    }
  };

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (
        popRef.current &&
        !popRef.current.contains(t) &&
        anchorRef.current &&
        !anchorRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const selected = (d: Date) =>
    (start && isSameDate(d, start)) || (end && isSameDate(d, end));
  const inRange = (d: Date) => isWithin(d, start, end);

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        className="h-10 w-full rounded-xl px-3 text-left text-sm border border-white/15 bg-white/5 text-white/90 hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/60"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {label || placeholder}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="absolute z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(0,0,0,0.7)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.45)]"
            role="dialog"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.06]">
              <button
                onClick={onPrev}
                className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/10 text-white hover:bg-white/20"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-sm font-semibold">{monthName(viewY, viewM)}</div>
              <button
                onClick={onNext}
                className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/10 text-white hover:bg-white/20"
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="px-3 py-2">
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-white/60">
                {dow.map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map(({ date, currentMonth, isToday }, idx) => (
                  <button
                    key={idx}
                    onClick={() => onPick(date)}
                    className={[
                      "relative h-10 rounded-lg text-sm",
                      "border border-white/10",
                      currentMonth ? "text-white/90" : "text-white/40",
                      "bg-white/5 hover:bg-white/10",
                      selected(date) ? "bg-[#E50914] text-white border-[#E50914]" : "",
                      inRange(date) ? "bg-white/10" : "",
                      isToday && !selected(date) ? "ring-1 ring-white/30" : "",
                    ].join(" ")}
                    title={date.toDateString()}
                  >
                    {date.getDate()}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-white/60">
                <span>Pick start, then end</span>
                <button
                  className="underline hover:text-white"
                  onClick={() => { setStart(null); setEnd(null); onChange("", ""); }}
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =============================== PAGE ================================= */
export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const today = new Date();
  const [checkIn, setCheckIn] = useState<string>(fmtDateYMD(plusDays(today, 1)));
  const [checkOut, setCheckOut] = useState<string>(fmtDateYMD(plusDays(today, 3)));
  const [guests, setGuests] = useState<number>(2);

  const [busy] = useState(false);
  const [reserveMsg, setReserveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const ci = useMemo(() => (checkIn ? new Date(checkIn) : null), [checkIn]);
  const co = useMemo(() => (checkOut ? new Date(checkOut) : null), [checkOut]);
  const datesValid = useMemo(() => !!(ci && co && +co > +ci), [ci, co]);

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
          const txt = await r.text().catch(() => "");
          throw new Error(`Expected JSON but got ${ct || "unknown"}: ${txt.slice(0, 80)}`);
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
  if (!hotel || !id) return;
  if (!datesValid) {
    setReserveMsg({ ok: false, text: "Please select a valid date range." });
    return;
  }
  const totalGuests = Math.max(1, Math.min(cap, guests));
  navigate("/checkout", {
    state: {
      hotelId: Number(id),
      name: hotel.name,
      city: hotel.city,
      image: hotel.images?.[0]?.url || "/images/featured_hotel.avif",
      price: hotel.price,          // nightly
      checkIn,
      checkOut,
      guests: totalGuests,
    },
  });
}


  /* --------------------------- UI (your style) -------------------------- */
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

            {/* Reserve panel */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:items-end">
                <div className="md:col-span-2">
                  <div className="mb-1 text-sm text-white/80">Dates</div>
                  <DateRangePopover
                    startYMD={checkIn}
                    endYMD={checkOut}
                    onChange={(s, e) => {
                      setCheckIn(s);
                      setCheckOut(e);
                    }}
                    placeholder="Select dates"
                  />
                </div>

                <label className="text-sm">
                  <span className="mb-1 block text-white/80">Guests (max {cap})</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white text-black hover:bg-white/90"
                      aria-label="Decrease guests"
                    >
                      <Minus className="size-4" />
                    </button>

                    <div className="w-8 text-center text-sm tabular-nums">{guests}</div>

                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.min(cap, g + 1))}
                      className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white text-black hover:bg-white/90"
                      aria-label="Increase guests"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
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
