import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, MapPin,  Minus, Plus, CheckCircle2, ChevronLeft, Home } from "lucide-react";
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
type EventItem = {
  id: number;
  name: string;
  description: string;
  location: string;
  startsAt: string; // ISO
  price: number;
  imageUrl: string;
  imageAlt?: string | null;
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

/* ------------ confetti hook (no overlay canvas, all sides) ------------ */
function useCelebration() {
  const rafRef = useRef<number | null>(null);

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

      const particleCount = Math.max(10, Math.floor(70 * (left / durationMs)));
      const rand = (a: number, b: number) => Math.random() * (b - a) + a;

      // 4 corners
      confetti({ ...base, particleCount, spread: 70, origin: { x: 0.05, y: 0.05 } });
      confetti({ ...base, particleCount, spread: 70, origin: { x: 0.95, y: 0.05 } });
      confetti({ ...base, particleCount, spread: 70, origin: { x: 0.05, y: 0.95 } });
      confetti({ ...base, particleCount, spread: 70, origin: { x: 0.95, y: 0.95 } });
      // top & bottom sweeps
      confetti({ ...base, particleCount: 24, spread: 120, origin: { x: rand(0.2, 0.8), y: 0 } });
      confetti({ ...base, particleCount: 24, spread: 120, origin: { x: rand(0.2, 0.8), y: 1 } });

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/events/${id}`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const e: EventItem = await r.json();
        setEv(e);
      } catch {
        setEv(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const subtotal = useMemo(() => (!ev ? 0 : ev.price * qty), [ev, qty]);
  const valid = !!ev && qty > 0;

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

      // 🔥 fire confetti right here on success
      celebration.start(3000);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Payment failed." });
    } finally {
      setBusy(false);
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
                    You’re all set for <strong>{ev.name}</strong> on <strong>{fmtWhen(ev.startsAt)}</strong>.{` `}
                    {booking?.contactEmail ? <>A confirmation email was sent to <strong>{booking.contactEmail}</strong>.</> : null}
                  </div>
                  <div className="mt-2 text-xs text-white/70">
                    Reference: <span className="font-mono">{booking?.id ?? "—"}</span> • Qty: {booking?.qty ?? qty} • Paid: ${ (booking?.totalCost ?? subtotal).toLocaleString() }
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
                <div className={`mt-3 text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>
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
    </div>
  );
}
