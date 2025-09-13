import React from "react";
import { Button } from "../components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = {
  hotelId: number;
  maxGuests?: number; // hotel.capacity (optional—will still be validated server-side)
};

export default function ReservePanel({ hotelId, maxGuests = 10 }: Props) {
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = React.useState<string>("");
  const [checkOut, setCheckOut] = React.useState<string>("");
  const [guests, setGuests] = React.useState<number>(2);
  const [contactName, setContactName] = React.useState<string>("");
  const [contactEmail, setContactEmail] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const dec = () => setGuests((g) => Math.max(1, g - 1));
  const inc = () => setGuests((g) => Math.min(maxGuests, g + 1));

  async function reserve() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/bookings", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    hotelId,
    checkIn: checkIn ? new Date(checkIn).toISOString() : null,
    checkOut: checkOut ? new Date(checkOut).toISOString() : null,
    guests,
    contactName,
    contactEmail,
  }),
});

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      navigate(`/booking/${data.id}`); // or show a success dialog
    } catch (e: any) {
      setError(e.message || "Failed to reserve");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-white/80">Check-in</span>
          <input
            type="date"
            className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/80">Check-out</span>
          <input
            type="date"
            className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm">
          <div className="text-white/80">Guests</div>
          <div className="text-white/60 text-xs">Max {maxGuests}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={dec}
            className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20"
          >
            <Minus className="size-4" />
          </button>
          <div className="w-6 text-center text-sm tabular-nums">{guests}</div>
          <button
            type="button"
            onClick={inc}
            className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-white/80">Contact name (optional)</span>
          <input
            className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="John Doe"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/80">Contact email (optional)</span>
          <input
            type="email"
            className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="john@doe.com"
          />
        </label>
      </div>

      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

      <Button
        className="mt-4 h-11 w-full rounded-xl text-sm font-semibold"
        disabled={submitting}
        onClick={reserve}
        style={{ background: "#E50914" }}
      >
        {submitting ? "Reserving…" : "Reserve now"}
      </Button>
    </div>
  );
}
