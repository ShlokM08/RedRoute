import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, MapPin, Minus, Plus, CheckCircle2, ChevronLeft, Home, Star, Send } from "lucide-react";
import confetti from "canvas-confetti";

/* ------------ tiny auth helper ------------ */
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

/* ------------ types ------------ */
type ReviewUser = { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
type Review = {
  id: number;
  userId: string;
  rating: number;
  title?: string | null;
  body: string;
  createdAt: string;
  user?: ReviewUser;
};

type EventItem = {
  id: number;
  name: string;
  description: string;
  location: string;
  startsAt: string; // ISO
  price: number;
  capacity?: number;
  imageUrl: string;
  imageAlt?: string | null;

  // optional review payloads if API includes them
  reviews?: Review[];
  reviewsAvg?: number | null;
  reviewsCount?: number | null;
};
type CreatedEventBooking = {
  id: number;
  eventId: number;
  qty: number;
  totalCost: number;
  contactEmail?: string | null;
};

/* ------------ utils ------------ */
function fmtWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
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

/* ------------ confetti hook (50% intensity, evenly spread) ------------ */
function useCelebration() {
  const rafRef = useRef<number | null>(null);
  const flipRef = useRef(0);

  function stop() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }
  function start(durationMs = 2800) {
    stop();
    const base = { startVelocity: 45, ticks: 200, zIndex: 9999 };
    const end = Date.now() + durationMs;

    const run = () => {
      const left = end - Date.now();
      if (left <= 0) return stop();

      const progress = left / durationMs;
      const particleCount = Math.max(6, Math.floor(35 * progress));
      const flip = (flipRef.current ^= 1);
      const rand = (a: number, b: number) => Math.random() * (b - a) + a;

      if (flip) {
        confetti({ ...base, particleCount, spread: 70, origin: { x: 0.05, y: 0.05 } });
        confetti({ ...base, particleCount, spread: 70, origin: { x: 0.95, y: 0.95 } });
        confetti({ ...base, particleCount: Math.ceil(particleCount * 0.8), spread: 110, origin: { x: rand(0.2, 0.8), y: 0 } });
      } else {
        confetti({ ...base, particleCount, spread: 70, origin: { x: 0.95, y: 0.05 } });
        confetti({ ...base, particleCount, spread: 70, origin: { x: 0.05, y: 0.95 } });
        confetti({ ...base, particleCount: Math.ceil(particleCount * 0.8), spread: 110, origin: { x: rand(0.2, 0.8), y: 1 } });
      }
      rafRef.current = requestAnimationFrame(run);
    };
    rafRef.current = requestAnimationFrame(run);
  }

  useEffect(() => stop, []);
  return { start, stop };
}

