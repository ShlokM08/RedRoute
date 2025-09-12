import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useInView,
  animate,
  AnimatePresence,
} from "framer-motion";
import { Button } from "./components/ui/button";
import {
  Calendar,
  MapPin,
  User,
  Star,
  Zap,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  TimerReset,
  ShieldCheck,
  Check,
  Minus,
  Plus,
} from "lucide-react";

/* ─────────────────────────────────────────── utils ─────────────────────────────────────────── */
const RR = { red: "#E50914" } as const;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/* ────────────────────────────────────────── inputs ────────────────────────────────────────── */
function PillInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-10 w-full rounded-xl px-3 text-left text-sm",
        "border border-white/15 bg-white/5 text-white/90 placeholder-white/60",
        "hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/60",
        (props.className ?? ""),
      ].join(" ")}
    />
  );
}

/* ─────────────────────────────────────── destination ─────────────────────────────────────── */
type Destination = {
  id: string;
  label: string;
  meta?: string;
  emoji?: string;
  group: "Popular" | "Cities" | "Regions";
  tokens: string;
};

const DESTINATIONS: Destination[] = [
  { id: "doha",     label: "Doha, Qatar",            meta: "Popular • Middle East", emoji: "🏜️", group: "Popular", tokens: "doha qatar middle east" },
  { id: "dubai",    label: "Dubai, UAE",             meta: "Popular • Middle East", emoji: "🏙️", group: "Popular", tokens: "dubai uae united arab emirates middle east" },
  { id: "paris",    label: "Paris, France",          meta: "Popular • Europe",      emoji: "🗼", group: "Popular", tokens: "paris france europe" },
  { id: "bali",     label: "Bali, Indonesia",        meta: "Popular • Asia",        emoji: "🏖️", group: "Popular", tokens: "bali indonesia asia denpasar" },
  { id: "london",   label: "London, United Kingdom", meta: "Popular • Europe",      emoji: "🎡", group: "Popular", tokens: "london uk united kingdom england europe" },
  { id: "rome",     label: "Rome, Italy",            meta: "City • Europe",  emoji: "🏛️", group: "Cities",  tokens: "rome italy europe" },
  { id: "barcelona",label: "Barcelona, Spain",       meta: "City • Europe",  emoji: "🏖️", group: "Cities",  tokens: "barcelona spain europe" },
  { id: "istanbul", label: "Istanbul, Türkiye",      meta: "City • Europe/Asia", emoji: "🕌", group: "Cities", tokens: "istanbul turkey türkiye eurasia" },
  { id: "newyork",  label: "New York, USA",          meta: "City • North America", emoji: "🗽", group: "Cities", tokens: "new york nyc usa united states america" },
  { id: "tokyo",    label: "Tokyo, Japan",           meta: "City • Asia",    emoji: "🏮", group: "Cities",  tokens: "tokyo japan asia" },
  { id: "amalfi",   label: "Amalfi Coast, Italy",    meta: "Region • Europe", emoji: "🌊", group: "Regions", tokens: "amalfi coast italy europe" },
  { id: "alps",     label: "Swiss Alps, Switzerland",meta: "Region • Europe", emoji: "🏔️", group: "Regions", tokens: "swiss alps switzerland europe mountains" },
  { id: "riviera",  label: "French Riviera, France", meta: "Region • Europe", emoji: "🌞", group: "Regions", tokens: "french riviera cote d azur france europe nice cannes monaco" },
  { id: "bavaria",  label: "Bavaria, Germany",       meta: "Region • Europe", emoji: "🏰", group: "Regions", tokens: "bavaria germany europe munich" },
  { id: "maldives", label: "Maldives",               meta: "Region • Indian Ocean", emoji: "🏝️", group: "Regions", tokens: "maldives indian ocean resort islands" },
];

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function DestinationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(value);
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter((d) => d.tokens.includes(q));
  }, [value]);

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

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      const idx = filtered.findIndex((d) => d.id === active);
      const next = filtered[Math.min(idx + 1, filtered.length - 1)];
      if (next) setActive(next.id);
      scrollIntoView(next?.id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      const idx = filtered.findIndex((d) => d.id === active);
      const prev = filtered[Math.max(idx - 1, 0)];
      if (prev) setActive(prev.id);
      scrollIntoView(prev?.id);
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      const sel = filtered.find((d) => d.id === active) ?? filtered[0];
      if (sel) { onChange(sel.label); setOpen(false); }
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); setOpen(false); }
    }
  }

  function scrollIntoView(id?: string) {
    if (!id || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(`[data-id="${id}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div ref={rootRef} className="relative">
      <PillInput
        role="combobox"
        aria-expanded={open}
        aria-controls="destination-listbox"
        aria-activedescendant={active ? `dest-${active}` : undefined}
        placeholder="Where to?"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
      />

      <AnimatePresence>
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
            {(["Popular", "Cities", "Regions"] as const).map((g) => {
              const items = grouped[g];
              if (!items || items.length === 0) return null;
              return (
                <div key={g} className="px-2 py-2">
                  <div className="sticky top-0 z-10 -mx-2 mb-2 border-b border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/75">
                    {g}
                  </div>
                  {items.map((d) => {
                    const isActive = active === d.id;
                    const isSelected = normalize(value) === normalize(d.label);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        data-id={d.id}
                        id={`dest-${d.id}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setActive(d.id)}
                        onClick={() => { onChange(d.label); setOpen(false); }}
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
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────────────────── guests ───────────────────────────────────────── */
type Guests = { adults: number; kids: number };
const MIN_ADULTS = 1;
const MAX_TOTAL = 10;

function GuestsPopover({
  value,
  onChange,
}: {
  value: Guests;
  onChange: (v: Guests) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const total = value.adults + value.kids;
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
    let next: Guests = { ...value, [key]: (value[key] as number) + delta } as Guests;
    if (key === "adults") next.adults = Math.max(MIN_ADULTS, next.adults);
    next.kids = Math.max(0, next.kids);
    if (next.adults + next.kids > MAX_TOTAL) return; // ignore
    onChange(next);
  }

  function Row({
    title, note, value, onMinus, onPlus, disabledMinus, disabledPlus,
  }: {
    title: string; note?: string; value: number;
    onMinus: () => void; onPlus: () => void;
    disabledMinus?: boolean; disabledPlus?: boolean;
  }) {
    return (
      <div className="flex items-center justify-between gap-4 py-2">
        <div>
          <div className="text-sm">{title}</div>
          {note && <div className="text-[11px] text-white/60">{note}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMinus}
            disabled={disabledMinus}
            className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20 disabled:opacity-40"
            aria-label={`Decrease ${title}`}
          >
            <Minus className="size-4" />
          </button>
          <div className="w-6 text-center text-sm tabular-nums">{value}</div>
          <button
            type="button"
            onClick={onPlus}
            disabled={disabledPlus}
            className="grid size-8 place-items-center rounded-lg border border-white/12 bg-white/10 hover:bg-white/20 disabled:opacity-40"
            aria-label={`Increase ${title}`}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    );
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="absolute z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(0,0,0,0.75)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.45)] p-3"
            role="dialog"
          >
            <div className="px-1 text-[11px] text-white/60">Max {MAX_TOTAL} guests total</div>
            <Row
              title="Adults"
              note="Ages 13+"
              value={value.adults}
              onMinus={() => bump("adults", -1)}
              onPlus={() => bump("adults", +1)}
              disabledMinus={value.adults <= MIN_ADULTS}
              disabledPlus={total >= MAX_TOTAL}
            />
            <Row
              title="Kids"
              note="Ages 2–12"
              value={value.kids}
              onMinus={() => bump("kids", -1)}
              onPlus={() => bump("kids", +1)}
              disabledMinus={value.kids <= 0}
              disabledPlus={total >= MAX_TOTAL}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                className="text-[12px] underline text-white/80 hover:text-white"
                onClick={() => onChange({ adults: 2, kids: 0 })}
              >
                Reset
              </button>
              <Button
                className="h-9 rounded-xl px-4 text-sm"
                onClick={() => setOpen(false)}
                style={{ background: RR.red }}
              >
                Done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────────────── helpers / little UI ───────────────────────────────────── */
function MagneticButton() {
  const x = useSpring(0, { stiffness: 200, damping: 15 });
  const y = useSpring(0, { stiffness: 200, damping: 15 });

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    x.set(clamp(dx * 0.2, -12, 12));
    y.set(clamp(dy * 0.2, -10, 10));
  }
  function onLeave() { x.set(0); y.set(0); }

  return (
    <motion.button
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={{ scale: 0.98 }}
      style={{ x, y, background: RR.red }}
      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(229,9,20,0.45)]"
    >
      <span className="relative z-10 flex items-center gap-2">
        <Zap className="size-4" /> Book Now
      </span>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.28),transparent)] transition-transform duration-700 group-hover:translate-x-0" />
    </motion.button>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[9999] h-1 origin-left bg-gradient-to-r from-red-600 via-white/80 to-red-600"
      style={{ scaleX }}
    />
  );
}

