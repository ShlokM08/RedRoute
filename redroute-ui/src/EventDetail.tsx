// src/EventDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Star, Calendar, MapPin, ChevronLeft } from "lucide-react";

/* ----------------- small helpers ----------------- */
async function getMe() {
  const r = await fetch("/api/auth/me", { credentials: "include" });
  if (!r.ok) return { id: null, email: null, firstName: null, lastName: null };
  const j = await r.json().catch(() => ({}));
  return {
    id: j?.user?.id ?? j?.id ?? null,
    email: j?.user?.email ?? j?.email ?? null,
    firstName: j?.user?.firstName ?? j?.firstName ?? null,
    lastName: j?.user?.lastName ?? j?.lastName ?? null,
  };
}
function authHeadersFrom(me: { id?: string | null; email?: string | null }) {
  const h: Record<string, string> = {};
  if (me.id) h["x-user-id"] = String(me.id);
  if (me.email) h["x-user-email"] = String(me.email);
  return h;
}
async function safeJson(r: Response) {
  const ct = (r.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return r.json();
  const text = await r.text();
  try { return JSON.parse(text); } catch { return null; }
}

type EventType = {
  id: number;
  name: string;
  description: string;
  location: string;
  startsAt: string; // ISO
  price: number;
  capacity: number;
  imageUrl: string;
  imageAlt?: string | null;
};

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });

/* ----------------- reviews types ----------------- */
type PublicUser = { firstName: string | null; lastName: string | null; email: string | null } | null;
type Review = {
  id: number;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  user: PublicUser;
};

/* ----------------- star ui ----------------- */
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="shrink-0"
          width={size}
          height={size}
          {...(i < full ? { fill: "currentColor" } : {})}
        />
      ))}
    </div>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`p-1 rounded ${active ? "text-yellow-400" : "text-white/40"} hover:text-yellow-300`}
            aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          >
            <Star className={active ? "fill-current" : ""} />
          </button>
        );
      })}
    </div>
  );
}

/* ----------------- reusable reviews section ----------------- */
function ReviewsSection({ eventId }: { eventId: number }) {
  const [me, setMe] = useState<{ id: string | null; email: string | null }>({ id: null, email: null });
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Review[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // form
  const myExisting = useMemo(
    () => items.find((r) => r.userId === me.id) || null,
    [items, me.id]
  );
  const [rating, setRating] = useState<number>(myExisting?.rating || 5);
  const [title, setTitle] = useState<string>(myExisting?.title || "");
  const [body, setBody] = useState<string>(myExisting?.body || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const avg = useMemo(() => {
    if (items.length === 0) return null;
    const s = items.reduce((a, b) => a + (b.rating || 0), 0);
    return Math.round((s / items.length) * 10) / 10;
  }, [items]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const auth = await getMe();
        setMe({ id: auth.id, email: auth.email });

        const r = await fetch(`/api/events/${eventId}/reviews`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: Review[] = await safeJson(r);
        setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load reviews");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  useEffect(() => {
    if (myExisting) {
      setRating(myExisting.rating);
      setTitle(myExisting.title || "");
      setBody(myExisting.body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myExisting?.id]);

  async function submit() {
    try {
      setSubmitting(true);
      setSubmitMsg(null);
      if (!me.id && !me.email) throw new Error("Please log in to submit a review.");

      const r = await fetch(`/api/events/${eventId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeadersFrom(me),
        },
        credentials: "include",
        body: JSON.stringify({
          rating,
          title: title.trim() || null,
          body: body.trim(),
        }),
      });
      const payload = await safeJson(r);
      if (!r.ok) throw new Error(payload?.error || `HTTP ${r.status}`);

      const saved: Review | null = payload?.review ?? null;
      if (saved) {
        setItems((prev) => {
          const i = prev.findIndex((x) => x.id === saved.id || x.userId === saved.userId);
          if (i >= 0) {
            const copy = prev.slice();
            copy[i] = saved;
            return copy;
          }
          return [saved, ...prev];
        });
      } else {
        const rr = await fetch(`/api/events/${eventId}/reviews`, { credentials: "include" });
        if (rr.ok) setItems((await safeJson(rr)) || []);
      }
      setSubmitMsg("Saved! Thank you for your review.");
    } catch (e: any) {
      setSubmitMsg(e?.message || "Could not save review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Attendee Reviews</h3>
        <div className="text-sm text-white/80">
          {avg != null ? (
            <span className="inline-flex items-center gap-2">
              <Stars value={avg} />
              <span>{avg} · {items.length} review{items.length === 1 ? "" : "s"}</span>
            </span>
          ) : (
            <span>No reviews yet</span>
          )}
        </div>
      </div>

      {/* list */}
      {loading ? (
        <div className="text-white/70">Loading reviews…</div>
      ) : err ? (
        <div className="text-red-400">{err}</div>
      ) : items.length === 0 ? (
        <div className="text-white/70">Be the first to leave a review.</div>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {r.user?.firstName || r.user?.email?.split("@")[0] || "Guest"}
                </div>
                <Stars value={r.rating} />
              </div>
              {r.title && <div className="mt-1 text-white/90">{r.title}</div>}
              <p className="mt-1 text-sm text-white/80 whitespace-pre-wrap">{r.body}</p>
              <div className="mt-2 text-xs text-white/50">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* form */}
      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="mb-2 text-sm text-white/80">
          {myExisting ? "Update your review" : "Write a review"}
        </div>
        <div className="flex items-center gap-3">
          <StarPicker value={rating} onChange={setRating} />
          <input
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <textarea
          className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
          placeholder="How was the event?"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-white/60">
            One review per user · You can edit it anytime
          </div>
          <button
            onClick={submit}
            disabled={submitting || body.trim().length === 0}
            className="rounded-xl px-4 py-2 text-sm font-semibold hover:brightness-110 disabled:opacity-60"
            style={{ background: "#E50914" }}
          >
            {submitting ? "Saving…" : myExisting ? "Update review" : "Post review"}
          </button>
        </div>
        {submitMsg && (
          <div className="mt-2 text-sm text-white/80">{submitMsg}</div>
        )}
      </div>
    </section>
  );
}

/* ----------------- page ----------------- */
export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ev, setEv] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const eventId = Number(id);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/events/${eventId}`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: EventType = await safeJson(r);
        setEv(data);
      } catch (e: any) {
        setErr(e?.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/20"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : err ? (
          <div className="text-red-400">{err}</div>
        ) : ev ? (
          <>
            <div className="flex flex-col gap-4 md:flex-row">
              <img
                className="h-56 w-full rounded-2xl object-cover md:w-80"
                src={ev.imageUrl || "/images/fallback.jpg"}
                alt={ev.imageAlt || ev.name}
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{ev.name}</h1>
                <div className="mt-1 flex items-center gap-3 text-white/80">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{ev.location}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{fmtWhen(ev.startsAt)}</span>
                </div>
                {ev.description && (
                  <p className="mt-3 text-white/80 whitespace-pre-wrap">{ev.description}</p>
                )}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 inline-flex items-baseline gap-2">
                  <span className="text-xl font-bold">${ev.price}</span>
                  <span className="text-sm text-white/70">per ticket</span>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <ReviewsSection eventId={eventId} />
          </>
        ) : null}
      </div>
    </div>
  );
}
