// src/EventCheckout.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Minus,
  Plus,
  CheckCircle2,
} from "lucide-react";

/* ---------- cookie + auth helpers ---------- */
function parseCookie(name: string) {
  const m = document.cookie.match(
    new RegExp("(^| )" + encodeURIComponent(name) + "=([^;]+)")
  );
  return m ? decodeURIComponent(m[2]) : null;
}

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

async function ensureAuthHeaders(): Promise<Record<string, string> | null> {
  let uid = parseCookie("uid");
  let email = parseCookie("email");
  if (!uid || !email) {
    try {
      const me = await getMe();
      if (me.id) uid = me.id;
      if (me.email) email = me.email;
    } catch {
      // not authed
    }
  }
  if (!uid) return null;
  const h: Record<string, string> = {
    "content-type": "application/json",
    "x-user-id": uid,
  };
  if (email) h["x-user-email"] = email;
  return h;
}

/* ---------- types ---------- */
type EventData = {
  id: number;
  name: string;
  description: string;
  location: string;
  startsAt: string; // ISO
  price: number;
  imageUrl: string;
  imageAlt?: string | null;
};

type EventBooking = {
  id: number;
  eventId: number;
  userId: string;
  qty: number;
  totalCost: number;
  contactName?: string | null;
  contactEmail?: string | null;
  createdAt: string;
};

type CheckoutState = {
  eventId: number;
  qty?: number;
};

