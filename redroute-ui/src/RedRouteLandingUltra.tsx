// src/RedRouteLandingUltra.tsx
import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion,  useSpring, useScroll } from "framer-motion";
import { Button } from "./components/ui/button";
import { Calendar, MapPin, User, Star, ChevronUp, LogOut, Check, Minus, Plus } from "lucide-react";

type HotelImage = { id?: number | string; url: string; alt?: string | null };
type Hotel = { id: number; name: string; city: string; country: string; price: number; rating: number | null; capacity: number; images: HotelImage[] };

const RR = { red: "#E50914" } as const;
//const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/* —— small helpers —— */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return <motion.div className="fixed left-0 right-0 top-0 z-[9999] h-1 origin-left bg-gradient-to-r from-red-600 via-white/80 to-red-600" style={{ scaleX }} />;
}

function PillInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-10 w-full rounded-xl px-3 text-left text-sm",
        "border border-white/15 bg-white/5 text-white/90 placeholder-white/60",
        "hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/60",
      ].join(" ")}
    />
  );
}

/* —— destinations —— */
type Destination = {
  id: string;
  city: string;
  country: string;
  label: string;
  meta?: string;
  emoji?: string;
  group: "Popular" | "Cities" | "Regions";
  tokens: string;
};

const DESTINATIONS: Destination[] = [
  { id: "doha-qa", city: "Doha", country: "Qatar", label: "Doha, Qatar", meta: "Popular • Middle East", emoji: "🏜️", group: "Popular", tokens: "doha qatar middle east" },
  { id: "dubai-ae", city: "Dubai", country: "UAE", label: "Dubai, UAE", meta: "Popular • Middle East", emoji: "🏙️", group: "Popular", tokens: "dubai uae united arab emirates" },
  { id: "paris-fr", city: "Paris", country: "France", label: "Paris, France", meta: "Popular • Europe", emoji: "🗼", group: "Popular", tokens: "paris france europe" },
  { id: "london-uk", city: "London", country: "United Kingdom", label: "London, United Kingdom", meta: "Popular • Europe", emoji: "🎡", group: "Popular", tokens: "london england uk united kingdom" },
  { id: "tokyo-jp", city: "Tokyo", country: "Japan", label: "Tokyo, Japan", meta: "City • Asia", emoji: "🏮", group: "Cities", tokens: "tokyo japan asia" },
  { id: "bali-id", city: "Bali", country: "Indonesia", label: "Bali, Indonesia", meta: "Popular • Asia", emoji: "🏖️", group: "Popular", tokens: "bali indonesia asia denpasar" },
  { id: "barcelona-es", city: "Barcelona", country: "Spain", label: "Barcelona, Spain", meta: "City • Europe", emoji: "🏖️", group: "Cities", tokens: "barcelona spain europe" },
  { id: "nyc-us", city: "New York", country: "USA", label: "New York, USA", meta: "City • North America", emoji: "🗽", group: "Cities", tokens: "new york nyc usa united states" },
  { id: "istanbul-tr", city: "Istanbul", country: "Türkiye", label: "Istanbul, Türkiye", meta: "City • Europe/Asia", emoji: "🕌", group: "Cities", tokens: "istanbul turkey türkiye" },
];

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/* —— Guests popover (controlled) —— */
type Guests = { adults: number; kids: number };
const MIN_ADULTS = 1;
const MAX_TOTAL = 10;

