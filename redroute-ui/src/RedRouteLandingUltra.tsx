import { motion } from "framer-motion";

import React, { Suspense, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Calendar, MapPin, User, Star, Sparkles, Zap, Play, ChevronRight, LogOut } from "lucide-react";

const RR = { red: "#E50914", black: "#000000", grey: "#888888", white: "#FFFFFF" } as const;

// Lazy-load the 3D scene (Vite-friendly)
const CityConcert3D = React.lazy(() => import("./_rr-CityConcert3D"));
function AnimatedMeshBG() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* base gradient */}
      <div className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 20% -10%, rgba(229,9,20,0.22), transparent 55%)," +
            "radial-gradient(900px 600px at 80% 10%, rgba(255,107,107,0.14), transparent 60%)," +
            "linear-gradient(180deg, #000 0%, #0a0a0a 40%, #0f0f0f 100%)"
        }}
      />
      {/* drifting glow blobs */}
      <motion.div
        className="absolute -top-24 left-1/3 h-[36rem] w-[36rem] rounded-full blur-3xl"
        style={{ background: "rgba(229,9,20,0.22)" }}
        animate={{ y: [0, -20, 10, 0], scale: [1, 1.05, 1.02, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 right-1/4 h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{ background: "rgba(255,107,107,0.16)" }}
        animate={{ y: [0, 16, -8, 0], scale: [1, 1.04, 1.01, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      {/* soft grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "44px 44px"
        }}
      />
    </div>
  );
}

function SkylineParallax() {
  return (
    <motion.svg
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      className="absolute bottom-0 left-1/2 -z-10 h-[180px] w-[120%] -translate-x-1/2"
      initial={{ y: 20, opacity: 0.9 }}
      animate={{ y: [20, 10, 20] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* back layer */}
      <path
        d="M0 160 L60 160 L60 120 L110 120 L110 80 L170 80 L170 140 L230 140 L230 100 L310 100 L310 150 L380 150 L380 90 L450 90 L450 140 L520 140 L520 110 L620 110 L620 150 L720 150 L720 100 L820 100 L820 140 L900 140 L900 80 L980 80 L980 150 L1060 150 L1060 110 L1160 110 L1160 160 L1260 160 L1260 120 L1360 120 L1360 160 L1440 160 L1440 200 L0 200 Z"
        fill="#0b0b0b"
      />
      {/* accent layer */}
      <path
        d="M0 170 L80 170 L80 130 L150 130 L150 150 L220 150 L220 120 L300 120 L300 170 L380 170 L380 130 L460 130 L460 160 L540 160 L540 120 L640 120 L640 170 L740 170 L740 130 L840 130 L840 160 L920 160 L920 120 L1000 120 L1000 170 L1100 170 L1100 130 L1200 130 L1200 170 L1440 170 L1440 200 L0 200 Z"
        style={{ fill: "rgba(229,9,20,0.18)" }}
      />
    </motion.svg>
  );
}

function SoftBokeh() {
  const dots = [
    { top: "12%", left: "8%", size: 10, delay: 0 },
    { top: "18%", left: "86%", size: 14, delay: 0.2 },
    { top: "42%", left: "16%", size: 8, delay: 0.5 },
    { top: "58%", left: "78%", size: 12, delay: 0.1 },
    { top: "30%", left: "48%", size: 9, delay: 0.3 },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute rounded-full blur-md"
          style={{
            top: d.top,
            left: d.left,
            width: d.size,
            height: d.size,
            background: "rgba(255,255,255,0.18)"
          }}
          animate={{ y: [0, -6, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: d.delay }}
        />
      ))}
    </>
  );
}
/** KINETIC HEADLINE — per-word (prevents mid-word wrapping like “sh/ow”) */
function Kinetic({ text }: { text: string }) {
  const words = text.split(" ");
  let globalIndex = 0;
  return (
    <h1 className="mx-auto max-w-5xl text-center text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
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

function ShimmerCTA({ children }: { children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-6 py-3 font-semibold text-white shadow-[0_10px_40px_rgba(229,9,20,0.45)]"
      style={{ background: RR.red }}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.2),transparent)] transition-transform duration-700 group-hover:translate-x-0"/>
    </motion.button>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 rounded-2xl p-2 text-white/90">
      <div className="flex items-center gap-2 text-sm opacity-80">
        <span className="grid place-content-center rounded-md border border-white/15 bg-white/10 p-1">{icon}</span>
        <span>{label}</span>
      </div>
      {children}
    </label>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-36 text-white md:pt-32">
      <AnimatedMeshBG />
      <SkylineParallax />
      <SoftBokeh />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 md:grid-cols-2">
        <div className="space-y-6">
          {/* your existing Kinetic + content stays unchanged */}
          <Kinetic text="RedRoute is the show." />
          <p className="max-w-xl text-lg text-white/80 md:text-xl">
            Hotels. Events. Experiences. A kinetic interface that moves like a trailer — every scroll feels like a scene cut.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ShimmerCTA>
              <Zap className="size-4" /> Start Instant Demo
            </ShimmerCTA>
            <Button variant="outline" className="rounded-2xl">
              <Play className="mr-2 size-4" /> Watch 30s Reel
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/70">
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Trusted by 120k+</div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">4.9★ rating</div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Lightning checkout</div>
          </div>
        </div>

        {/* search card stays the same */}
        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field icon={<MapPin className="size-4" />} label="Destination">
              <Input placeholder="Where to?" />
            </Field>
            <Field icon={<Calendar className="size-4" />} label="Dates">
              <Input placeholder="Aug 24 → Aug 27" />
            </Field>
            <Field icon={<User className="size-4" />} label="Guests">
              <Input placeholder="2 Adults" />
            </Field>
            <div className="flex items-end">
              <Button className="h-12 w-full">Search</Button>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <div className="flex animate-[marquee_18s_linear_infinite] whitespace-nowrap text-xs [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i} className="px-4 py-2 text-white/80">
                  🔥 Doha Jazz Fest • 🏨 Skyline Luxe Deal • 🎟️ Rooftop Cinema • 🎤 Live Arena Tour • 🎭 Theatre Night
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* marquee keyframes if you don’t already have them */}
      <style>{`@keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }`}</style>
    </section>
  );
}

