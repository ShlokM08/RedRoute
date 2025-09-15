// src/Checkout.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CheckCircle2 } from "lucide-react";

/* ---------- auth/meta helper ---------- */
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

/* ---------- date helpers (UTC to avoid DST issues) ---------- */
function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}
const MS_PER_NIGHT = 24 * 60 * 60 * 1000;

type CheckoutState = {
  hotelId: number;
  name?: string;
  city?: string;
  image?: string;
  price?: number;     // nightly
  checkIn: string;    // YYYY-MM-DD
  checkOut: string;   // YYYY-MM-DD
  guests: number;
};

type Hotel = { id: number; name: string; city: string; price: number; images?: { url: string }[] };

type CreatedBooking = {
  id: number;
  userId: string;
  hotelId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  contactName?: string | null;
  contactEmail?: string | null;
  totalCost: number;
  createdAt: string;
};

/* ----------------------- Confetti Overlay -----------------------
   Lightweight CSS confetti — bursts from top/bottom/left/right.
   Mount for ~1.4s, then unmount. No external libs required.
------------------------------------------------------------------*/
function FourSideConfetti({ show, onDone, duration = 1400 }: {
  show: boolean;
  onDone?: () => void;
  duration?: number;
}) {
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    if (!show) return;
    setSeed(Date.now());
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [show, duration, onDone]);

  if (!show) return null;

  const colors = ["#E50914", "#ffffff", "#ffd166", "#06d6a0", "#118ab2", "#ef476f"];
  const piecesPerSide = 28;
  const makePieces = (side: "top" | "bottom" | "left" | "right") => {
    const arr = Array.from({ length: piecesPerSide });
    return arr.map((_, i) => {
      // random helpers (seed only to vary on re-mount)
      const rand = (min: number, max: number) => {
        const x = Math.sin(seed + i * 999 + (side === "top" ? 1 : side === "right" ? 2 : side === "bottom" ? 3 : 4)) * 0.5 + 0.5;
        return min + (max - min) * (Math.random() * 0.7 + 0.3) * x;
      };

      // Start positions & end offsets by side
      let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
      if (side === "top") {
        x0 = rand(5, 95); y0 = -6;
        x1 = x0 + rand(-20, 20); y1 = 110;
      } else if (side === "bottom") {
        x0 = rand(5, 95); y0 = 106;
        x1 = x0 + rand(-20, 20); y1 = -10;
      } else if (side === "left") {
        x0 = -6; y0 = rand(10, 90);
        x1 = 108; y1 = y0 + rand(-18, 18);
      } else {
        x0 = 106; y0 = rand(10, 90);
        x1 = -10; y1 = y0 + rand(-18, 18);
      }

      const size = rand(6, 10);
      const rot0 = rand(0, 180);
      const rot1 = rot0 + rand(360, 1080);
      const delay = rand(0, 180); // ms
      const color = colors[i % colors.length];

      const style = {
        // percent-based positions fed into keyframes via CSS variables
        // we use viewport units by putting values as percentages of viewport
        // and let the keyframes translate them.
        // @ts-ignore – CSS custom props
        "--x0": `${x0}vw`,
        "--y0": `${y0}vh`,
        "--x1": `${x1}vw`,
        "--y1": `${y1}vh`,
        "--r0": `${rot0}deg`,
        "--r1": `${rot1}deg`,
        "--dur": `${duration}ms`,
        "--delay": `${delay}ms`,
        background: color,
        width: `${size}px`,
        height: `${size * 0.6}px`,
      } as React.CSSProperties;

      return <div key={`${side}-${i}`} className="rr-confetti-piece" style={style} />;
    });
  };

  return (
    <>
      <div className="rr-confetti fixed inset-0 pointer-events-none z-[9999]">
        {["top","right","bottom","left"].map((s) => makePieces(s as any))}
      </div>
      <style>{`
        .rr-confetti-piece {
          position: fixed;
          top: 0; left: 0;
          transform: translate(var(--x0), var(--y0)) rotate(var(--r0));
          opacity: 0.95;
          border-radius: 2px;
          animation: rr-fly var(--dur) ease-out forwards;
          animation-delay: var(--delay);
          box-shadow: 0 0 0.5px rgba(0,0,0,.15);
        }
        @keyframes rr-fly {
          0%   { transform: translate(var(--x0), var(--y0)) rotate(var(--r0)); opacity: 1; }
          100% { transform: translate(var(--x1), var(--y1)) rotate(var(--r1)); opacity: 0; }
        }
      `}</style>
    </>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: CheckoutState };

  // 1) pull from router state
  let initial: Partial<CheckoutState> = state ?? {};

  // 2) else from sessionStorage
  if (!initial?.hotelId) {
    try {
      const saved = JSON.parse(sessionStorage.getItem("rr_checkout") || "null");
      if (saved && typeof saved === "object") initial = { ...saved, ...initial };
    } catch {}
  }

  // 3) minimal query fallback
  const params = new URLSearchParams(location.search);
  if (!initial.hotelId && params.get("hotelId")) {
    initial.hotelId = Number(params.get("hotelId"));
  }
  initial.checkIn  = initial.checkIn  ?? params.get("checkIn")  ?? "";
  initial.checkOut = initial.checkOut ?? params.get("checkOut") ?? "";
  if (!initial.guests && params.get("guests")) initial.guests = Number(params.get("guests"));

  const [hotelId]   = useState<number>(Number(initial.hotelId || 0));
  const [checkIn]   = useState<string>(String(initial.checkIn || ""));
  const [checkOut]  = useState<string>(String(initial.checkOut || ""));
  const [guests]    = useState<number>(Number(initial.guests || 1));
  const [name,  setName]  = useState<string>(initial.name || "");
  const [city,  setCity]  = useState<string>(initial.city || "");
  const [image, setImage] = useState<string>(initial.image || "/images/featured_hotel.avif");
  const [price, setPrice] = useState<number | undefined>(initial.price);

  // contact derived from /api/auth/me
  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // NEW: celebration + confirmation states
  const [celebrating, setCelebrating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState<CreatedBooking | null>(null);

  // Fetch hotel if price/name missing
  useEffect(() => {
    (async () => {
      if (!hotelId) return;
      if (name && price != null) return;
      try {
        const r = await fetch(`/api/hotels/${hotelId}`, { credentials: "include" });
        if (!r.ok) throw new Error();
        const h: Hotel = await r.json();
        setName(h.name);
        setCity(h.city);
        setPrice(h.price);
        if (h.images?.[0]?.url) setImage(h.images[0].url);
      } catch {}
    })();
  }, [hotelId, name, price]);

  // Fetch me to prefill contact and to get headers for /api/bookings
  const [me, setMe] = useState<{ id?: string | null; email?: string | null } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const m = await getMe();
        setMe({ id: m.id, email: m.email });
        const full = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
        setContactName(full || (m.email ? m.email.split("@")[0] : ""));
        setContactEmail(m.email || "");
      } catch {
        // if not authed, RequireAuth will likely have redirected already
      }
    })();
  }, []);

  // compute nights safely (min 1)
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const n = Math.round((+parseYMD(checkOut) - +parseYMD(checkIn)) / MS_PER_NIGHT);
    return Math.max(0, n);
  }, [checkIn, checkOut]);

  const subtotal = useMemo(() => {
    if (price == null || nights <= 0) return 0;
    return price * nights;
  }, [price, nights]);

  const valid = hotelId && checkIn && checkOut && nights > 0 && price != null;

  async function payAndBook() {
    try {
      setMsg(null);
      if (!valid) throw new Error("Missing or invalid booking details.");
      if (!me) throw new Error("Not authenticated.");

      setBusy(true);

      // (Stripe would go here, we proceed to booking for now)
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeadersFrom(me),
        },
        credentials: "include",
        body: JSON.stringify({
          hotelId,
          checkIn,
          checkOut,
          guests,
          contactName: contactName || null,
          contactEmail: contactEmail || null,
        }),
      });

      const raw = await r.text();
      const payload = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;

      if (!r.ok) throw new Error(payload?.error || `Payment/booking failed (HTTP ${r.status})`);

      // NEW: Play confetti first, then show confirmation panel/message
      setBooking(payload?.booking ?? null);
      setCelebrating(true);
      // Wait for confetti to finish before revealing the panel & message
      setTimeout(() => {
        setCelebrating(false);
        setConfirmed(true);
        setMsg({ ok: true, text: "Payment successful! Your booking is confirmed." });
      }, 1400);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Payment failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Confetti overlay (mounts only when celebrating) */}
      <FourSideConfetti show={celebrating} />

      <div className="mx-auto max-w-4xl p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/20 disabled:opacity-60"
          disabled={busy}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Summary */}
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-4">
              <img
                src={image}
                alt={name}
                className="h-28 w-36 rounded-xl object-cover"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg")}
              />
              <div className="flex-1">
                <div className="text-xl font-semibold">{name || "Hotel"}</div>
                <div className="text-white/70">{city}</div>
                <div className="mt-2 text-sm text-white/80">
                  {checkIn} → {checkOut} • {guests} {guests === 1 ? "guest" : "guests"}
                </div>
                <div className="mt-1 text-sm text-white/80">
                  {nights > 0 ? `${nights} night${nights > 1 ? "s" : ""}` : "Invalid dates"}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {price != null
                    ? `$${price} × ${nights} night${nights !== 1 ? "s" : ""}`
                    : "Price"}
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

            {/* Confirmation panel — appears only after confetti completes */}
            {confirmed && (
              <div className="mt-5 rounded-2xl border border-green-600/30 bg-green-600/15 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                  <div>
                    <div className="text-lg font-semibold text-green-400">
                      Booking confirmed!
                    </div>
                    <div className="text-white/85">
                      You’re all set for <strong>{name}</strong>. We’ve saved your booking
                      details {booking?.contactEmail ? <>and sent a confirmation to <strong>{booking.contactEmail}</strong></> : null}.
                    </div>
                    <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Reference</span>
                        <span className="font-mono">{booking?.id ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Dates</span>
                        <span>{checkIn} → {checkOut}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Guests</span>
                        <span>{booking?.guests ?? guests}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Total paid</span>
                        <span>${(booking?.totalCost ?? subtotal).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pay box */}
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
                    Missing/invalid details. Go back and pick dates again.
                  </div>
                )}

                <div className="mt-5 text-xs text-white/60">
                  By confirming, you agree to our Terms and Cancellation Policy.
                </div>
              </>
            ) : (
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <div className="text-xl font-bold">Payment complete</div>
                <div className="mt-1 text-white/80">
                  Your booking details are shown on the left and saved to your account.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