function GuestsPopover({
  value,
  onChange,
}: {
  value: Guests;
  onChange: (g: Guests) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  //const total = value.adults + value.kids;
  const label = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${value.adults} ${value.adults === 1 ? "Adult" : "Adults"}`);
    if (value.kids > 0) parts.push(`${value.kids} ${value.kids === 1 ? "Kid" : "Kids"}`);
    return parts.join(", ") || "Guests";
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

function bump(key: keyof Guests, delta: number) {
  // Start from the current controlled value
  const next: Guests = { ...value, [key]: value[key] + delta } as Guests;

  // Bounds
  if (key === "adults") next.adults = Math.max(MIN_ADULTS, next.adults);
  next.kids = Math.max(0, next.kids);

  // Respect total-cap constraint
  if (next.adults + next.kids > MAX_TOTAL) return;

  // Emit the new value
  onChange(next);
}


  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 w-full rounded-xl px-3 text-left text-sm border border-white/15 bg-white/5 text-white/90 hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/60"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {label}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(0,0,0,0.75)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.45)] p-3">
          {[
            { k: "adults" as const, title: "Adults", note: "Ages 13+" },
            { k: "kids" as const, title: "Kids", note: "Ages 2–12" },
          ].map((row) => {
            const v = value[row.k];
            const disabledMinus = row.k === "adults" ? v <= MIN_ADULTS : v <= 0;
            return (
              <div key={row.k} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <div className="text-sm">{row.title}</div>
                  <div className="text-[11px] text-white/60">{row.note}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bump(row.k, -1)}
                    disabled={disabledMinus}
                    className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20 disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <div className="w-6 text-center text-sm tabular-nums">{v}</div>
                  <button
                    type="button"
                    onClick={() => bump(row.k, +1)}
                    disabled={value.adults + value.kids >= MAX_TOTAL}
                    className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20 disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="mt-2 flex items-center justify-between gap-2">
            <button className="text-[12px] underline text-white/80 hover:text-white" onClick={() => onChange({ adults: 2, kids: 0 })}>
              Reset
            </button>
            <Button className="h-9 rounded-xl px-4 text-sm" onClick={() => setOpen(false)} style={{ background: RR.red }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* —— Destination combobox (controlled) —— */
function DestinationPicker({
  value,
  onSelect,
}: {
  value: Destination | null;
  onSelect: (d: Destination) => void;
}) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter((d) => `${d.tokens} ${d.city} ${d.country}`.includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    const out: Record<Destination["group"], Destination[]> = { Popular: [], Cities: [], Regions: [] };
    for (const d of filtered) out[d.group].push(d);
    return out;
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    if (filtered.length === 0) { setActive(null); return; }
    const current = filtered.find((d) => d.id === active);
    if (!current) setActive(filtered[0].id);
  }, [open, filtered, active]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function choose(d: Destination) {
    setQuery(d.label);
    setOpen(false);
    onSelect(d);
  }

  return (
    <div ref={rootRef} className="relative">
      <PillInput
        role="combobox"
        aria-expanded={open}
        aria-controls="destination-listbox"
        aria-activedescendant={active ? `dest-${active}` : undefined}
        placeholder="Where to?"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        spellCheck={false}
      />

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          className="absolute z-50 mt-2 w-[360px] max-h-[320px] overflow-auto rounded-2xl border border-white/12 bg-[rgba(0,0,0,0.75)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.45)]"
          id="destination-listbox"
          role="listbox"
          ref={listRef}
        >
          {["Popular", "Cities", "Regions"].map((g) => {
            const items = (grouped as any)[g] as Destination[];
            if (!items || items.length === 0) return null;
            return (
              <div key={g} className="px-2 py-2">
                <div className="sticky top-0 z-10 -mx-2 mb-2 border-b border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/75">
                  {g}
                </div>
                {items.map((d) => {
                  const isActive = active === d.id;
                  const isSelected = value?.id === d.id;
                  return (
                    <button
                      type="button"
                      key={d.id}
                      data-id={d.id}
                      id={`dest-${d.id}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActive(d.id)}
                      onClick={() => choose(d)}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                        "hover:bg-white/10 focus:bg-white/10",
                        isActive ? "bg-white/10" : "",
                      ].join(" ")}
                    >
                      <span className="text-lg">{d.emoji ?? "📍"}</span>
                      <span className="flex-1">
                        <div className="leading-tight">{d.label}</div>
                        {d.meta && <div className="text-[11px] text-white/60">{d.meta}</div>}
                      </span>
                      {isSelected && <Check className="size-4 opacity-80" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-sm text-white/70">No matches. Try a city, country, or region.</div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* —— Featured grid (fetch w/ filters) —— */
function Featured({ city, country, guests }: { city?: string; country?: string; guests?: number }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (city) params.set("city", city);
        if (country) params.set("country", country);
        if (guests && guests > 0) params.set("guests", String(guests));
        const r = await fetch(`/api/hotels${params.toString() ? `?${params}` : ""}`, { credentials: "include" });
        if (!r.ok) {
          const maybeJson = await r.json().catch(() => null);
          const msg = maybeJson?.error ?? `HTTP ${r.status}`;
          throw new Error(msg);
        }
        const data: Hotel[] = await r.json();
        setItems(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load hotels");
      } finally {
        setLoading(false);
      }
    })();
  }, [city, country, guests]);

  return (
    <section id="featured" className="px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold">Featured Stays</h2>
        <p className="text-white/70 mb-6">
          {city || country || guests ? "Filtered results" : "Cinematic tilt, parallax, and glow"}.
        </p>

        {loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-60 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-2 text-red-400 text-base">Couldn’t load hotels: {error}</div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {items.map((h) => {
              const img = h.images?.[0]?.url || "/images/featured_hotel.avif";
              return (
                <article
                  key={h.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm cursor-pointer hover:brightness-110 transition"
                  onClick={() => navigate(`/hotels/${h.id}`)}
                  title={`View details for ${h.name}`}
                >
                  <div className="relative h-60 w-full overflow-hidden">
                    <img
                      src={img}
                      alt={h.images?.[0]?.alt ?? h.name}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs">
                      {h.city}, {h.country}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{h.name}</h3>
                        <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
                          <Star className="h-4 w-4" />
                          {h.rating ?? "—"} • Up to {h.capacity} guests
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">${h.price}</div>
                        <div className="text-xs text-white/60">per night</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <button className="rounded-xl bg-[#E50914] px-4 py-2 text-sm font-semibold shadow-[0_10px_30px_rgba(229,9,20,0.45)] hover:brightness-110">
                        Reserve
                      </button>
                      <span className="text-sm text-white/70">Details →</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* —— The page — only the search bar changed to be controlled —— */
export default function RedRouteLandingUltra() {
  const navigate = useNavigate();

  // search state we pass to Featured
  const [dest, setDest] = useState<Destination | null>(DESTINATIONS[0]);
  const [guests, setGuests] = useState<Guests>({ adults: 2, kids: 0 });

  const logout = () => {
    try {
      localStorage.removeItem("rr_demo_user");
      localStorage.removeItem("rr_guest");
    } catch {}
    navigate("/");
  };

  const totalGuests = guests.adults + guests.kids;

  return (
    <div className="min-h-screen w-full bg-black font-sans text-white">
      <ScrollProgress />

      <button
        onClick={logout}
        className="fixed top-5 right-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/20"
        title="Log out"
      >
        <LogOut className="size-4" /> Logout
      </button>

      {/* HERO (trimmed to just the search panel for brevity) */}
      <section className="relative z-40 isolate bg-black pt-16 pb-10">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-white/12 bg-black/35 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,.45)] p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm opacity-80"><MapPin className="size-4" /> Destination</div>
              <DestinationPicker value={dest} onSelect={setDest} />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm opacity-80"><Calendar className="size-4" /> Dates</div>
              <PillInput readOnly placeholder="Select dates (not used in filter yet)" />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm opacity-80"><User className="size-4" /> Guests</div>
              <GuestsPopover value={guests} onChange={setGuests} />
            </div>
            <div>
              <div className="sr-only">Search</div>
              <Button
                className="h-10 w-full text-sm rounded-xl relative overflow-hidden"
                style={{ background: RR.red }}
                onClick={() => {
                  // nothing to do; Featured listens to state
                  // Leave button for UX feedback
                }}
              >
                <span className="relative z-10">Search</span>
                <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] animate-[sheen_1.8s_linear_infinite]" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filtered Featured uses dest + guests */}
      <Featured city={dest?.city} country={dest?.country} guests={totalGuests} />

      {/* you can keep your other sections below as-is */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 grid h-12 w-12 place-items-center rounded-full shadow-2xl"
        style={{ background: RR.red }}
        aria-label="Back to top"
        title="Back to top"
      >
        <ChevronUp className="size-6 text-white" />
      </button>
    </div>
  );
}
