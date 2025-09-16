import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Home, MapPin, Minus, Plus, Send, Star } from "lucide-react";

/* -------------------- tiny auth helper (for posting reviews) -------------------- */
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

/* ---------------------------------- types ---------------------------------- */
type ReviewUser = { firstName?: string | null; lastName?: string | null; email?: string | null };
type Review = {
  id: string;
  hotelId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  user?: ReviewUser | null;
};
type Hotel = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  price: number | null;
  rating: number | null;        // server returns avg rating here
  reviewsCount?: number | null; // server returns count here
  reviews?: Review[];           // included by GET /api/hotels/:id
  // ...any other fields you already render
};

/* --------------------------------- utils ----------------------------------- */
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
  const full = Math.floor(value ?? 0);
  const arr = Array.from({ length: 5 });
  return (
    <div className="inline-flex items-center gap-0.5">
      {arr.map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < full ? "fill-yellow-400 text-yellow-400" : "text-white/30"}
        />
      ))}
      <span className="ml-1 text-xs text-white/70">{Number(value ?? 0).toFixed(1)}</span>
    </div>
  );
}
function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/* -------------------------------- component -------------------------------- */
export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [me, setMe] = useState<{ id: string | null; email: string | null } | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // booking box (keep your existing state/UI)
  const [nights, setNights] = useState(1);
  const [guests, setGuests] = useState(2);

  // reviews state (now hydrated from GET /api/hotels/:id)
  const [reviews, setReviews] = useState<Review[]>([]);
  const avgRating = useMemo(
    () => (hotel?.rating != null ? Number(hotel.rating) : reviews.length ? average(reviews.map(r => r.rating)) : 0),
    [hotel?.rating, reviews]
  );

  // review form
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Load hotel (and reviews) + current user
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [meVal, hotelRes] = await Promise.all([
          getMe().catch(() => ({ id: null, email: null })),
          fetch(`/api/hotels/${id}`, { credentials: "include" }),
        ]);

        const payload = await hotelRes.json().catch(() => ({}));
        if (!hotelRes.ok) throw new Error(payload?.error || `HTTP ${hotelRes.status}`);
        if (!alive) return;

        setMe({ id: meVal?.id ?? null, email: meVal?.email ?? null });

        // hydrate hotel & reviews from the same payload
        setHotel(payload as Hotel);
        setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load hotel");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function submitReview() {
    setPosting(true);
    setFormMsg(null);
    try {
      const r = await fetch(`/api/hotels/${id}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeadersFrom(me || {}),
        },
        body: JSON.stringify({
          rating,
          title: title || null,
          body,
        }),
      });

      const payload = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(payload?.error || `HTTP ${r.status}`);

      // API may return { review, reviewsAvg, reviewsCount }
      const created: Review = payload?.review ?? payload;
      setReviews(prev => {
        // upsert by userId (assumes one review per user per hotel)
        const rest = prev.filter(x => x.userId !== created.userId);
        return [created, ...rest];
      });

      // update displayed average/count if provided by API
      setHotel(h =>
        h
          ? {
              ...h,
              rating: payload?.reviewsAvg != null ? Number(payload.reviewsAvg) : h.rating,
              reviewsCount:
                payload?.reviewsCount != null
                  ? Number(payload.reviewsCount)
                  : (h.reviewsCount ?? reviews.length) + 1,
            }
          : h
      );

      setTitle("");
      setBody("");
      setRating(5);
      setFormMsg("Thanks! Your review was posted.");
    } catch (e: any) {
      setFormMsg(e?.message || "Failed to post review");
    } finally {
      setPosting(false);
    }
  }

  function reserve() {
    navigate(`/checkout/${id}?nights=${nights}&guests=${guests}`);
  }

  if (loading) return <div className="p-6 text-white/80">Loading…</div>;
  if (err) return <div className="p-6 text-red-400">Error: {err}</div>;
  if (!hotel) return <div className="p-6 text-white/80">Hotel not found.</div>;

  return (
    <div className="mx-auto max-w-6xl p-6 text-white">
      <button
        onClick={() => navigate("/")}
        className="mb-4 inline-flex items-center gap-2 text-white/70 hover:text-white"
      >
        <Home size={16} /> Back to home
      </button>

      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        {/* ------------------------------ main pane ------------------------------ */}
        <main>
          <h1 className="text-3xl font-bold">{hotel.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-white/70">
            <span className="inline-flex items-center gap-1">
              <MapPin size={16} />
              {hotel.address || hotel.city || "—"}
            </span>
            <span>•</span>
            <Stars value={avgRating || 0} />
            {hotel.reviewsCount != null && (
              <span className="text-xs text-white/60">
                ({hotel.reviewsCount} reviews)
              </span>
            )}
          </div>

          {/* ------------------------------ reviews ------------------------------ */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Reviews</h2>

            {reviews.length === 0 ? (
              <div className="mt-3 text-white/60">No reviews yet. Be the first!</div>
            ) : (
              <ul className="mt-4 space-y-4">
                {reviews.map((rev) => (
                  <li key={rev.id} className="rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                          {initials(
                            [rev.user?.firstName, rev.user?.lastName].filter(Boolean).join(" "),
                            rev.user?.email || undefined
                          )}
                        </div>
                        <div className="leading-tight">
                          <div className="text-sm font-semibold">
                            {[rev.user?.firstName, rev.user?.lastName]
                              .filter(Boolean)
                              .join(" ") || rev.user?.email || "Guest"}
                          </div>
                          <div className="text-xs text-white/50">{fmtDate(rev.createdAt)}</div>
                        </div>
                      </div>
                      <Stars value={rev.rating} size={14} />
                    </div>
                    {rev.title && <div className="mt-2 font-medium">{rev.title}</div>}
                    <p className="mt-1 text-white/80">{rev.body}</p>
                  </li>
                ))}
              </ul>
            )}

            {/* ---------------------------- add a review ---------------------------- */}
            <div className="mt-6 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-semibold">Add your review</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2">
                  <span className="w-24 text-sm text-white/70">Rating</span>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full rounded-lg bg-white/10 p-2 text-sm outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-24 text-sm text-white/70">Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short headline (optional)"
                    className="w-full rounded-lg bg-white/10 p-2 text-sm outline-none"
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-sm text-white/70">Your review</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share details about your stay…"
                  rows={4}
                  className="w-full rounded-lg bg-white/10 p-2 text-sm outline-none"
                />
              </label>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={submitReview}
                  disabled={posting || !body.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-black hover:brightness-95 disabled:opacity-60"
                >
                  <Send size={16} /> {posting ? "Posting…" : "Post review"}
                </button>
                {formMsg && <span className="text-sm text-white/80">{formMsg}</span>}
              </div>
            </div>
          </section>
        </main>

        {/* ----------------------------- right sidebar ---------------------------- */}
        <aside className="rounded-xl border border-white/10 p-4">
          <div className="text-lg font-semibold">
            From {hotel.price != null ? `$${hotel.price}/night` : "—"}
          </div>
          <div className="mt-2 text-sm text-white/70">Flexible cancellation</div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-2">
              <span className="text-sm text-white/70">Nights</span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md bg-white/10 p-1"
                  onClick={() => setNights((n) => Math.max(1, n - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center">{nights}</span>
                <button className="rounded-md bg-white/10 p-1" onClick={() => setNights((n) => n + 1)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-white/5 p-2">
              <span className="text-sm text-white/70">Guests</span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md bg-white/10 p-1"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center">{guests}</span>
                <button className="rounded-md bg-white/10 p-1" onClick={() => setGuests((g) => g + 1)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
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