/* ───────────────────────────────────── featured list ───────────────────────────────────── */
type HotelImage = { id?: number | string; url: string; alt?: string | null };
type Hotel = { id: number; name: string; city: string; price: number; rating: number | null; capacity?: number; images: HotelImage[]; };

function Featured({ items, loading, error }: { items: Hotel[]; loading: boolean; error: string | null }) {
  const navigate = useNavigate();

  return (
    <section id="featured" className="px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold">Featured Stays</h2>
        <p className="text-white/70 mb-6">Cinematic tilt, parallax, and glow.</p>

        {loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-60 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-2 text-red-400 text-base">
            Couldn’t load hotels: {error}
          </div>
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
                      {h.city}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{h.name}</h3>
                        <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
                          <Star className="h-4 w-4" />
                          {h.rating ?? "—"} • Free cancellation
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

/* ───────────────────────────────────────── hero + page ───────────────────────────────────────── */
function HeroSearch({
  destination,
  setDestination,
  guests,
  setGuests,
  onSearch,
}: {
  destination: string;
  setDestination: (v: string) => void;
  guests: Guests;
  setGuests: (v: Guests) => void;
  onSearch: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
        <div className="flex flex-col gap-2 rounded-2xl p-2 text-white/90">
          <div className="flex items-center gap-2 text-sm opacity-80 min-h-[20px]">
            <span className="grid place-content-center rounded-md border border-white/15 bg-white/10 p-1">
              <MapPin className="size-4" />
            </span>
            <span>Destination</span>
          </div>
          <DestinationPicker value={destination} onChange={setDestination} />
        </div>

        <div className="flex flex-col gap-2 rounded-2xl p-2 text-white/90">
          <div className="flex items-center gap-2 text-sm opacity-80 min-h-[20px]">
            <span className="grid place-content-center rounded-md border border-white/15 bg-white/10 p-1">
              <Calendar className="size-4" />
            </span>
            <span>Dates</span>
          </div>
          <PillInput readOnly placeholder="Select dates" />
        </div>

        <div className="flex flex-col gap-2 rounded-2xl p-2 text-white/90">
          <div className="flex items-center gap-2 text-sm opacity-80 min-h-[20px]">
            <span className="grid place-content-center rounded-md border border-white/15 bg-white/10 p-1">
              <User className="size-4" />
            </span>
            <span>Guests</span>
          </div>
          <GuestsPopover value={guests} onChange={setGuests} />
        </div>

        <div className="flex flex-col gap-2 rounded-2xl p-2 text-white/90">
          <span className="sr-only">Search</span>
          <Button className="h-10 w-full text-sm rounded-xl relative overflow-hidden" onClick={onSearch}>
            <span className="relative z-10">Search</span>
            <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] animate-[sheen_1.8s_linear_infinite]" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RedRouteLandingUltra() {
  const navigate = useNavigate();

  const [destination, setDestination] = useState("Doha, Qatar"); // default sample
  const [guests, setGuests] = useState<Guests>({ adults: 2, kids: 0 });

  const [items, setItems] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const totalGuests = guests.adults + guests.kids;

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (destination.trim()) params.set("city", destination);
      if (totalGuests > 0) params.set("guests", String(totalGuests));

      const r = await fetch(`/api/hotels?${params.toString()}`, { credentials: "include" });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as Hotel[];
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load hotels");
    } finally {
      setLoading(false);
    }
  }, [destination, totalGuests]);

  useEffect(() => {
    // initial load (no filters or with defaults)
    fetchHotels();
  }, []); // eslint-disable-line

  const logout = () => {
    try {
      localStorage.removeItem("rr_demo_user");
      localStorage.removeItem("rr_guest");
    } catch {}
    navigate("/"); // your auth gate will send to /login
  };

  /* simple hero top (trimmed to the essentials for this change) */
  return (
    <div className="min-h-screen w-full bg-black font-sans">
      <ScrollProgress />

      <button
        onClick={logout}
        className="fixed top-5 right-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/20"
        title="Log out"
      >
        <LogOut className="size-4" /> Logout
      </button>

      {/* HERO (only the search block shown for brevity) */}
      <section className="relative text-white isolate bg-black">
        <div className="relative h-[32vh] md:h-[28vh] w-full overflow-visible">
          <div className="absolute inset-0 grid place-items-center px-4">
            <div className="w-full max-w-7xl rounded-[28px] border border-white/12 bg-black/35 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,.45)] p-6 md:p-8 relative overflow-visible z-30">
              <div className="space-y-4">
                <div className="text-3xl md:text-4xl font-black">Find your perfect stay</div>
                <HeroSearch
                  destination={destination}
                  setDestination={setDestination}
                  guests={guests}
                  setGuests={setGuests}
                  onSearch={fetchHotels}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Featured items={items} loading={loading} error={error} />

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
