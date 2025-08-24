import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import {
  Calendar,
  MapPin,
  User,
  Star,
  Zap,
  Play,
  ChevronRight,
  LogOut,
} from "lucide-react";

// --- LOCAL IMAGES ---
import hotel1 from "./assets/images/featured_hotel.avif";
import loft1 from "./assets/images/featured_loft.avif";
import theatreImg from "./assets/images/event_theatre.avif";

import villa1 from "./assets/images/featured_villa.jpeg";  // <-- changed to .jpeg
import arenaImg from "./assets/images/event_arena.jpeg";
import rooftopImg from "./assets/images/event_rooftop.jpeg";
// --------------------

const RR = { red: "#E50914" } as const;

/* ---------- Kinetic headline (per-word) ---------- */
function Kinetic({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  let globalIndex = 0;
  return (
    <h1 className={`mx-auto text-center font-black leading-[1.05] tracking-tight ${className}`}>
      {words.map((word, wi) => {
        const letters = word.split("").map((ch, i) => {
          const delay = 0.02 * (globalIndex++);
          return (
            <motion.span
              key={`${wi}-${i}`}
              initial={{ y: "1.3em", rotateX: -90, opacity: 0 }}
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

/* ---------- Small field wrapper ---------- */
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

/* ---------- HERO (banner-in-banner with /s.mp4 video) ---------- */
function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    const onVis = () => !document.hidden && tryPlay();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <section className="relative text-white">
      {/* OUTER BANNER (video) */}
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
          style={{ filter: "brightness(1.25) contrast(1.06) saturate(1.18)" }}
        />
        {/* lighter overlay so the video shows */}
        <div className="absolute inset-0 -z-10 bg-black/30" />
        <div className="absolute inset-0 -z-10 [background:radial-gradient(900px_circle_at_20%_10%,rgba(229,9,20,0.22),transparent_60%),radial-gradient(900px_circle_at_85%_15%,rgba(255,107,107,0.18),transparent_65%)]" />

        {/* INNER BANNER */}
        <div className="absolute inset-0 grid place-items-center px-4">
          <div className="w-full max-w-7xl rounded-[28px] border border-white/12 bg-black/35 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,.45)] p-6 md:p-8">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
              {/* LEFT: headline + actions */}
              <div className="space-y-3 md:space-y-4">
                <Kinetic text="RedRoute is the show." className="text-4xl md:text-6xl" />
                <p className="max-w-xl text-sm md:text-base text-white/85">
                  Hotels. Events. Experiences. A kinetic interface that moves like a trailer — every scroll feels like a scene cut.
                </p>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(229,9,20,0.45)]"
                    style={{ background: RR.red }}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Zap className="size-4" /> Hot Now!
                    </span>
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.2),transparent)] transition-transform duration-700 group-hover:translate-x-0" />
                  </motion.button>
                  
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] md:text-sm text-white/75">
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Trusted by 120k+</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">4.9★ rating</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Lightning checkout</div>
                </div>
              </div>

              {/* RIGHT: compact search */}
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <Field icon={<MapPin className="size-4" />} label="Destination">
                    <Input className="h-10 text-sm" placeholder="Where to?" />
                  </Field>
                  <Field icon={<Calendar className="size-4" />} label="Dates">
                    <Input className="h-10 text-sm" placeholder="Aug 24 → Aug 27" />
                  </Field>
                  <Field icon={<User className="size-4" />} label="Guests">
                    <Input className="h-10 text-sm" placeholder="2 Adults" />
                  </Field>
                  <div className="flex items-end">
                    <Button className="h-10 w-full text-sm rounded-xl">Search</Button>
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
              </div>
            </div>
          </div>
        </div>

        {/* marquee keyframes */}
        <style>{`@keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }`}</style>
      </div>
    </section>
  );
}

/* ---------- Featured ---------- */
function Featured() {
  const items = [
    { title: "Skyline Luxe Hotel", img: hotel1, rating: 4.9, price: 189, tag: "Top Pick" },
    { title: "Coastal Escape Villa", img: villa1, rating: 4.8, price: 259, tag: "New" },
    { title: "Downtown Creative Loft", img: loft1, rating: 4.7, price: 139, tag: "Value" },
  ];
  return (
    <section id="gallery" className="px-6 py-20 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold">Featured Stays</h2>
            <p className="text-white/70">Cinematic tilt, parallax, and glow.</p>
          </div>
          <Button variant="outline" className="rounded-2xl">
            View all
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="group overflow-hidden">
                <div className="relative overflow-hidden">
                  <motion.img
                    src={it.img}
                    alt=""
                    className="h-60 w-full object-cover"
                    whileHover={{ scale: 1.08 }}
                    transition={{ type: "spring", stiffness: 120, damping: 14 }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_120%,rgba(229,9,20,0.25),transparent)]"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs">
                    {it.tag}
                  </div>
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Events ---------- */
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
          {ev.map((e, i) => (
            <motion.a
              key={e.title}
              href="#"
              className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
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
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Page component ---------- */
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
      {/* Logout */}
      <button
        onClick={logout}
        className="fixed top-5 right-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/20"
        title="Log out"
      >
        <LogOut className="size-4" /> Logout
      </button>

      <Hero />
      <Featured />
      <EventStrip />

      <a
        href="#"
        className="fixed bottom-6 right-6 grid h-12 w-12 place-items-center rounded-full shadow-2xl"
        style={{ background: RR.red }}
        title="Start your demo"
      >
        <ChevronRight className="size-6 text-white" />
      </a>
    </div>
  );
}
