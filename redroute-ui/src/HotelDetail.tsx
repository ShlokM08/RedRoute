import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, MapPin, Minus, Plus, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------- auth helper (for posting reviews) -------------------- */
async function getMe() {
  const r = await fetch("/api/auth/me", { credentials: "include" });
  if (!r.ok) throw new Error("Not authenticated");
  const me = await r.json().catch(() => ({}));
  return {
    id: me?.user?.id ?? me?.id ?? null,
    email: me?.user?.email ?? me?.email ?? null,
    firstName: me?.user?.firstName ?? me?.firstName ?? null,
    lastName: me?.user?.lastName ?? me?.lastName ?? null,
  };
}
function authHeadersFrom(me: { id?: string | null; email?: string | null }) {
  const h: Record<string, string> = {};
  if (me.id) h["x-user-id"] = String(me.id);
  if (me.email) h["x-user-email"] = String(me.email);
  return h;
}

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

type Review = {
  id: number;
  userId: string;
  rating: number;
  title?: string | null;
  body: string;
  createdAt: string;
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
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
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function initials(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    return (parts[0][0] || "") + (parts[1]?.[0] || "");
  }
  const e = (email || "").trim();
  return e ? e[0]?.toUpperCase() || "U" : "U";
}
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const arr = [0, 1, 2, 3, 4];
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value.toFixed(1)} / 5`}>
      {arr.map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          stroke="currentColor"
          fill={i < full ? "currentColor" : hasHalf && i === full ? "url(#half)" : "none"}
        />
      ))}
      <svg width="0" height="0">
        <defs>
          <linearGradient id="half">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
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
            className="absolute z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-white/12 bg[rgba(0,0,0,0.7)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.45)]"
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

  const [me, setMe] = useState<{ id?: string | null; email?: string | null; firstName?: string | null; lastName?: string | null } | null>(null);

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

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [revLoading, setRevLoading] = useState(true);
  const [revErr, setRevErr] = useState<string | null>(null);

  // New review
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await getMe();
        setMe(m);
      } catch {}
    })();
  }, []);

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

        // ⬇️ NEW: hydrate reviews from the same payload (if provided by API)
        try {
          const payloadAny = data as unknown as any;
          if (Array.isArray(payloadAny?.reviews)) {
            setReviews(payloadAny.reviews);
            setRevErr(null);
            setRevLoading(false);
          }
        } catch {}

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

  // Load reviews (from the SAME endpoint) — keeps your UI flow intact
  useEffect(() => {
    (async () => {
      if (!id) return;
      setRevLoading(true);
      try {
        // ⬇️ CHANGED: call /api/hotels/:id and read .reviews (no /reviews sub-route)
        const r = await fetch(`/api/hotels/${id}`, { credentials: "include" });
        const isJson = (r.headers.get("content-type") || "").includes("application/json");
        const payload = isJson ? await r.json().catch(() => null) : null;
        if (!r.ok) throw new Error(payload?.error || `HTTP ${r.status}`);

        const list = Array.isArray(payload?.reviews) ? payload.reviews : [];
        setReviews(list);
        setRevErr(null);
      } catch (e: any) {
        setRevErr(e?.message || "Failed to load reviews");
      } finally {
        setRevLoading(false);
      }
    })();
  }, [id]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return hotel?.rating ?? null;
    const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews, hotel?.rating]);

  const cap = hotel?.capacity ?? 10;

  async function reserve() {
    if (!hotel || !id) return;

    if (!datesValid) {
      setReserveMsg?.({ ok: false, text: "Please select a valid date range." });
      return;
    }
    const totalGuests = Math.max(1, Math.min(cap, guests));

    const payload = {
      hotelId: Number(id),
      name: hotel.name,
      city: hotel.city,
      image: hotel.images?.[0]?.url || "/images/featured_hotel.avif",
      price: hotel.price, // nightly
      checkIn,
      checkOut,
      guests: totalGuests,
    };

    try { sessionStorage.setItem("rr_checkout", JSON.stringify(payload)); } catch {}
    navigate("/checkout", { state: payload });
  }

  async function submitReview() {
    try {
      if (!me) throw new Error("Please sign in to post a review.");
      if (!id) throw new Error("Missing hotel id.");
      if (!rating || !body.trim()) throw new Error("Please add a rating and some text.");

      setSubmitting(true);
      setFormMsg(null);

      // ⬇️ CHANGED: POST to /api/hotels/:id (not /reviews)
      const r = await fetch(`/api/hotels/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeadersFrom(me) },
        credentials: "include",
        body: JSON.stringify({ rating, title: title || null, body }),
      });

      const isJson = (r.headers.get("content-type") || "").includes("application/json");
      const payload = isJson ? await r.json().catch(() => null) : null;
      if (!r.ok) throw new Error(payload?.error || `HTTP ${r.status}`);

      // handle either { review, reviewsAvg, reviewsCount } or just the review itself
      const created: Review = payload?.review ?? payload;
      setReviews((prev) => {
        // upsert by userId so a user edits their own review
        const rest = prev.filter(x => x.userId !== created.userId);
        return [created, ...rest];
      });

      setTitle("");
      setBody("");
      setRating(5);
      setFormMsg("Thanks! Your review was posted.");
    } catch (e: any) {
      setFormMsg(e?.message || "Could not post review.");
    } finally {
      setSubmitting(false);
    }
  }

  /* --------------------------- UI -------------------------- */
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
                <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
                  {avgRating != null && <Stars value={avgRating} />}
                  <span>{avgRating != null ? `${avgRating.toFixed(1)}★` : (hotel.rating ?? "—")}</span>
                  <span>• Capacity {hotel.capacity}</span>
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
                  <span className="mb-1 block text-white/80">Guests (max {hotel.capacity})</span>
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
                      onClick={() => setGuests((g) => Math.min(hotel.capacity, g + 1))}
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
                      className={`mt-2 text-sm ${reserveMsg.ok ? "text-green-400" : "text-red-400"}`}
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
                A modern stay in {hotel.city}, rated {avgRating != null ? `${avgRating.toFixed(1)}★` : `${hotel.rating ?? "—"}★`} and starting at ${hotel.price}/night,
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

            {/* REVIEWS */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Reviews</h2>
                {avgRating != null && (
                  <div className="text-sm text-white/80">
                    <Stars value={avgRating} /> <span className="ml-2">{avgRating.toFixed(1)} / 5 • {reviews.length}</span>
                  </div>
                )}
              </div>

              {/* Write review */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="mb-2 text-sm text-white/80">Write a review</div>
                <div className="mb-3 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      title={`${n} star${n > 1 ? "s" : ""}`}
                      className="hover:scale-105 transition"
                    >
                      <Star
                        className="h-6 w-6"
                        stroke="currentColor"
                        fill={n <= rating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                  <span className="text-sm text-white/70">{rating} / 5</span>
                </div>
                <input
                  className="mb-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                  placeholder="Title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  className="mb-3 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                  placeholder="Share your experience…"
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/60">
                    Be kind and constructive. One review per account.
                  </div>
                  <button
                    disabled={submitting}
                    onClick={submitReview}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-[#E50914] hover:brightness-110 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" /> {submitting ? "Posting…" : "Post"}
                  </button>
                </div>
                {formMsg && <div className="mt-2 text-sm text-white/80">{formMsg}</div>}
              </div>

              {/* List */}
              <div className="mt-4 space-y-3">
                {revLoading && <div className="text-white/70">Loading reviews…</div>}
                {!revLoading && revErr && <div className="text-red-400">{revErr}</div>}
                {!revLoading && !revErr && reviews.length === 0 && (
                  <div className="text-white/70">No reviews yet. Be the first!</div>
                )}
                {!revLoading && !revErr && reviews.map((r) => {
                  const name =
                    (r.user?.firstName || r.user?.lastName)
                      ? [r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ")
                      : (r.user?.email || "Guest");
                  return (
                    <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xs font-semibold">
                          {initials(name, r.user?.email)}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold">{name}</div>
                            <div className="text-xs text-white/60">{fmtDate(r.createdAt)}</div>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm">
                            <Stars value={r.rating} />
                            {r.title && <span className="text-white/80 font-medium">• {r.title}</span>}
                          </div>
                          <p className="mt-2 text-white/85 whitespace-pre-wrap">{r.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