/* ------------ page ------------ */
export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const celebration = useCelebration();

  const [me, setMe] = useState<{ id?: string | null; email?: string | null } | null>(null);
  const [ev, setEv] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState<CreatedEventBooking | null>(null);

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
        setMe({ id: m.id, email: m.email });
        const full = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
        setContactName(full || (m.email ? m.email.split("@")[0] : ""));
        setContactEmail(m.email || "");
      } catch {}
    })();
  }, []);

  // Load event by id (hydrate reviews if included)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/events/${id}`, { credentials: "include" });
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const txt = await r.text().catch(() => "");
          throw new Error(`Expected JSON but got ${ct || "unknown"}: ${txt.slice(0, 80)}`);
        }
        if (!r.ok) {
          const j = await r.json().catch(() => null);
          throw new Error(j?.error || `Failed to load (HTTP ${r.status})`);
        }
        const e: EventItem = await r.json();
        setEv(e);

        if (Array.isArray((e as any)?.reviews)) {
          setReviews((e as any).reviews);
          setRevErr(null);
          setRevLoading(false);
        } else {
          setRevLoading(true); // defer to next effect
        }
      } catch (e: any) {
        setEv(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Load reviews: prefer /api/events/:id payload; fallback to /api/events/:id/reviews
  useEffect(() => {
    (async () => {
      if (!id) return;
      if (reviews.length) return; // already hydrated from main payload
      setRevLoading(true);
      try {
        // Try again (if first call raced)
        const r1 = await fetch(`/api/events/${id}`, { credentials: "include" });
        if (r1.ok && (r1.headers.get("content-type") || "").includes("application/json")) {
          const p1 = await r1.json().catch(() => null);
          if (p1 && Array.isArray(p1.reviews)) {
            setReviews(p1.reviews);
            setRevErr(null);
            setRevLoading(false);
            return;
          }
        }

        // Optional fallback route (only if you add it)
        const r = await fetch(`/api/events/${id}/reviews`, { credentials: "include" });
        if (r.ok) {
          const data: Review[] = await r.json();
          setReviews(Array.isArray(data) ? data : []);
          setRevErr(null);
        }
      } catch (e: any) {
        setRevErr(e?.message || "Failed to load reviews");
      } finally {
        setRevLoading(false);
      }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = useMemo(() => (!ev ? 0 : ev.price * qty), [ev, qty]);
  const valid = !!ev && qty > 0;

  const avgRating = useMemo(() => {
    if (ev?.reviewsAvg != null) return ev.reviewsAvg;
    if (!reviews.length) return null;
    const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [ev?.reviewsAvg, reviews]);

  async function payAndBook() {
    try {
      setMsg(null);
      if (!valid) throw new Error("Missing details.");
      if (!me) throw new Error("Not authenticated.");
      setBusy(true);

      const r = await fetch("/api/event-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeadersFrom(me) },
        credentials: "include",
        body: JSON.stringify({
          eventId: ev!.id,
          qty,
          contactName: contactName || null,
          contactEmail: contactEmail || null,
        }),
      });

      const raw = await r.text();
      const payload = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
      if (!r.ok) throw new Error(payload?.error || `HTTP ${r.status}`);

      setBooking(payload?.booking ?? null);
      setConfirmed(true);
      setMsg({ ok: true, text: "Tickets confirmed!" });
      celebration.start(3000);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Payment failed." });
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    try {
      if (!me) throw new Error("Please sign in to post a review.");
      if (!id) throw new Error("Missing event id.");
      if (!rating || !body.trim()) throw new Error("Please add a rating and some text.");

      setSubmitting(true);
      setFormMsg(null);

      // prefer POST /api/events/:id; fallback to /api/events/:id/reviews
      const postOnce = (url: string) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeadersFrom(me) },
          credentials: "include",
          body: JSON.stringify({ rating, title: title || null, body }),
        });

      let resp = await postOnce(`/api/events/${id}`);
      if (!resp.ok && (resp.status === 404 || resp.status === 405)) {
        resp = await postOnce(`/api/events/${id}/reviews`);
      }

      const isJson = (resp.headers.get("content-type") || "").includes("application/json");
      const payload = isJson ? await resp.json().catch(() => null) : null;
      if (!resp.ok) throw new Error(payload?.error || `HTTP ${resp.status}`);

      const created: Review = payload?.review ?? payload;
      setReviews((prev) => {
        const rest = prev.filter((x) => x.userId !== created.userId); // one review per user per event
        return [created, ...rest];
      });

      // reflect aggregates if returned
      if (payload?.reviewsAvg != null || payload?.reviewsCount != null) {
        setEv((e) =>
          e
            ? {
                ...e,
                reviewsAvg: payload?.reviewsAvg != null ? Number(payload.reviewsAvg) : e.reviewsAvg ?? null,
                reviewsCount:
                  payload?.reviewsCount != null ? Number(payload.reviewsCount) : e.reviewsCount ?? null,
              }
            : e
        );
      }

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

  if (loading) {
    return <div className="min-h-screen bg-black text-white grid place-items-center">Loading…</div>;
  }
  if (!ev) {
    return <div className="min-h-screen bg-black text-white grid place-items-center">Event not found</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Fixed Home button (always visible) */}
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
        {/* LEFT: event card + confirmation banner */}
        <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="relative h-72 w-full overflow-hidden rounded-2xl">
            <img
              src={ev.imageUrl}
              alt={ev.imageAlt ?? ev.name}
              className="h-full w-full object-cover"
              onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg")}
            />
          </div>

          <h1 className="mt-4 text-2xl font-extrabold">{ev.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-white/80 text-sm">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {fmtWhen(ev.startsAt)}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {ev.location}</span>
          </div>

          <p className="mt-4 text-white/85">{ev.description}</p>

          {confirmed && (
            <div className="mt-5 rounded-2xl border border-green-600/30 bg-green-600/15 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                <div>
                  <div className="text-lg font-semibold text-green-400">Tickets confirmed!</div>
                  <div className="text-white/85">
                    You’re all set for <strong>{ev.name}</strong> on <strong>{fmtWhen(ev.startsAt)}</strong>.{" "}
                    {booking?.contactEmail ? <>A confirmation email was sent to <strong>{booking.contactEmail}</strong>.</> : null}
                  </div>
                  <div className="mt-2 text-xs text-white/70">
                    Reference: <span className="font-mono">{booking?.id ?? "—"}</span> • Qty: {booking?.qty ?? qty} • Paid: $
                    {(booking?.totalCost ?? subtotal).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </article>

        {/* RIGHT: purchase panel / receipt */}
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 h-fit">
          {!confirmed ? (
            <>
              <div className="text-lg font-semibold mb-3">Get tickets</div>

              <div className="mb-2 text-sm text-white/80">Contact</div>
              <input
                className="mb-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                placeholder="Contact name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
              <input
                className="mb-4 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                placeholder="Contact email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />

              <div className="mb-2 text-sm text-white/80">Tickets</div>
              <div className="mb-4 inline-flex items-center gap-2">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-12 text-center text-base tabular-nums">{qty}</div>
                <button
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/20"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Price</span>
                <span>${ev.price.toLocaleString()}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span>Qty</span>
                <span>{qty}</span>
              </div>
              <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-lg font-bold">${subtotal.toLocaleString()}</span>
              </div>

              {msg && (
                <div className={`mt-3 text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`} aria-live="polite">
                  {msg.text}
                </div>
              )}

              <button
                disabled={!valid || busy}
                onClick={payAndBook}
                className="mt-4 h-11 w-full rounded-xl font-semibold hover:brightness-110 disabled:opacity-60"
                style={{ background: "#E50914" }}
              >
                {busy ? "Processing…" : "Pay & Confirm"}
              </button>

              <button
                onClick={() => navigate(-1)}
                className="mt-2 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            </>
          ) : (
            <div>
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-green-500/15 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="text-center text-lg font-semibold">Tickets confirmed</div>
              <p className="mt-1 text-center text-sm text-white/70">
                Enjoy the show! Your purchase details are saved below.
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                <div className="flex items-center justify-between py-1"><span>Event</span><span className="font-medium">{ev.name}</span></div>
                <div className="flex items-center justify-between py-1"><span>When</span><span className="font-medium">{fmtWhen(ev.startsAt)}</span></div>
                <div className="flex items-center justify-between py-1"><span>Tickets</span><span className="font-medium">{booking?.qty ?? qty}</span></div>
                <div className="flex items-center justify-between py-1"><span>Total paid</span><span className="font-bold">${(booking?.totalCost ?? subtotal).toLocaleString()}</span></div>
                <div className="flex items-center justify-between py-1"><span>Reference</span><span className="font-mono">{booking?.id ?? "—"}</span></div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* REVIEWS (mirrors HotelDetail) */}
      <div className="mx-auto max-w-5xl p-6">
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
              const displayName =
                (r.user?.firstName || r.user?.lastName)
                  ? [r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ")
                  : (r.user?.email || "Guest");
              return (
                <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xs font-semibold">
                      {initials(displayName, r.user?.email)}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">{displayName}</div>
                        <div className="text-xs text-white/60">{fmtDate(r.createdAt)}</div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <Stars value={r.rating} />
                        {r.title && <span className="text-white/80 font-medium">• {r.title}</span>}
                      </div>
                      <p className="mt-2 text-white/80 whitespace-pre-wrap">{r.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

//just sending a commits