function Featured() {
  const items = [
    { title: "Skyline Luxe Hotel", img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1600&auto=format&fit=crop", rating: 4.9, price: 189, tag: "Top Pick" },
    { title: "Coastal Escape Villa", img: "https://images.unsplash.com/photo-1501117716987-c8e3f97b0b25?q=80&w=1600&auto=format&fit=crop", rating: 4.8, price: 259, tag: "New" },
    { title: "Downtown Creative Loft", img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop", rating: 4.7, price: 139, tag: "Value" },
  ];
  return (
    <section id="gallery" className="px-6 py-20 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold">Featured Stays</h2>
            <p className="text-white/70">Cinematic tilt, parallax, and glow.</p>
          </div>
          <Button variant="outline" className="rounded-2xl">View all</Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <motion.div key={it.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <Card className="group overflow-hidden">
                <div className="relative overflow-hidden">
                  <motion.img src={it.img} alt="" className="h-60 w-full object-cover" whileHover={{ scale: 1.08 }} transition={{ type: "spring", stiffness: 120, damping: 14 }} />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} className="absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_120%,rgba(229,9,20,0.25),transparent)]" />
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
                    <motion.span whileHover={{ x: 4 }} className="text-sm text-white/70">Details →</motion.span>
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

function EventStrip() {
  const ev = [
    { title: "Arena Night: The Tour", sub: "Doha • Aug 28", img: "https://images.unsplash.com/photo-1514517220038-52933a1c80f4?q=80&w=1600&auto=format&fit=crop" },
    { title: "Old Town Theatre", sub: "Matinee • Daily", img: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1600&auto=format&fit=crop" },
    { title: "Rooftop Cinema", sub: "Fridays 8pm", img: "https://images.unsplash.com/photo-1505685296765-3a2736de412f?q=80&w=1600&auto=format&fit=crop" },
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
            <motion.a key={e.title} href="#" className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/5" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <motion.img src={e.img} alt="" className="h-60 w-full object-cover" whileHover={{ scale: 1.1, filter: "blur(1px)" }} transition={{ duration: 0.6 }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/0"/>
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

export default function RedRouteLandingUltra() {
  const navigate = useNavigate();

  // super-light guard: if no “session”, send back to sign-in
  useEffect(() => {
    if (!localStorage.getItem("rr_demo_user")) {
      navigate("/");
    }
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("rr_demo_user");
    navigate("/"); // back to sign-in
  };

  return (
    <div className="min-h-screen w-full bg-black font-sans">
      {/* Logout button (top-right, global to the page) */}
      <button
        onClick={logout}
        className="fixed top-5 right-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/20"
        title="Log out"
      >
        <LogOut className="size-4" /> Logout
      </button>

      <Hero />

      <section className="px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Live City Prototype</h2>
              <p className="text-white/70">Abstract skyline + animated stage lights. Event-ready energy.</p>
            </div>
          </div>
          <Suspense fallback={<div className="grid h-[480px] place-items-center rounded-3xl border border-white/10 bg-black/40 text-white/70"><Sparkles className="mr-2"/> Loading 3D…</div>}>
            <CityConcert3D />
          </Suspense>
        </div>
      </section>

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
