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
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
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
} from "lucide-react";

import hotel1 from "./assets/images/featured_hotel.avif";
import loft1 from "./assets/images/featured_loft.avif";
import theatreImg from "./assets/images/event_theatre.avif";
import villa1 from "./assets/images/featured_villa.jpeg";
import arenaImg from "./assets/images/event_arena.jpeg";
import rooftopImg from "./assets/images/event_rooftop.jpeg";

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
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 rounded-2xl p-2 text-white/90">
      <div className="flex items-center gap-2 text-sm opacity-80">
        <span className="grid place-content-center rounded-md border border-white/15 bg-white/10 p-1">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {children}
    </label>
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
  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

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
  const t2 = +new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const [min, max] = t1 <= t2 ? [t1, t2] : [t2, t1];
  return t > min && t < max;
};

const fmtShort = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

function CalendarPopover() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());

  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);

  const cells = useMonthMatrix(viewY, viewM);

  const toggle = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  const onPrev = () => {
    const m = viewM - 1;
    if (m < 0) {
      setViewM(11);
      setViewY((y) => y - 1);
    } else setViewM(m);
  };
  const onNext = () => {
    const m = viewM + 1;
    if (m > 11) {
      setViewM(0);
      setViewY((y) => y + 1);
    } else setViewM(m);
  };

  const onPick = (d: Date) => {
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
    } else {
      setEnd(d);
    }
  };

  const label =
    start && end
      ? `${fmtShort(start)} — ${fmtShort(end)}`
      : start
      ? `${fmtShort(start)} — …`
      : "Select dates";

  const isEmpty = !start && !end;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node;
      if (
        popRef.current &&
        !popRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  //const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const isSelected = useCallback(
    (d: Date) =>
      (start && isSameDate(d, start)) || (end && isSameDate(d, end)),
    [start, end]
  );

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        onClick={toggle}
        className={[
          "h-10 w-full rounded-xl px-3 text-left text-sm",
          "border border-white/15 bg-white/5",
          "hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-red-600/60",
        ].join(" ")}
      >
        <span className={isEmpty ? "text-white/60" : "text-white/90"}>{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="absolute z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(0,0,0,0.7)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.45)]"
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
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
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
                <button
                  className="underline hover:text-white"
                  onClick={() => {
                    setStart(null);
                    setEnd(null);
                  }}
                >
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

/* ----------------------------- HERO SECTION -------------------------------- */
function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
const pTitle = useTransform([mx, my], ([x, y]: number[]) => `translate3d(${(x - 0.5) * 18}px, ${(y - 0.5) * 12}px, 0)`);
const pPanel = useTransform([mx, my], ([x, y]: number[]) => `translate3d(${(x - 0.5) * -14}px, ${(y - 0.5) * -10}px, 0)`);

  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    const onVis = () => !document.hidden && tryPlay();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  }

  return (
    <section className="relative text-white">
      <div className="relative h-[55vh] md:h-[48vh] w-full overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          src="/s.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{ filter: "brightness(1.28) contrast(1.07) saturate(1.18)" }}
        />
        <div className="absolute inset-0 -z-10 bg-black/28" />
        <div className="absolute inset-0 -z-10 [background:radial-gradient(900px_circle_at_20%_10%,rgba(229,9,20,0.20),transparent_60%),radial-gradient(900px_circle_at_85%_15%,rgba(255,107,107,0.16),transparent_65%)]" />

        <div className="pointer-events-none absolute -left-1/3 top-0 -z-10 h-[150%] w-[80%] opacity-25 mix-blend-screen">
          <div className="h-full w-full animate-[spin_36s_linear_infinite] [background:conic-gradient(from_0deg_at_50%_50%,rgba(229,9,20,0.28),transparent_30%,rgba(255,255,255,0.14),transparent_60%,rgba(229,9,20,0.22),transparent_90%)]" />
        </div>
        <div className="pointer-events-none absolute -right-1/3 top-0 -z-10 h-[150%] w-[80%] opacity-20 mix-blend-screen">
          <div className="h-full w-full animate-[spin_48s_linear_infinite_reverse] [background:conic-gradient(from_140deg_at_50%_50%,rgba(255,255,255,0.12),transparent_25%,rgba(229,9,20,0.22),transparent_65%,rgba(255,255,255,0.12),transparent_95%)]" />
        </div>

        <div className="absolute inset-0 grid place-items-center px-4" onMouseMove={onMove}>
          <div className="w-full max-w-7xl rounded-[28px] border border-white/12 bg-black/35 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,.45)] p-6 md:p-8 relative overflow-hidden">
            <motion.div
              className="pointer-events-none absolute h-[260px] w-[260px] -z-10 rounded-full bg-[radial-gradient(circle,rgba(229,9,20,0.14),transparent_60%)]"
              style={{ left: glowX, top: glowY, translateX: "-50%", translateY: "-50%" }}
            />

            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 relative">
              <motion.div className="space-y-3 md:space-y-4" style={{ transform: pTitle }}>
                <Kinetic text="Welcome to RedRoute" className="text-4xl md:text-6xl" />
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

              <motion.div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur" style={{ transform: pPanel }}>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <Field icon={<MapPin className="size-4" />} label="Destination">
                    <Input className="h-10 text-sm focus:ring-2 focus:ring-red-600/60 focus:outline-none" placeholder="Where to?" />
                  </Field>
                  <Field icon={<Calendar className="size-4" />} label="Dates">
                    <CalendarPopover />
                  </Field>
                  <Field icon={<User className="size-4" />} label="Guests">
                    <Input className="h-10 text-sm focus:ring-2 focus:ring-red-600/60 focus:outline-none" placeholder="2 Adults" />
                  </Field>
                  <div className="flex items-end">
                    <Button className="h-10 w-full text-sm rounded-xl relative overflow-hidden">
                      <span className="relative z-10">Search</span>
                      <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] animate-[sheen_1.8s_linear_infinite]" />
                    </Button>
                  </div>
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
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={{ scale: 0.98 }}
      style={{ x, y, background: RR.red }}
      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(229,9,20,0.45)]"
    >
      <span className="relative z-10 flex items-center gap-2">
        <Zap className="size-4" /> Hot Now!
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
                {it.label.includes("rating") ? (
                  <>
                    <CountUp value={it.value} />★
                  </>
                ) : it.label.includes("time") ? (
                  <>
                    <CountUp value={it.value} />s
                  </>
                ) : (
                  <CountUp value={it.value} />
                )}
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
function Featured() {
  const items = [
    { title: "Skyline Luxe Hotel", img: hotel1, rating: 4.9, price: 189, tag: "Top Pick" },
    { title: "Coastal Escape Villa", img: villa1, rating: 4.8, price: 259, tag: "New" },
    { title: "Downtown Creative Loft", img: loft1, rating: 4.7, price: 139, tag: "Value" },
  ];
  return (
    <section id="gallery" className="px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold">Featured Stays</h2>
            <p className="text-white/70">Cinematic tilt, parallax, and glow.</p>
          </div>
          <Button variant="outline" className="rounded-2xl">View all</Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((it) => (
            <TiltCard key={it.title}>
              <Card className="group overflow-hidden">
                <div className="relative overflow-hidden">
                  <motion.img
                    src={it.img}
                    alt=""
                    className="h-60 w-full object-cover"
                    initial={{ scale: 1.05 }}
                    whileInView={{ scale: 1.12 }}
                    transition={{ duration: 6, ease: "linear" }}
                    whileHover={{ scale: 1.2 }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_120%,rgba(229,9,20,0.25),transparent)]"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs">{it.tag}</div>
                </div>

                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{it.title}</h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
                        <Star className="size-4" /> {it.rating} • Free cancellation
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">${it.price}</div>
                      <div className="text-xs text-white/60">per night</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Button className="rounded-xl">Reserve</Button>
                    <motion.span whileHover={{ x: 4 }} className="text-sm text-white/70">
                      Details →
                    </motion.span>
                  </div>
                </CardContent>
              </Card>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------ KEN BURNS SHOWCASE MARQUEE ----------------------- */
function KenBurnsShowcase() {
  const slides = [
    { img: arenaImg, title: "Arena Night", sub: "Citywide tour" },
    { img: rooftopImg, title: "Rooftop Cinema", sub: "Fridays 8pm" },
    { img: theatreImg, title: "Old Town Theatre", sub: "Matinee daily" },
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
                alt=""
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

/* --------------------------------- Events ---------------------------------- */
function EventStrip() {
  const ev = [
    { title: "Arena Night: The Tour", sub: "Doha • Aug 28", img: arenaImg },
    { title: "Old Town Theatre", sub: "Matinee • Daily", img: theatreImg },
    { title: "Rooftop Cinema", sub: "Fridays 8pm", img: rooftopImg },
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
                  alt=""
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

  useEffect(() => {
    if (!localStorage.getItem("rr_demo_user")) {
      navigate("/");
    }
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("rr_demo_user");
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

      <Hero />
      <StatsStrip />
      <Featured />
      <KenBurnsShowcase />
      <EventStrip />

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
