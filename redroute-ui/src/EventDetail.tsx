import  { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Minus, Plus, ChevronLeft } from "lucide-react";
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

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ev, setEv] = useState<EventItem | null>(null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/events/${id}`);
        if (!r.ok) {
          const j = await r.json().catch(() => null);
          throw new Error(j?.error ?? `HTTP ${r.status}`);
        }
        const data: EventItem = await r.json();
        setEv(data);
        setQty(1);
      } catch (e: any) {
        setErr(e?.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-black text-white p-6">Loading…</div>;
  }
  if (err) {
    return <div className="min-h-screen bg-black text-red-400 p-6">{err}</div>;
  }
  if (!ev) {
    return <div className="min-h-screen bg-black text-white p-6">Not found.</div>;
  }

  const when = new Date(ev.startsAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const total = ev.price * qty;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
        >
          <ChevronLeft className="size-4" /> Back
        </button>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-1 md:grid-cols-5">
            <div className="md:col-span-3">
              <img
                src={ev.imageUrl}
                alt={ev.imageAlt ?? ev.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="md:col-span-2 p-5">
              <h1 className="text-2xl font-bold">{ev.name}</h1>
              <div className="mt-1 text-white/80">{ev.location} • {when}</div>
              <p className="mt-4 text-white/85 whitespace-pre-line">{ev.description}</p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 text-sm text-white/70">Select tickets</div>
                <div className="flex items-center gap-3">
                  <button
                    className="grid size-9 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20 disabled:opacity-40"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >
                    <Minus className="size-4" />
                  </button>
                  <div className="w-8 text-center text-lg tabular-nums">{qty}</div>
                  <button
                    className="grid size-9 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20 disabled:opacity-40"
                    onClick={() => setQty((q) => Math.min(ev.capacity, q + 1))}
                    disabled={qty >= ev.capacity}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white/70">${ev.price} × {qty} ticket{qty>1?"s":""}</div>
                    <div className="text-xl font-bold">${total}</div>
                  </div>
                  <Button
                    className="rounded-xl px-5 py-2"
                    style={{ background: "#E50914" }}
                    onClick={() => navigate(`/events/${ev.id}/checkout`, { state: { ev, qty } })}
                  >
                    Continue to Checkout
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
