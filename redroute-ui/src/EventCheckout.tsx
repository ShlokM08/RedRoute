import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Minus, Plus } from "lucide-react";

/* ---------- auth/meta helper (same pattern as hotel checkout) ---------- */
async function getMe() {
  const r = await fetch("/api/auth/me", { credentials: "include" });
  if (!r.ok) throw new Error("Not authenticated");
  const me = await r.json().catch(() => ({}));
  const id = me?.user?.id ?? me?.id ?? null;
  const email = me?.user?.email ?? me?.email ?? null;
  const firstName = me?.user?.firstName ?? me?.firstName ?? null;
  const lastName = me?.user?.lastName ?? me?.lastName ?? null;
  return { id, email, firstName, lastName };
}
function authHeadersFrom(me: { id?: string | null; email?: string | null }) {
  const h: Record<string, string> = {};
  if (me.id) h["x-user-id"] = String(me.id);
  if (me.email) h["x-user-email"] = String(me.email);
  return h;
}

/* ---------- types ---------- */
type EventCheckoutState = {
  eventId: number;
  name?: string;
  location?: string;
  startsAt?: string;     // ISO string
  imageUrl?: string;
  price?: number;        // per ticket
  qty?: number;          // tickets
};

type EventType = {
  id: number;
  name: string;
  description?: string;
  location: string;
  startsAt: string;     // ISO
  price: number;
  imageUrl: string;
  imageAlt?: string | null;
};

/* ---------- date/time helpers ---------- */
function fmtEventWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  // e.g., "Mon, Sep 15 • 8:00 PM"
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventCheckout() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: EventCheckoutState };

  // 1) router state
  let initial: Partial<EventCheckoutState> = state ?? {};
  // 2) sessionStorage
  if (!initial?.eventId) {
    try {
      const saved = JSON.parse(sessionStorage.getItem("rr_event_checkout") || "null");
      if (saved && typeof saved === "object") initial = { ...saved, ...initial };
    } catch {}
  }
  // 3) minimal query fallback
  const params = new URLSearchParams(location.search);
  if (!initial.eventId && params.get("eventId")) {
    initial.eventId = Number(params.get("eventId"));
  }
  if (!initial.qty && params.get("qty")) initial.qty = Number(params.get("qty"));

  const [eventId]   = useState<number>(Number(initial.eventId || 0));
  const [name, setName] = useState<string>(initial.name || "");
  const [where, setWhere] = useState<string>(initial.location || "");
  const [when, setWhen] = useState<string>(initial.startsAt || "");
  const [image, setImage] = useState<string>(initial.imageUrl || "/images/fallback.jpg");
  const [price, setPrice] = useState<number | undefined>(initial.price);
  const [qty, setQty] = useState<number>(Math.max(1, Number(initial.qty || 1)));

  // contact derived from /api/auth/me (also used to send headers)
  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");

  const [me, setMe] = useState<{ id?: string | null; email?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Persist basic payload so refresh/back keeps data
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "rr_event_checkout",
        JSON.stringify({
          eventId,
          name,
          location: where,
          startsAt: when,
          imageUrl: image,
          price,
          qty,
        })
      );
    } catch {}
  }, [eventId, name, where, when, image, price, qty]);

  // Fetch event if details missing
  useEffect(() => {
    (async () => {
      if (!eventId) return;
      if (name && price != null && when) return;
      try {
        const r = await fetch(`/api/events/${eventId}`, { credentials: "include" });
        if (!r.ok) throw new Error();
        const ev: EventType = await r.json();
        setName(ev.name);
        setWhere(ev.location);
        setWhen(ev.startsAt);
        setPrice(ev.price);
        if (ev.imageUrl) setImage(ev.imageUrl);
      } catch {
        // ignore (UI will show fallbacks)
      }
    })();
  }, [eventId, name, price, when]);

  // Get me for auth headers + contact defaults
  useEffect(() => {
    (async () => {
      try {
        const m = await getMe();
        setMe({ id: m.id, email: m.email });
        const full = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
        setContactName(full || (m.email ? m.email.split("@")[0] : ""));
        setContactEmail(m.email || "");
      } catch {
        // user not logged in; your route guard should handle it
      }
    })();
  }, []);

  const subtotal = useMemo(() => {
    if (price == null || qty < 1) return 0;
    return price * qty;
  }, [price, qty]);

  const valid = eventId && qty > 0 && price != null;

  async function payAndBook() {
    try {
      setMsg(null);
      if (!valid) throw new Error("Missing or invalid booking details.");
      if (!me) throw new Error("Not authenticated.");

      setBusy(true);

      // (Stripe would go here; we directly create the booking)
      const r = await fetch("/api/event-bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeadersFrom(me),
        },
        credentials: "include",
        body: JSON.stringify({
          eventId,
          qty,
          contactName: contactName || null,
          contactEmail: contactEmail || null,
        }),
      });

      const isJSON = (r.headers.get("content-type") || "").includes("application/json");
      const payload = isJSON ? await r.json().catch(() => null) : null;

      if (!r.ok) throw new Error(payload?.error || `Payment/booking failed (HTTP ${r.status})`);

      setMsg({ ok: true, text: "Payment successful! Your tickets are booked." });
      // Optionally navigate to a confirmation page:
      // navigate(`/events/${eventId}?success=1`);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Payment failed." });
    } finally {
      setBusy(false);
    }
  }

  const minQty = 1;
  const maxQty = 10; // adjust if you expose capacity on the page

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/20"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Summary (left) */}
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-4">
              <img
                src={image}
                alt={name}
                className="h-28 w-36 rounded-xl object-cover"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg")}
              />
              <div className="flex-1">
                <div className="text-xl font-semibold">{name || "Event"}</div>
                <div className="text-white/70">{where}</div>
                <div className="mt-2 text-sm text-white/80">{fmtEventWhen(when)}</div>
                <div className="mt-1 text-sm text-white/80">
                  {qty} {qty === 1 ? "ticket" : "tickets"}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {price != null ? `$${price} × ${qty} ticket${qty !== 1 ? "s" : ""}` : "Price"}
                </span>
                <span className="font-semibold">${subtotal.toLocaleString()}</span>
              </div>
              <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-lg font-bold">${subtotal.toLocaleString()}</span>
              </div>
            </div>

            {msg && (
              <div className={`mt-4 text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>
                {msg.text}
              </div>
            )}
          </div>

          {/* Pay box (right) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-fit">
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

            <div className="text-sm text-white/80 mb-2">Tickets</div>
            <div className="mb-4 inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(minQty, q - 1))}
                disabled={qty <= minQty}
                className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 disabled:opacity-50"
                aria-label="Decrease tickets"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="w-10 text-center text-base tabular-nums">{qty}</div>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 disabled:opacity-50"
                aria-label="Increase tickets"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="text-sm text-white/80 mb-2">Amount due</div>
            <div className="text-3xl font-bold mb-5">${subtotal.toLocaleString()}</div>

            <button
              disabled={!valid || busy}
              onClick={payAndBook}
              className="h-11 w-full rounded-xl font-semibold hover:brightness-110 disabled:opacity-60"
              style={{ background: "#E50914" }}
            >
              {busy ? "Processing…" : "Pay & Confirm"}
            </button>

            {!valid && (
              <div className="mt-3 text-xs text-red-400">
                Missing/invalid details. Go back and pick tickets again.
              </div>
            )}

            <div className="mt-5 text-xs text-white/60">
              By confirming, you agree to our Terms and Cancellation Policy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
