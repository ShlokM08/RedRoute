import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, MapPin, Minus, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "./components/ui/button";

/** Cookie + auth helpers */
function parseCookie(name: string) {
  const m = document.cookie.match(
    new RegExp("(^| )" + encodeURIComponent(name) + "=([^;]+)")
  );
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureAuthHeaders(): Promise<Record<string, string> | null> {
  let uid = parseCookie("uid");
  let email = parseCookie("email");

  if (!uid || !email) {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      if (r.ok) {
        const me = await r.json().catch(() => null);
        const id = me?.user?.id || me?.id || null;
        const em = me?.user?.email || me?.email || null;
        if (id) uid = id;
        if (em) email = em;
      }
    } catch {
      // ignore
    }
  }

  if (!uid) return null;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-user-id": uid,
  };
  if (email) headers["x-user-email"] = email;
  return headers;
}

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
  createdAt: string; // ISO
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();

  const [ev, setEv] = useState<EventData | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // NEW: success state to stay on page with confirmation
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState<EventBooking | null>(null);

  const eventId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
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
        const j = await r.json();
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

  const dateLabel = useMemo(() => {
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

  const total = ev ? ev.price * qty : 0;

  async function handlePay() {
    if (!ev) return;
    setSubmitting(true);
    setErr(null);
    try {
      const headers = await ensureAuthHeaders();
      if (!headers) {
        setErr("Please sign in to continue.");
        setSubmitting(false);
        return;
      }

      const resp = await fetch("/api/event-bookings", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          eventId: ev.id,
          qty,
        }),
      });

      const text = await resp.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Unexpected response: ${text.slice(0, 140)}…`);
      }

      if (!resp.ok) {
        throw new Error(data?.error ?? `HTTP ${resp.status}`);
      }

      // Success: show confirmation right here and do NOT navigate away
      setBooking(data?.booking ?? null);
      setConfirmed(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to complete purchase");
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-6xl grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left: poster & info */}
        <div className="md:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="overflow-hidden rounded-2xl mb-4">
            <img
              src={ev.imageUrl}
              alt={ev.imageAlt ?? ev.name}
              className="w-full h-[360px] object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold mb-1">{ev.name}</h1>
          <div className="text-white/80 mb-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {dateLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {ev.location}
            </span>
          </div>
          <p className="text-white/85 leading-relaxed">{ev.description}</p>

          {/* Success ribbon (desktop wide) */}
          {confirmed && (
            <div className="mt-6 rounded-2xl border border-green-600/30 bg-green-600/15 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                <div>
                  <div className="text-lg font-semibold text-green-400">
                    Tickets confirmed!
                  </div>
                  <div className="text-white/85">
                    You’re all set for <strong>{ev.name}</strong> on{" "}
                    <strong>{dateLabel}</strong>.
                    {booking?.contactEmail ? (
                      <> A confirmation email was sent to <strong>{booking.contactEmail}</strong>.</>
                    ) : null}
                  </div>
                  {booking && (
                    <div className="mt-2 text-sm text-white/70">
                      Reference: <span className="font-mono">{booking.id}</span>{" "}
                      • Qty: <strong>{booking.qty}</strong> • Paid:{" "}
                      <strong>${booking.totalCost}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: purchase card */}
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 h-fit">
          {!confirmed ? (
            <>
              <div className="text-sm text-white/80 mb-2">Amount due</div>
              <div className="text-4xl font-extrabold mb-4">${total}</div>

              <div className="mb-4 rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-white/85">Tickets</div>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="decrement"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="w-6 text-center">{qty}</div>
                    <button
                      aria-label="increment"
                      onClick={() => setQty((q) => Math.min(10, q + 1))}
                      className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-white/80">
                  <span>
                    ${ev.price} × {qty} ticket{qty > 1 ? "s" : ""}
                  </span>
                  <span>${total}</span>
                </div>
              </div>

              <Button
                disabled={submitting}
                className="w-full h-11 rounded-xl font-semibold"
                style={{ background: "#E50914" }}
                onClick={handlePay}
              >
                {submitting ? "Processing…" : "Pay & Confirm"}
              </Button>

              {err && (
                <div className="mt-3 text-sm text-red-400 break-words">{err}</div>
              )}

              <div className="mt-4 text-xs text-white/60">
                By confirming, you agree to our Terms and Cancellation Policy.
              </div>
            </>
          ) : (
            // After success: lock the panel and show a clear confirmation
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
                  <span className="font-medium">{dateLabel}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-white/70">Tickets</span>
                  <span className="font-medium">{booking?.qty ?? qty}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-white/70">Total paid</span>
                  <span className="font-medium">
                    ${booking?.totalCost ?? total}
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
        </aside>
      </div>
    </div>
  );
}
