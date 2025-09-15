import  { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "./components/ui/button";

type EventItem = {
  id: number;
  name: string;
  description: string;
  location: string;
  startsAt: string;
  price: number;
  capacity: number;
  imageUrl: string;
  imageAlt?: string | null;
};

function parseCookie(name: string) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function EventCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const loc = useLocation() as any; // using state from EventDetail if available

  const [ev, setEv] = useState<EventItem | null>(loc.state?.ev ?? null);
  const [qty] = useState<number>(loc.state?.qty ?? 1);
  const [error, setError] = useState<string | null>(null);
  const total = useMemo(() => (ev ? ev.price * qty : 0), [ev, qty]);

  useEffect(() => {
    if (!ev) {
      (async () => {
        try {
          const r = await fetch(`/api/events/${id}`);
          if (!r.ok) {
            const j = await r.json().catch(() => null);
            throw new Error(j?.error ?? `HTTP ${r.status}`);
          }
          const data: EventItem = await r.json();
          setEv(data);
        } catch (e: any) {
          setError(e?.message || "Failed to load event");
        }
      })();
    }
  }, [id, ev]);

  async function payAndConfirm() {
    if (!ev) return;
    setError(null);

    const uid = parseCookie("uid");
    const email = parseCookie("email");

    try {
      const r = await fetch("/api/event-bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(uid ? { "x-user-id": uid } : {}),
          ...(email ? { "x-user-email": email } : {}),
        },
        body: JSON.stringify({
          eventId: ev.id,
          qty,
          // contactName / contactEmail are derived server-side from user too
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);

      // success → take them back home or to a confirmation screen
      navigate("/home", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Payment failed");
    }
  }

  if (!ev) {
    return <div className="min-h-screen bg-black text-white p-6">{error ?? "Loading…"}</div>;
  }

  const when = new Date(ev.startsAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
        >
          <ChevronLeft className="size-4" /> Back
        </button>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex gap-4">
              <img
                src={ev.imageUrl}
                alt={ev.imageAlt ?? ev.name}
                className="h-28 w-40 rounded-2xl object-cover"
              />
              <div className="flex-1">
                <h1 className="text-xl font-bold">{ev.name}</h1>
                <div className="text-white/80">{ev.location} • {when}</div>
                <div className="mt-3 text-sm text-white/80">
                  ${ev.price} × {qty} ticket{qty > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="text-lg">Total</div>
              <div className="text-2xl font-bold">${total}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xl font-semibold mb-2">Amount due</div>
            <div className="text-4xl font-extrabold">${total}</div>

            <Button
              className="mt-6 w-full rounded-xl py-3 text-base"
              style={{ background: "#E50914" }}
              onClick={payAndConfirm}
            >
              Pay & Confirm
            </Button>

            {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
            <div className="mt-4 text-xs text-white/70">
              By confirming, you agree to our Terms and Cancellation Policy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
