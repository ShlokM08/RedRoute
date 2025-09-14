import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
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

/* --------------------- cookie helpers (NEW) --------------------- */
function setCookie(name: string, value: string, days = 7) {
  const maxAge = `Max-Age=${days * 24 * 60 * 60}`;
  const sameSite = "SameSite=Lax";
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? " Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; ${maxAge}; ${sameSite};${secure}`;
}
function deleteCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/* ------------------------ KEN BURNS SHOWCASE MARQUEE ----------------------- */
function KenBurnsShowcase() {
  const slides = [
    { img: "/images/event_arena.jpeg",   title: "Arena Night",      sub: "Citywide tour" },
    { img: "/images/event_rooftop.jpeg", title: "Rooftop Cinema",   sub: "Fridays 8pm" },
    { img: "/images/event_theatre.avif", title: "Old Town Theatre", sub: "Matinee daily" },
  ];
  const seq = [...slides, ...slides];

  return (
    <section className="px-6 pb-16 text-white">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="relative flex animate-[kbmarquee_30s_linear_infinite]">
          {seq.map((s, i) => (
            <div key={i} className="relative h-56 min-w-[70%] md:h-72 md:min-w-[40%] overflow-hidden">
              <motion.img
                src={s.img}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg"; }}
                alt={s.title}
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ scale: 1.05, x: 0 }}
                whileInView={{ scale: 1.18, x: 15 }}
                transition={{ duration: 10, ease: "linear" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/0" />
              <div className="absolute bottom-3 left-4">
                <div className="text-sm text-white/80">{s.sub}</div>
                <div className="text-xl font-semibold">{s.title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes kbmarquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @media (prefers-reduced-motion: reduce) { .animate-[kbmarquee_30s_linear_infinite]{animation:none} }
      `}</style>
    </section>
  );
}

const RR = { red: "#E50914" } as const;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/* --------------------------- KINETIC HEADLINE ------------------------------ */
function Kinetic({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  let idx = 0;
  return (
    <h1 className={`mx-auto text-center font-black leading-[1.05] tracking-tight ${className}`}>
      {words.map((w, wi) => {
        const letters = w.split("").map((ch, i) => {
          const delay = 0.02 * idx++;
          return (
            <motion.span
              key={`${wi}-${i}`}
              initial={{ y: "1.2em", rotateX: -90, opacity: 0 }}
              animate={{ y: 0, rotateX: 0, opacity: 1 }}
              transition={{ delay, type: "spring", stiffness: 250, damping: 20 }}
              className="inline-block [perspective:600px]"
            >
              <span className="inline-block bg-clip-text text-transparent [background-image:linear-gradient(180deg,#fff,rgba(255,255,255,0.75))]">
                {ch}
              </span>
            </motion.span>
          );
        });
        return (
          <span key={wi} className="inline-block whitespace-nowrap mr-2">
            {letters}
          </span>
        );
      })}
    </h1>
  );
}

/* ---------------------------- FIELD WRAPPER -------------------------------- */
function Field({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div role="group" className="flex flex-col gap-2 rounded-2xl p-2 text-white/90">
      <div className="flex items-center gap-2 text-sm opacity-80 min-h-[20px]">
        {icon != null && (
          <span className="grid place-content-center rounded-md border border-white/15 bg-white/10 p-1">
            {icon}
          </span>
        )}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

/* ----------------------------- TILT CARD ----------------------------------- */
function TiltCard({ children }: { children: React.ReactNode }) {
  const rx = useSpring(0, { stiffness: 120, damping: 12 });
  const ry = useSpring(0, { stiffness: 120, damping: 12 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - el.left) / el.width;
    const y = (e.clientY - el.top) / el.height;
    ry.set(clamp((x - 0.5) * 16, -8, 8));
    rx.set(clamp(-(y - 0.5) * 16, -8, 8));
  }
  function onLeave() { rx.set(0); ry.set(0); }

  return (
    <motion.div
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------- SCROLL PROGRESS BAR ----------------------------- */
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

/* ----------------------- THEMED CALENDAR POPOVER --------------------------- */
type DayCell = { date: Date; currentMonth: boolean; isToday: boolean };

function useMonthMatrix(year: number, month: number) {
  return useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: DayCell[] = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const date = new Date(year, month - 1, d);
      cells.push({ date, currentMonth: false, isToday: isSameDate(date, new Date()) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, currentMonth: true, isToday: isSameDate(date, new Date()) });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1]?.date ?? new Date(year, month, 1);
      const date = new Date(last);
      date.setDate(date.getDate() + 1);
      cells.push({ date, currentMonth: false, isToday: isSameDate(date, new Date()) });
    }
    return cells;
  }, [year, month]);
}

const monthName = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

const isSameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isWithin = (d: Date, a: Date | null, b: Date | null) => {
  if (!a || !b) return false;
  const t = +new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const t1 = +new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const t2 = +new Date(b.getFullYear?.() ?? b.getFullYear(), b.getMonth(), b.getDate()); // defensive
  const [min, max] = t1 <= t2 ? [t1, t2] : [t2, t1];
  return t > min && t < max;
};

const fmtShort = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

/* ------------------------ INPUT PRIMITIVE (used by picker) ------------------ */
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

/* ------------------------ DESTINATION PICKER (autocomplete) ---------------- */
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

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** CONTROLLED: value = current city string, onChange(cityOnly) updates parent */
function DestinationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (city: string) => void;
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
      if (sel) {
        const cityOnly = sel.label.split(",")[0];
        onChange(cityOnly);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); setOpen(false); }
    }
  }

  function scrollIntoView(id?: string) {
    if (!id || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(`[data-id="${id}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }

  function select(d: Destination) {
    const cityOnly = d.label.split(",")[0];
    onChange(cityOnly);
    setOpen(false);
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
                    const isSelected = normalize(value) === normalize(d.label.split(",")[0]);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        data-id={d.id}
                        id={`dest-${d.id}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setActive(d.id)}
                        onClick={() => select(d)}
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

/* ----------------------- GUESTS POPOVER (adults/kids) ---------------------- */
type Guests = { adults: number; kids: number };
const MIN_ADULTS = 1;
const MAX_TOTAL = 10;

/** CONTROLLED: value + onChange come from parent so we can filter by capacity */
function GuestsPopover({
  value,
  onChange,
}: {
  value: Guests;
  onChange: (g: Guests) => void;
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
    // Start from current value (controlled by parent)
    let next: Guests = {
      adults: value.adults,
      kids: value.kids,
    };

    if (key === "adults") {
      next.adults = Math.max(MIN_ADULTS, value.adults + delta);
    } else {
      next.kids = Math.max(0, value.kids + delta);
    }

    // Respect total cap
    if (next.adults + next.kids > MAX_TOTAL) return;

    onChange(next); // pass a value, not a function
  }

  function Row({ title, note, value, onMinus, onPlus, disabledMinus, disabledPlus }: {
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

/* ----------------------- CALENDAR POPOVER (pill-styled) -------------------- */
function CalendarPopover() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());

  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);

  const cells = useMonthMatrix(viewY, viewM);

  const onPrev = () => {
    const m = viewM - 1;
    if (m < 0) { setViewM(11); setViewY((y) => y - 1); } else setViewM(m);
  };
  const onNext = () => {
    const m = viewM + 1;
    if (m > 11) { setViewM(0); setViewY((y) => y + 1); } else setViewM(m);
  };

  const onPick = (d: Date) => {
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
    } else {
      setEnd(d);
      setTimeout(() => setOpen(false), 120);
    }
  };

  const label =
    start && end
      ? `${fmtShort(start)} — ${fmtShort(end)}`
      : start
      ? `${fmtShort(start)} — …`
      : "";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (
        popRef.current &&
        !popRef.current.contains(t) &&
        anchorRef.current &&
        !anchorRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const dow = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const isSelected = useCallback(
    (d: Date) => (start && isSameDate(d, start)) || (end && isSameDate(d, end)),
    [start, end]
  );

  return (
    <div ref={anchorRef} className="relative">
      <PillInput
        readOnly
        value={label}
        placeholder="Select dates"
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Select dates"
      />

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="absolute z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(0,0,0,0.7)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.45)]"
            role="dialog"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.06]">
              <button
                onClick={onPrev}
                className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/10 text-white hover:bg-white/20"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-sm font-semibold">{monthName(viewY, viewM)}</div>
              <button
                onClick={onNext}
                className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/10 text-white hover:bg-white/20"
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="px-3 py-2">
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-white/60">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (<div key={d} className="py-1">{d}</div>))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map(({ date, currentMonth, isToday }, idx) => {
                  const selected = isSelected(date);
                  const inRange = isWithin(date, start, end);
                  return (
                    <button
                      key={idx}
                      onClick={() => onPick(date)}
                      className={[
                        "relative h-10 rounded-lg text-sm",
                        "border border-white/10",
                        currentMonth ? "text-white/90" : "text-white/40",
                        "bg-white/5 hover:bg-white/10",
                        selected ? "bg-[#E50914] text-white border-[#E50914]" : "",
                        inRange ? "bg-white/10" : "",
                        isToday && !selected ? "ring-1 ring-white/30" : "",
                      ].join(" ")}
                      title={date.toDateString()}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-white/60">
                <span>Pick start, then end</span>
                <button className="underline hover:text-white" onClick={() => { setStart(null); setEnd(null); }}>
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Testimonials() {
  const quotes = [
    { name: "Aman Mehra", role: "Product Lead", text: "RedRoute feels like a movie trailer — fast, beautiful, and I’m checked out in seconds.", initials: "AM", rating: 5 },
    { name: "Sara Khan", role: "Event Planner", text: "Searching hotels + events in one flow is brilliant. The micro-interactions are 👌", initials: "SK", rating: 5 },
  ];
  return (
    <section className="px-6 pb-16 text-white">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-6 text-3xl font-bold">What people say</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {quotes.map((q) => (
            <div key={q.name} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white/15 text-sm font-semibold">{q.initials}</div>
                <div className="flex-1">
                  <div className="mb-2 flex gap-1 text-white/90">
                    {Array.from({ length: q.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-white/90" />
                    ))}
                  </div>
                  <p className="text-white/85">{q.text}</p>
                  <div className="mt-3 text-sm text-white/70">
                    {q.name} • {q.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="px-6 pb-16 pt-10 text-white">
      <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="text-2xl font-black">RedRoute</div>
            <div className="text-white/70">Hotels • Events • Experiences</div>
          </div>
          <nav className="flex gap-6 text-sm text-white/80">
            <a href="#" className="hover:text-white">About</a>
            <a href="#" className="hover:text-white">Careers</a>
            <a href="#" className="hover:text-white">Help</a>
            <a href="#" className="hover:text-white">Privacy</a>
          </nav>
        </div>
        <div className="mt-6 border-t border-white/10 pt-4 text-sm text-white/60">
          © {year} RedRoute. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ----------------------------- HERO SECTION -------------------------------- */
function Hero({
  city,
  setCity,
  guests,
  setGuests,
}: {
  city: string;
  setCity: (c: string) => void;
  guests: Guests;
  setGuests: (g: Guests | ((prev: Guests) => Guests)) => void;
}) {
  // cursor glow & parallax (kept)
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const pTitle = useTransform([mx, my], ([x, y]: number[]) => `translate3d(${(x - 0.5) * 18}px, ${(y - 0.5) * 12}px, 0)`);
  const pPanel = useTransform([mx, my], ([x, y]: number[]) => `translate3d(${(x - 0.5) * -14}px, ${(y - 0.5) * -10}px, 0)`);

  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);

  // Personalized headline
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const fromLS = (localStorage.getItem("rr_name") || "").trim();
    if (fromLS) {
      setFirstName(fromLS.split(" ")[0]);
      return;
    }

    (async () => {
      try {
        // IMPORTANT: include credentials so cookies round-trip
        const r = await fetch("/api/auth/me", { credentials: "include" });
        if (r.ok) {
          const me = await r.json().catch(() => null);
          const fn: string | undefined =
            me?.user?.firstName || me?.firstName || me?.user?.name || me?.name;
          const id: string | undefined = me?.user?.id || me?.id;
          const email: string | undefined = me?.user?.email || me?.email;

          if (fn && fn.trim()) {
            localStorage.setItem("rr_name", fn);
            setFirstName(fn.split(" ")[0]);
          }
          // NEW: set cookies that /api/bookings reads (uid/email)
          if (id && typeof id === "string") setCookie("uid", id, 7);
          if (email && typeof email === "string") {
            localStorage.setItem("rr_email", email);
            setCookie("email", email, 7);
          }
          return;
        }
      } catch {}
      const email = (localStorage.getItem("rr_email") || "").trim();
      if (email.includes("@")) {
        const guess = email.split("@")[0];
        if (guess) setFirstName(guess);
      }
    })();
  }, []);

  const headline = `Welcome to RedRoute${firstName ? `,\u00A0${firstName}` : ""}`;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  }

  const scrollToFeatured = () => {
    const el = document.getElementById("featured");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative text-white z-40 isolate bg-black">
      <div className="relative h-[55vh] md:h-[48vh] w-full overflow-visible">
        <div className="absolute inset-0 -z-10 [background:radial-gradient(900px_circle_at_20%_10%,rgba(229,9,20,0.20),transparent_60%),radial-gradient(900px_circle_at_85%_15%,rgba(255,107,107,0.16),transparent_65%)]" />
        <div className="pointer-events-none absolute -left-1/3 top-0 -z-10 h-[150%] w-[80%] opacity-25 mix-blend-screen">
          <div className="h-full w-full animate-[spin_36s_linear_infinite] [background:conic-gradient(from_0deg_at_50%_50%,rgba(229,9,20,0.28),transparent_30%,rgba(255,255,255,0.14),transparent_60%,rgba(229,9,20,0.22),transparent_90%)]" />
        </div>
        <div className="pointer-events-none absolute -right-1/3 top-0 -z-10 h-[150%] w-[80%] opacity-20 mix-blend-screen">
          <div className="h-full w-full animate-[spin_48s_linear_infinite_reverse] [background:conic-gradient(from_140deg_at_50%_50%,rgba(255,255,255,0.12),transparent_25%,rgba(229,9,20,0.22),transparent_65%,rgba(255,255,255,0.12),transparent_95%)]" />
        </div>

        <div className="absolute inset-0 grid place-items-center px-4" onMouseMove={onMove}>
          <div className="w-full max-w-7xl rounded-[28px] border border-white/12 bg-black/35 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,.45)] p-6 md:p-8 relative overflow-visible z-30">
            <motion.div
              className="pointer-events-none absolute h-[260px] w-[260px] -z-10 rounded-full bg-[radial-gradient(circle,rgba(229,9,20,0.14),transparent_60%)]"
              style={{ left: glowX, top: glowY, translateX: "-50%", translateY: "-50%" }}
            />

            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 relative">
              <motion.div className="space-y-3 md:space-y-4" style={{ transform: pTitle }}>
                <Kinetic text={headline} className="text-4xl md:text-6xl" />
                <p className="max-w-xl text-sm md:text-base text-white/85">
                  Hotels. Events. Experiences. Your gateway to the time of your life—anywhere, anytime!
                </p>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <MagneticButton />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] md:text-sm text-white/75">
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Trusted by 120k+</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">4.9★ rating</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Lightning checkout</div>
                </div>
              </motion.div>

              {/* RIGHT: compact search with controlled destination & guests */}
              <motion.div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur" style={{ transform: pPanel }}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
                  <Field icon={<MapPin className="size-4" />} label="Destination">
                    <DestinationPicker value={city} onChange={setCity} />
                  </Field>
                  <Field icon={<Calendar className="size-4" />} label="Dates">
                    <CalendarPopover />
                  </Field>
                  <Field icon={<User className="size-4" />} label="Guests">
                    <GuestsPopover value={guests} onChange={setGuests as any} />
                  </Field>
                  <Field label={<span className="sr-only">Search</span>}>
                    <Button
                      className="h-10 w-full text-sm rounded-xl relative overflow-hidden"
                      onClick={scrollToFeatured}
                    >
                      <span className="relative z-10">Search</span>
                      <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] animate-[sheen_1.8s_linear_infinite]" />
                    </Button>
                  </Field>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                  <div className="flex animate-[marquee_18s_linear_infinite] whitespace-nowrap text-[11px] md:text-xs [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span key={i} className="px-4 py-2 text-white/80">
                        🔥 Doha Jazz Fest • 🏨 Skyline Luxe Deal • 🎟️ Rooftop Cinema • 🎤 Live Arena Tour • 🎭 Theatre Night
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes sheen { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
          @media (prefers-reduced-motion: reduce) {
            .animate-[marquee_18s_linear_infinite] { animation: none !important; }
            .animate-[spin_36s_linear_infinite], .animate-[spin_48s_linear_infinite_reverse] { animation: none !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ---------------------- Magnetic demo button with sheen -------------------- */
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

/* ------------------------------- STATS STRIP ------------------------------- */
function CountUp({ value }: { value: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40% 0px" });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (inView) {
      const controls = animate(mv, value, { duration: 1.2, ease: "easeOut" });
      return () => controls.stop();
    }
  }, [inView, value, mv]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

function StatsStrip() {
  const items = [
    { icon: <Sparkles className="size-5" />, label: "Experiences booked", value: 128_432 },
    { icon: <TimerReset className="size-5" />, label: "Avg. checkout time", value: 28 },
    { icon: <ShieldCheck className="size-5" />, label: "Hotels partnered", value: 960 },
    { icon: <Star className="size-5" />, label: "Avg. rating", value: 4.9 },
  ];
  return (
    <section className="px-6 pt-10 text-white">
      <div className="mx-auto max-w-7xl grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm flex items-center gap-3">
            <div className="grid place-items-center rounded-xl bg-white/10 p-2">{it.icon}</div>
            <div>
              <div className="text-xl font-bold">
                {it.label.includes("rating") ? (<><CountUp value={it.value} />★</>) :
                 it.label.includes("time") ? (<><CountUp value={it.value} />s</>) :
                 (<CountUp value={it.value} />)}
              </div>
              <div className="text-xs text-white/70">{it.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- Featured --------------------------------- */
type HotelImage = { id: string; url: string; alt?: string | null };
type Hotel = {
  id: string;
  name: string;
  city: string;
  price: number;
  rating: number | null;
  capacity?: number | null;   // <-- include capacity from API
  images: HotelImage[];
};

function Featured({ cityFilter, guests }: { cityFilter: string; guests: Guests }) {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<Hotel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/hotels", { credentials: "include" }); // keep cookies
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
  }, []);

  const filtered = useMemo(() => {
    const q = cityFilter.trim().toLowerCase();
    const totalGuests = (guests?.adults ?? 0) + (guests?.kids ?? 0);
    return items.filter((h) => {
      const cityOk = q ? h.city?.toLowerCase().includes(q) : true;
      const capOk =
        totalGuests > 0 && h.capacity != null
          ? h.capacity >= totalGuests
          : true; // if guests not set, don't filter by capacity
      return cityOk && capOk;
    });
  }, [items, cityFilter, guests]);

  return (
    <section id="featured" className="px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold">Featured Stays</h2>
        <p className="text-white/70 mb-6">
          Cinematic tilt, parallax, and glow
          {((guests.adults + guests.kids) > 0) && ` • showing stays for ${guests.adults + guests.kids} guests`}
          {cityFilter && ` • in ${cityFilter}`}
          .
        </p>

        {loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-60 rounded-2xl bg-white/5 animate-pulse border border-white/10"
              />
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
            {filtered.map((h) => {
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

/* --------------------------------- Events ---------------------------------- */
function EventStrip() {
  const ev = [
    { title: "Arena Night: The Tour", sub: "Doha • Aug 28", img: "/images/event_arena.jpeg" },
    { title: "Old Town Theatre",      sub: "Matinee • Daily", img: "/images/event_theatre.avif" },
    { title: "Rooftop Cinema",        sub: "Fridays 8pm",     img: "/images/event_rooftop.jpeg" },
  ];

  return (
    <section className="px-6 pb-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Tonight in the City</h2>
          <p className="text-white/70">Curated events with motion-blur slides.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ev.map((e) => (
            <TiltCard key={e.title}>
              <motion.a
                href="#"
                className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/5"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <motion.img
                  src={e.img}
                  onError={(img) => { (img.currentTarget as HTMLImageElement).src = "/images/fallback.jpg"; }}
                  alt={e.title}
                  className="h-60 w-full object-cover"
                  whileHover={{ scale: 1.1, filter: "blur(1px)" }}
                  transition={{ duration: 0.6 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/0" />
                <div className="absolute inset-x-4 bottom-4">
                  <div className="text-sm text-white/70">{e.sub}</div>
                  <div className="text-xl font-semibold">{e.title}</div>
                </div>
              </motion.a>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- PAGE -------------------------------------- */
export default function RedRouteLandingUltra() {
  const navigate = useNavigate();

  // Stop any videos from earlier pages
  useEffect(() => {
    document.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      v.pause();
      v.removeAttribute("src");
      try { v.load(); } catch {}
    });
  }, []);

  // Controlled filters
  const [cityFilter, setCityFilter] = useState("");
  const [guestsFilter, setGuestsFilter] = useState<Guests>({ adults: 2, kids: 0 });

  const logout = () => {
    try {
      localStorage.removeItem("rr_demo_user");
      localStorage.removeItem("rr_guest");
      localStorage.removeItem("rr_name");
      localStorage.removeItem("rr_email");
      // clear auth cookies used by API
      deleteCookie("uid");
      deleteCookie("userId");
      deleteCookie("user_id");
      deleteCookie("email");
      deleteCookie("user_email");
    } catch {}
    navigate("/");
  };

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

      {/* Pass city + guests filters into Hero */}
      <Hero city={cityFilter} setCity={setCityFilter} guests={guestsFilter} setGuests={setGuestsFilter} />
      <StatsStrip />
      {/* Featured renders with filtering by city + capacity */}
      <Featured cityFilter={cityFilter} guests={guestsFilter} />
      <KenBurnsShowcase />
      <EventStrip />
      <Testimonials />
      <SiteFooter />

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
