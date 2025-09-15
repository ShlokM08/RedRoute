//import React from "react";
import { useNavigate } from "react-router-dom";

export type EventItem = {
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

export default function EventCard({ ev }: { ev: EventItem }) {
  const navigate = useNavigate();
  const date = new Date(ev.startsAt);
  const when = `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm cursor-pointer hover:brightness-110 transition"
      onClick={() => navigate(`/events/${ev.id}`)}
      title={`View details for ${ev.name}`}
    >
      <div className="relative h-60 w-full overflow-hidden">
        <img
          src={ev.imageUrl || "/images/fallback.jpg"}
          alt={ev.imageAlt ?? ev.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs">{ev.location}</div>
      </div>

      <div className="p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="pr-4">
            <h3 className="text-lg font-semibold">{ev.name}</h3>
            <div className="mt-1 text-sm text-white/80">{when}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">${ev.price}</div>
            <div className="text-xs text-white/60">per ticket</div>
          </div>
        </div>
        <div className="mt-3 line-clamp-2 text-sm text-white/80">{ev.description}</div>
      </div>
    </article>
  );
}
