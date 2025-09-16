import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {  Home, MapPin, Minus, Plus, Send, Star } from "lucide-react";

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
  description?: string | null;
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

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function initials(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    return (parts[0][0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
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

/* ------------------------ reserve panel calc helpers ----------------------- */
function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}
const MS_PER_NIGHT = 24 * 60 * 60 * 1000;

/* ================================== PAGE ================================== */
export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // hotel data
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);

  // reserve panel
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  // auth + review form
  const [me, setMe] = useState<{ id?: string | null; email?: string | null } | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  // reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [revLoading, setRevLoading] = useState(true);
  const [revErr, setRevErr] = useState<string | null>(null);

  // fetch user (for reviews auth headers)
  useEffect(() => {
    (async () => {
      try {
        const m = await getMe();
        setMe({ id: m.id, email: m.email });
      } catch {}
    })();
  }, []);

  // fetch hotel
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/hotels/${id}`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: Hotel = await r.json();
        setHotel(data);
      } catch {
        setHotel(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // fetch reviews
  useEffect(() => {
    (async () => {
      if (!id) return;
      setRevLoading(true);
      try {
        const r = await fetch(`/api/hotels/${id}/reviews`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const arr: Review[] = await r.json();
        setReviews(Array.isArray(arr) ? arr : []);
        setRevErr(null);
      } catch (e: any) {
        setRevErr(e?.message || "Failed to load reviews");
      } finally {
        setRevLoading(false);
      }
    })();
  }, [id]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const n = Math.round((+parseYMD(checkOut) - +parseYMD(checkIn)) / MS_PER_NIGHT);
    return Math.max(0, n);
  }, [checkIn, checkOut]);

  const subtotal = useMemo(() => {
    if (!hotel || nights <= 0) return 0;
    return hotel.price * nights;
  }, [hotel, nights]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return hotel?.rating ?? null;
    const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews, hotel?.rating]);

  async function submitReview() {
    try {
      if (!me) throw new Error("Please sign in to post a review.");
      if (!id) throw new Error("Missing hotel id.");
      if (!rating || !body.trim()) throw new Error("Please add a rating and some text.");

      setSubmitting(true);
      setFormMsg(null);

      const r = await fetch(`/api/hotels/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeadersFrom(me) },
        credentials: "include",
        body: JSON.stringify({ rating, title: title || null, body }),
      });

      const isJson = (r.headers.get("content-type") || "").includes("application/json");
      const payload = isJson ? await r.json().catch(() => null) : null;
      if (!r.ok) throw new Error(payload?.error || `HTTP ${r.status}`);

      const created: Review = payload?.review ?? payload;
      setReviews((prev) => [created, ...prev]);
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

  function reserve() {
    if (!hotel) return;
    if (!checkIn || !checkOut || nights <= 0) {
      alert("Please select valid check-in and check-out dates.");
      return;
    }
    // pass data to Checkout like your existing flow
    const image = hotel.images?.[0]?.url || "/images/featured_hotel.avif";
    sessionStorage.setItem(
      "rr_checkout",
      JSON.stringify({
        hotelId: hotel.id,
        name: hotel.name,
        city: hotel.city,
        image,
        price: hotel.price,
        checkIn,
        checkOut,
        guests,
      })
    );
    navigate("/checkout", {
      state: {
        hotelId: hotel.id,
        name: hotel.name,
        city: hotel.city,
        image,
        price: hotel.price,
        checkIn,
        checkOut,
        guests,
      },
    });
  }

  if (loading) {
    return <div className="min-h-screen bg-black text-white grid place-items-center">Loading…</div>;
  }
  if (!hotel) {
    return <div className="min-h-screen bg-black text-white grid place-items-center">Hotel not found</div>;
  }

  const img = hotel.images?.[0]?.url || "/images/featured_hotel.avif";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Fixed Home button */}
      <button
        onClick={() => navigate("/home")}
        className="fixed left-5 top-5 z-[9999] inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/20"
        aria-label="Back to home"
        title="Back to home"
      >
        <Home className="h-4 w-4" />
        Home
      </button>

      <div className="mx-auto max-w-5xl p-6 grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
        {/* LEFT: Hotel details + reviews */}
        <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="relative h-72 w-full overflow-hidden rounded-2xl">
            <img
              src={img}
              alt={hotel.images?.[0]?.alt ?? hotel.name}
              className="h-full w-full object-cover"
              onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg")}
            />
          </div>

          <h1 className="mt-4 text-2xl font-extrabold">{hotel.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-white/80 text-sm">
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {hotel.city}</span>
            <span className="inline-flex items-center gap-1">
              {avgRating != null ? (
                <>
                  <Stars value={avgRating} />
                  <span className="ml-1">{avgRating.toFixed(1)}</span>
                </>
              ) : (
                <>No rating yet</>
              )}
            </span>
          </div>

          {hotel.description && <p className="mt-4 text-white/85">{hotel.description}</p>}

          {/* REVIEWS */}
          <section className="mt-8">
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
        </article>

        {/* RIGHT: Reserve panel */}
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 h-fit">
          <div className="text-lg font-semibold mb-3">Reserve</div>

          <div className="mb-2 text-sm text-white/80">Dates</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              aria-label="Check-in date"
            />
            <input
              type="date"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              aria-label="Check-out date"
            />
          </div>

          <div className="mt-4 text-sm text-white/80 mb-2">Guests</div>
          <div className="mb-4 inline-flex items-center gap-2">
            <button
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              disabled={guests <= 1}
              className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 disabled:opacity-50"
              aria-label="Decrease guests"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="w-12 text-center text-base tabular-nums">{guests}</div>
            <button
              onClick={() => setGuests((g) => Math.min(10, g + 1))}
              className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/20"
              aria-label="Increase guests"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span>Price</span>
            <span>${hotel.price.toLocaleString()} / night</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span>Nights</span>
            <span>{nights || "—"}</span>
          </div>
          <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-lg font-bold">${subtotal.toLocaleString()}</span>
          </div>

          <button
            onClick={reserve}
            className="mt-4 h-11 w-full rounded-xl font-semibold hover:brightness-110 disabled:opacity-60"
            style={{ background: "#E50914" }}
          >
            Continue to checkout
          </button>
          <div className="mt-2 text-xs text-white/60">
            By continuing, you agree to our Terms and Cancellation Policy.
          </div>
        </aside>
      </div>
    </div>
  );
}
