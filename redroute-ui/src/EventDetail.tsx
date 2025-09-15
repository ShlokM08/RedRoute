import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ev, setEv] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [qty, setQty] = React.useState(1);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/events/${id}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setEv(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-black text-white p-6">Loading…</div>;
  if (error) return <div className="min-h-screen bg-black text-red-400 p-6">{error}</div>;
  if (!ev)   return <div className="min-h-screen bg-black text-white p-6">Not found</div>;

  const date = new Date(ev.startsAt);
  const when = `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const total = ev.price * qty;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <button onClick={() => navigate(-1)} className="mb-4 rounded-full border border-white/15 bg-white/10 px-4 py-2">← Back</button>

      <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <img src={ev.imageUrl} alt={ev.imageAlt ?? ev.name} className="w-full h-[320px] object-cover" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h1 className="text-2xl font-bold">{ev.name}</h1>
          <div className="mt-1 text-white/80">{ev.location}</div>
          <div className="mt-1 text-white/80">{when}</div>
          <div className="mt-4 text-sm leading-relaxed text-white/85">{ev.description}</div>

          <div className="mt-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-white/70">Price</div>
              <div className="text-xl font-bold">${ev.price} <span className="text-sm font-normal text-white/70">per ticket</span></div>
              <div className="mt-1 text-sm text-white/70">Seats left: {ev.seatsLeft}</div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10">-</button>
              <div className="w-8 text-center">{qty}</div>
              <button onClick={() => setQty((q) => Math.min(20, q + 1))} className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10">+</button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-lg">Total: <span className="font-bold">${total}</span></div>
            <Button
              className="rounded-xl px-5"
              onClick={() => {
                // hand off to the existing checkout page with a different "mode"
                const payload = {
                  mode: "event",
                  eventId: ev.id,
                  name: ev.name,
                  when: ev.startsAt,
                  price: ev.price,
                  qty,
                  total,
                };
                sessionStorage.setItem("rr_checkout", JSON.stringify(payload));
                navigate("/checkout");
              }}
              style={{ background: "#E50914" }}
            >
              Buy Tickets
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
