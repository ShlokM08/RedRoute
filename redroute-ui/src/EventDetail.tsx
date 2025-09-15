// src/EventDetail.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Minus, Plus, Calendar, MapPin, Users, ChevronLeft } from "lucide-react";

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

function parseCookie(name: string) {
  const key = encodeURIComponent(name) + "=";
  const parts = document.cookie.split(/;\s*/);
  for (const p of parts) {
    if (p.startsWith(key)) return decodeURIComponent(p.slice(key.length));
  }
  return "";
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ev, setEv] = React.useState<EventType | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [qty, setQty] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);

  // Load this event
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/events/${id}`, { credentials: "include" });
        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Unexpected response: ${text.slice(0, 160)}`);
        }
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        if (!ignore) setEv(data as EventType);
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Failed to load event");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  const minus = () => setQty((q) => Math.max(1, q - 1));
  const plus = () => setQty((q) => Math.min(99, q + 1)); // simple cap

  const buy = async () => {
    if (!ev) return;
    setSubmitting(true);
    setError(null);

    const uid = parseCookie("uid");
    const email = parseCookie("email");

    try {
      const res = await fetch("/api/event-bookings", {
        method: "POST",
        credentials: "include", // send cookies, too
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { "x-user-id": uid } : {}),
          ...(email ? { "x-user-email": email } : {}),
        },
        body: JSON.stringify({
          eventId: ev.id,
          qty: Number(qty) || 1,
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Unexpected response: ${text.slice(0, 160)}`);
      }
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      // success → you can redirect to a "confirmation" or home
      alert("Booking confirmed!");
      navigate("/home");
    } catch (e: any) {
      setError(e?.message || "Failed to book");
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => navigate(-1);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-5xl mx-auto">Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-5xl mx-auto text-red-400">{error}</div>
      </div>
    );
  }
  if (!ev) return null;

  const date = new Date(ev.startsAt);
  const when = date.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const total = ev.price * qty;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={back}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: image + basics */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <img
              src={ev.imageUrl}
              alt={ev.imageAlt || ev.name}
              className="w-full h-64 object-cover"
            />
            <div className="p-4 space-y-2">
              <h1 className="text-2xl font-bold">{ev.name}</h1>
              <div className="text-white/80 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {ev.location}
              </div>
              <div className="text-white/80 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {when}
              </div>
              <div className="text-white/80 flex items-center gap-2">
                <Users className="h-4 w-4" /> Capacity {ev.capacity}
              </div>
              <p className="mt-2 text-white/85 whitespace-pre-wrap">{ev.description}</p>
            </div>
          </div>

          {/* Right: checkout card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-fit">
            <div className="text-sm text-white/70 mb-2">Amount due</div>
            <div className="text-4xl font-extrabold mb-4">${total.toLocaleString()}</div>

            <div className="mb-4">
              <div className="text-white/80 mb-2">Tickets</div>
              <div className="inline-flex items-center rounded-xl overflow-hidden border border-white/10">
                <button
                  className="h-10 w-10 grid place-items-center bg-white/10 hover:bg-white/20"
                  onClick={minus}
                  aria-label="decrease"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="h-10 w-10 grid place-items-center text-lg tabular-nums">
                  {qty}
                </div>
                <button
                  className="h-10 w-10 grid place-items-center bg-white/10 hover:bg-white/20"
                  onClick={plus}
                  aria-label="increase"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="text-white/70 mt-2">
                ${ev.price.toLocaleString()} × {qty} ticket{qty > 1 ? "s" : ""} = ${total.toLocaleString()}
              </div>
            </div>

            <button
              onClick={buy}
              disabled={submitting}
              className="w-full rounded-xl bg-[#E50914] py-3 text-center font-semibold hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? "Processing…" : "Pay & Confirm"}
            </button>

            {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
