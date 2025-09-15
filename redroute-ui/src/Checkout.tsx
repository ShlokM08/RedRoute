// src/Checkout.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";

/* ---------- same helper you used earlier to send x-user-id / email ---------- */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const r = await fetch("/api/auth/me", { credentials: "include" });
  if (!r.ok) throw new Error("Not authenticated");
  const me = await r.json().catch(() => ({}));
  const id = me?.user?.id ?? me?.id ?? null;
  const email = me?.user?.email ?? me?.email ?? null;
  if (id) return { "x-user-id": String(id) };
  if (email) return { "x-user-email": String(email) };
  throw new Error("Not authenticated");
}

/* ---------------------- robust date math (DST safe) ----------------------- */
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

export default function Checkout() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: CheckoutState };

  // Fallback: allow opening /checkout?hotelId=..&checkIn=..&checkOut=..&guests=..
  const params = new URLSearchParams(location.search);
  const fromQuery: Partial<CheckoutState> = {
    hotelId: Number(params.get("hotelId") || NaN),
    checkIn: params.get("checkIn") || undefined,
    checkOut: params.get("checkOut") || undefined,
    guests: Number(params.get("guests") || NaN),
  };

  const initial: Partial<CheckoutState> = { ...(state ?? {}), ...fromQuery };
  const [hotelId]   = useState<number>(Number(initial.hotelId));
  const [checkIn]   = useState<string>(String(initial.checkIn || ""));
  const [checkOut]  = useState<string>(String(initial.checkOut || ""));
  const [guests]    = useState<number>(Number(initial.guests || 1));
  const [name, setName]   = useState<string>(initial.name || "");
  const [city, setCity]   = useState<string>(initial.city || "");
  const [image, setImage] = useState<string>(initial.image || "/images/featured_hotel.avif");
  const [price, setPrice] = useState<number | undefined>(initial.price);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // If we didn't get hotel name/price from state, fetch it
  useEffect(() => {
    (async () => {
      if (!hotelId) return;
      if (name && price != null) return;
      try {
        const r = await fetch(`/api/hotels/${hotelId}`, { credentials: "include" });
        if (!r.ok) throw new Error(`Hotel ${hotelId} not found`);
        const h: Hotel = await r.json();
        setName(h.name);
        setCity(h.city);
        setPrice(h.price);
        if (h.images?.[0]?.url) setImage(h.images[0].url);
      } catch (e) {
        // fall back gracefully; user can still pay if price was passed in
        console.warn("Could not fetch hotel details:", e);
      }
    })();
  }, [hotelId, name, price]);

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
      setBusy(true);

      // (Here is where you'd run Stripe; skipping to booking create for now)
      const headers = await getAuthHeaders();
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        credentials: "include",
        body: JSON.stringify({
          hotelId,
          checkIn,
          checkOut,
          guests,
        }),
      });

      const payload = (r.headers.get("content-type") || "").includes("application/json")
        ? await r.json().catch(() => null)
        : null;

      if (!r.ok) throw new Error(payload?.error || `Payment/booking failed (HTTP ${r.status})`);

      setMsg({ ok: true, text: "Payment successful! Your booking is confirmed." });
      // Optional: navigate to a confirmation page
      // navigate(`/booking/${payload.booking.id}`);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Payment failed." });
    } finally {
      setBusy(false);
    }
  }

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
          {/* Summary card */}
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
                <span>{price != null ? `$${price} × ${nights} night${nights !== 1 ? "s" : ""}` : "Price"}</span>
                <span className="font-semibold">${subtotal.toLocaleString()}</span>
              </div>
              {/* add taxes/fees here if you want */}
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

          {/* Pay box */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-fit">
            <div className="text-sm text-white/80 mb-2">Amount due</div>
            <div className="text-3xl font-bold mb-5">
              ${subtotal.toLocaleString()}
            </div>

            {/* Replace this with Stripe Elements later */}
            <button
              disabled={!valid || busy}
              onClick={payAndBook}
              className="h-11 w-full rounded-xl font-semibold hover:brightness-110 disabled:opacity-60"
              style={{ background: "#E50914" }}
            >
              {busy ? "Processing…" : "Pay & Confirm"}
            </button>

            {!valid && (
              <div className="mt-3 text-xs text-red-400">Missing/invalid details. Go back and pick dates again.</div>
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