/* ---------- component ---------- */
export default function EventCheckout() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const { state } = useLocation() as { state?: CheckoutState };

  // 1) router state
  let initial: Partial<CheckoutState> = state ?? {};

  // 2) session storage (fallback)
  if (!initial.eventId) {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("rr_event_checkout") || "null"
      );
      if (saved && typeof saved === "object") initial = { ...saved, ...initial };
    } catch {}
  }

  // 3) URL (fallback)
  if (!initial.eventId && params.id) initial.eventId = Number(params.id);
  const qs = new URLSearchParams(location.search);
  if (!initial.eventId && qs.get("eventId"))
    initial.eventId = Number(qs.get("eventId"));
  if (!initial.qty && qs.get("qty")) initial.qty = Number(qs.get("qty"));

  const [eventId] = useState<number>(Number(initial.eventId || 0));
  const [qty, setQty] = useState<number>(Number(initial.qty || 1));

  // store minimal context to survive refresh
  useEffect(() => {
    sessionStorage.setItem(
      "rr_event_checkout",
      JSON.stringify({ eventId, qty })
    );
  }, [eventId, qty]);

  // event details
  const [ev, setEv] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!eventId) return;
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/events/${eventId}`, {
          credentials: "include",
        });
        if (!r.ok) {
          const j = await r.json().catch(() => null);
          throw new Error(j?.error ?? `HTTP ${r.status}`);
        }
        const j = (await r.json().catch(() => null)) ?? (await r.clone().json());
        if (alive) setEv(j as EventData);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load event");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [eventId]);

  // contact from me
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const full = [me.firstName, me.lastName].filter(Boolean).join(" ").trim();
        setContactName(full || (me.email ? me.email.split("@")[0] : ""));
        setContactEmail(me.email || "");
      } catch {
        // ignore, UI will still allow entering contact details
      }
    })();
  }, []);

  // derived
  const when = useMemo(() => {
    if (!ev?.startsAt) return "";
    try {
      const d = new Date(ev.startsAt);
      return d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return ev.startsAt;
    }
  }, [ev?.startsAt]);

  const subtotal = useMemo(() => {
    if (!ev) return 0;
    return (ev.price || 0) * (qty || 0);
  }, [ev, qty]);

  const valid = Boolean(eventId && ev && qty > 0);

  // booking submission + success state
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState<EventBooking | null>(null);

  async function payAndConfirm() {
    try {
      setMessage(null);
      if (!valid) throw new Error("Missing or invalid details.");

      setBusy(true);
      const headers = await ensureAuthHeaders();
      if (!headers) throw new Error("Please sign in to continue.");

      const resp = await fetch("/api/event-bookings", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          eventId,
          qty,
          // contactName / contactEmail are inferred server-side from user too,
          // but we'll still send them if you want to persist snapshots:
          contactName: contactName || null,
          contactEmail: contactEmail || null,
        }),
      });

      const text = await resp.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Unexpected response: ${text.slice(0, 140)}…`);
      }

      if (!resp.ok) throw new Error(data?.error ?? `HTTP ${resp.status}`);

      setBooking(data?.booking ?? null);
      setConfirmed(true);
      setMessage({ ok: true, text: "Tickets confirmed! See details below." });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Payment failed." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center">
        Loading…
      </div>
    );
  }

  if (err && !ev) {
    return (
      <div className="min-h-screen bg-black text-red-400 grid place-items-center px-4">
        {err}
      </div>
    );
  }

  if (!ev) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/20"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Summary / left panel */}
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-4">
              <img
                src={ev.imageUrl}
                alt={ev.imageAlt ?? ev.name}
                className="h-28 w-36 rounded-xl object-cover"
                onError={(e) =>
                  ((e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg")
                }
              />
              <div className="flex-1">
                <div className="text-xl font-semibold">{ev.name}</div>
                <div className="text-white/70">{ev.location}</div>
                <div className="mt-2 text-sm text-white/80">
                  <Calendar className="inline-block mr-1 h-4 w-4" />
                  {when}
                </div>
                <div className="mt-1 text-sm text-white/80">
                  <MapPin className="inline-block mr-1 h-4 w-4" />
                  {ev.location}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span>
                  ${ev.price} × {qty} ticket{qty !== 1 ? "s" : ""}
                </span>
                <span className="font-semibold">${subtotal.toLocaleString()}</span>
              </div>

              {/* qty controls (mirrors hotel UI vibe) */}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-white/80">Tickets</span>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="decrement"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="w-6 text-center">{qty}</div>
                  <button
                    aria-label="increment"
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-lg font-bold">
                  ${subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* live messages */}
            {message && (
              <div
                className={`mt-4 text-sm ${
                  message.ok ? "text-green-400" : "text-red-400"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* success ribbon */}
            {confirmed && (
              <div className="mt-5 rounded-2xl border border-green-600/30 bg-green-600/15 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                  <div>
                    <div className="text-lg font-semibold text-green-400">
                      Tickets confirmed!
                    </div>
                    <div className="text-white/85">
                      You’re all set for <strong>{ev.name}</strong> on{" "}
                      <strong>{when}</strong>.
                      {booking?.contactEmail ? (
                        <> Confirmation sent to <strong>{booking.contactEmail}</strong>.</>
                      ) : null}
                    </div>
                    {booking && (
                      <div className="mt-2 text-sm text-white/70">
                        Ref: <span className="font-mono">{booking.id}</span> • Qty:{" "}
                        <strong>{booking.qty}</strong> • Paid:{" "}
                        <strong>${booking.totalCost}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pay box / right panel */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-fit">
            {!confirmed ? (
              <>
                <div className="text-sm text-white/80 mb-2">Contact</div>
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

                <div className="text-sm text-white/80 mb-2">Amount due</div>
                <div className="text-3xl font-bold mb-5">
                  ${subtotal.toLocaleString()}
                </div>

                <button
                  disabled={!valid || busy}
                  onClick={payAndConfirm}
                  className="h-11 w-full rounded-xl font-semibold hover:brightness-110 disabled:opacity-60"
                  style={{ background: "#E50914" }}
                >
                  {busy ? "Processing…" : "Pay & Confirm"}
                </button>

                {!valid && (
                  <div className="mt-3 text-xs text-red-400">
                    Missing/invalid details.
                  </div>
                )}

                <div className="mt-5 text-xs text-white/60">
                  By confirming, you agree to our Terms and Cancellation Policy.
                </div>
              </>
            ) : (
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <div className="text-xl font-bold">Tickets confirmed</div>
                <div className="mt-1 text-white/80">
                  Enjoy the show! Your purchase details are saved below.
                </div>

                <div className="mt-4 rounded-xl border border-white/10 p-4 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Event</span>
                    <span className="font-medium">{ev.name}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-white/70">When</span>
                    <span className="font-medium">{when}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-white/70">Tickets</span>
                    <span className="font-medium">{booking?.qty ?? qty}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-white/70">Total paid</span>
                    <span className="font-medium">
                      ${booking?.totalCost ?? subtotal}
                    </span>
                  </div>
                  {booking?.id && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-white/70">Reference</span>
                      <span className="font-mono">{booking.id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
