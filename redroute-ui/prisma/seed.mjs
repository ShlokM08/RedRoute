// prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

// Build N integer ratings (1..5) whose average is close to target (<= ~0.15 away)
function makeRatingsCloseTo(target, n = 7) {
  const t = clamp(Number(target ?? 4.6), 1, 5);
  const base = Math.round(t);
  const arr = Array.from({ length: n }, () => clamp(base, 1, 5));
  const step = 1 / n; // each +/-1 on one item moves average by 1/n

  // Move average toward target with +/-1 adjustments
  let current = arr.reduce((s, v) => s + v, 0) / n;
  let safety = 100;

  while (Math.abs(current - t) > step / 2 && safety-- > 0) {
    if (current < t) {
      // try to bump up a low slot
      const i = arr.findIndex(v => v < 5);
      if (i === -1) break;
      arr[i] += 1;
    } else {
      // try to bump down a high slot
      const j = arr.findIndex(v => v > 1);
      if (j === -1) break;
      arr[j] -= 1;
    }
    current = arr.reduce((s, v) => s + v, 0) / n;
  }
  return arr;
}

const reviewTitles = [
  "Loved it!", "Worth every penny", "Exactly as pictured", "Great vibe",
  "Would come back", "Superb service", "Memorable stay", "Smooth experience",
];

const hotelReviewBodies = [
  "Room was spotless and the views were unreal.",
  "Staff went above and beyond. Lobby café is a must.",
  "Beds were comfy, check-in was fast, location perfect.",
  "Amenities felt premium. Infinity pool was a highlight.",
  "Noise was minimal and AC was quiet—great sleep.",
  "Design and details show real care. Great value.",
  "Transit access was easy, concierge had great tips.",
  "Everything worked as expected—no surprises.",
];

const eventReviewBodies = [
  "Energy was electric—lights and sound were top-tier.",
  "Well organized, easy entry, and great crowd control.",
  "Lineup was fire, would absolutely go again.",
  "Venue staff were friendly, merch lines moved fast.",
  "Seating and visibility were great from mid-section.",
  "Good value for the ticket price.",
  "Acoustics were better than expected for an arena.",
  "Smooth experience overall with zero hiccups.",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function upsertSeedUsers(count = 10) {
  const users = [];
  for (let i = 1; i <= count; i++) {
    const email = `seed+${i}@redroute.dev`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: "seed", // simple placeholder; not for real login
        firstName: "Seed",
        lastName: `User${i}`,
      },
      select: { id: true, email: true },
    });
    users.push(u);
  }
  return users;
}

async function main() {
  // --- D E S T R U C T I V E  W I P E (children → parent, keep users) ---
  await prisma.$transaction([
    prisma.favorite.deleteMany(),
    prisma.eventBooking.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.hotelReview.deleteMany(),
    prisma.eventReview.deleteMany(),
    prisma.hotelImage.deleteMany(),
    prisma.event.deleteMany(),
    prisma.hotel.deleteMany(),
  ]);

  // Seed users used for reviews (does not touch your existing real users)
  const seedUsers = await upsertSeedUsers(12);

  // --- H O T E L S (same list you had) -------------------------------------
  const hotels = [
    {
      name: "Skyline Luxe Hotel",
      city: "Doha",
      country: "Qatar",
      price: 189,
      capacity: 2,
      rating: 4.9,
      description: "Glass-and-steel views with an infinity pool on the 30th.",
      imageUrl: "/images/featured_hotel.avif",
      imageAlt: "Skyline Luxe",
    },
    {
      name: "Coastal Escape Villa",
      city: "Bali",
      country: "Indonesia",
      price: 259,
      capacity: 2,
      rating: 4.8,
      description: "Private beach access, sunset deck and outdoor cinema.",
      imageUrl: "/images/featured_villa.jpeg",
      imageAlt: "Coastal Villa",
    },
    {
      name: "Downtown Creative Loft",
      city: "Barcelona",
      country: "Spain",
      price: 139,
      capacity: 2,
      rating: 4.7,
      description: "Industrial-chic loft with skyline terrace.",
      imageUrl: "/images/featured_loft.avif",
      imageAlt: "Loft",
    },
    {
      name: "Marina View Suites",
      city: "Dubai",
      country: "UAE",
      price: 210,
      capacity: 4,
      rating: 4.6,
      description: "Harborfront suites with sweeping marina panoramas.",
      imageUrl: "/images/Marina View Suites.jpg",
      imageAlt: "Marina View Suites",
    },
    {
      name: "Left Bank Boutique",
      city: "Paris",
      country: "France",
      price: 240,
      capacity: 2,
      rating: 4.8,
      description: "Haussmann charm steps from the Seine and cafés.",
      imageUrl: "/images/Left Bank Boutique.jpg",
      imageAlt: "Left Bank Boutique",
    },
    {
      name: "Shinjuku Sky Pods",
      city: "Tokyo",
      country: "Japan",
      price: 175,
      capacity: 2,
      rating: 4.5,
      description: "Futuristic pods with neon views in Shinjuku.",
      imageUrl: "/images/Shinjuku Sky Pods.jpg",
      imageAlt: "Shinjuku Sky Pods",
    },
    {
      name: "Bosphorus Heritage Hotel",
      city: "Istanbul",
      country: "Türkiye",
      price: 160,
      capacity: 3,
      rating: 4.6,
      description: "Ottoman-era details with modern amenities by the strait.",
      imageUrl: "/images/Bosphorus Heritage Hotel.jpeg",
      imageAlt: "Bosphorus Heritage Hotel",
    },
    {
      name: "Midtown Signature",
      city: "New York",
      country: "USA",
      price: 320,
      capacity: 5,
      rating: 4.7,
      description: "Steps from Broadway with skyline lounge.",
      imageUrl: "/images/Midtown Signature.jpeg",
      imageAlt: "Midtown Signature",
    },
    {
      name: "Trastevere Courtyard Inn",
      city: "Rome",
      country: "Italy",
      price: 180,
      capacity: 3,
      rating: 4.4,
      description: "Sun-drenched courtyard in the heart of Trastevere.",
      imageUrl: "/images/Trastevere Courtyard Inn.jpeg",
      imageAlt: "Trastevere Courtyard Inn",
    },
    {
      name: "Riverside Opera House Stay",
      city: "London",
      country: "United Kingdom",
      price: 290,
      capacity: 4,
      rating: 4.7,
      description: "River views near theatres and markets.",
      imageUrl: "/images/Riverside Opera House Stay.webp",
      imageAlt: "Riverside Opera House Stay",
    },
    {
      name: "Alpine Panorama Lodge",
      city: "Zurich",
      country: "Switzerland",
      price: 230,
      capacity: 6,
      rating: 4.6,
      description: "Lakeside alpine lodge with spa and mountain views.",
      imageUrl: "/images/Alpine Panorama Lodge.jpg",
      imageAlt: "Alpine Panorama Lodge",
    },
  ];

  const createdHotels = [];
  for (const h of hotels) {
    const hotel = await prisma.hotel.create({
      data: {
        name: h.name,
        city: h.city,
        country: h.country,
        price: h.price,
        capacity: h.capacity,
        rating: h.rating, // temp; we’ll overwrite with reviews average
        description: h.description,
        images: { create: [{ url: h.imageUrl, alt: h.imageAlt }] },
      },
    });
    createdHotels.push(hotel);
  }

  // --- E V E N T S (your longer descriptions) -------------------------------
  const now = new Date();
  const daysFromNowUtcAt = (d, hour = 20, minute = 0) =>
    new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + d,
      hour, minute, 0, 0
    ));

  const events = [
    {
      name: "Rooftop Cinema",
      description:
`Settle into a plush lounger as the city shimmers below and the projector hums to life.
This open-air rooftop screening pairs cult favorites with a skyline that steals the show.
Expect cozy blankets, bottomless popcorn, and curated mocktails from the terrace bar.
Arrive early for sunset vinyl sets and photo spots; stay late for post-credits trivia and surprise giveaways.`,
      location: "Doha • West Bay Rooftop",
      startsAt: daysFromNowUtcAt(5, 20, 0),
      price: 25,
      capacity: 120,
      imageUrl: "/images/event_rooftop.png",
      imageAlt: "Rooftop cinema with city skyline at night",
    },
    {
      name: "Old Town Theatre",
      description:
`Step through vintage doors into a velvet-draped hall where the lights warm, the orchestra tunes,
and the first cue floats into the balcony. This classic matinee celebrates timeless scores with a live ensemble,
intermission treats from local bakers, and a lobby exhibit of original playbills.
Perfect for a slow afternoon steeped in nostalgia and rich acoustics.`,
      location: "Old Town Theatre",
      startsAt: daysFromNowUtcAt(3, 14, 0),
      price: 35,
      capacity: 300,
      imageUrl: "/images/event_theatre.jpg",
      imageAlt: "Historic theatre with purple lights and audience",
    },
    {
      name: "Arena Night: The Tour",
      description:
`A full-scale arena production with towering LED walls, sweeping lasers, and a sound system you feel in your chest.
Expect surprise cameos, fan-favorite anthems, and a finale designed for goosebumps.
Merch booths open two hours prior, food courts stay running throughout, and premium floor sections include fast-lane entry.`,
      location: "Doha Arena",
      startsAt: daysFromNowUtcAt(10, 19, 30),
      price: 79,
      capacity: 12000,
      imageUrl: "/images/event_arena.jpeg",
      imageAlt: "Arena with a massive crowd and stage lights",
    },
    {
      name: "Jazz Under The Stars",
      description:
`A candle-lit quartet drifts across the waterfront as the sky deepens to indigo.
The set moves from smoky standards to playful improvisations, with gentle percussion and upright bass anchoring the night.
Reserve a table for sommelier-paired tastings, or bring a blanket and sink into the grass.
Quiet, refined, and endlessly atmospheric.`,
      location: "Riverside Promenade",
      startsAt: daysFromNowUtcAt(7, 20, 30),
      price: 49,
      capacity: 200,
      imageUrl: "/images/jazz_concert.jpg",
      imageAlt: "Open air jazz event by the river",
    },
    {
      name: "City Lights Festival",
      description:
`An immersive trail of projection art, luminous sculptures, and interactive installations lighting up downtown blocks.
Follow the map or wander freely—pop-up performances, food trucks, and family zones keep the energy moving.
Bring a camera; the golden hour here is electric, and the after-dark palette is pure magic.`,
      location: "Downtown District",
      startsAt: daysFromNowUtcAt(14, 18, 0),
      price: 15,
      capacity: 5000,
      imageUrl: "/images/citylights_fest.jpeg",
      imageAlt: "Festival of lights across buildings",
    },
    {
      name: "Tech Expo Live",
      description:
`Hands-on with next-gen hardware, live founder demos, and rapid-fire pitch-offs on the main stage.
Explore startup alleys, join micro-workshops, and test unreleased prototypes.
Pro tip: book a morning slot for shorter lines, then return for the afternoon keynotes and community lounge meetups.`,
      location: "Exhibition Center Hall B",
      startsAt: daysFromNowUtcAt(12, 10, 0),
      price: 99,
      capacity: 8000,
      imageUrl: "/images/tech_expo.jpeg",
      imageAlt: "Tech expo hall with LED walls",
    },
    {
      name: "Summer Beats Block Party",
      description:
`Street food smoke curling through neon, vinyl pop-ups spinning edits, and back-to-back DJ sets rolling into the night.
Grab a wristband and drift between stages; cool-down zones, water mists, and lockers keep it easy.
Sneakers recommended—the dance circle tends to grow after sunset.`,
      location: "Harborfront Plaza",
      startsAt: daysFromNowUtcAt(9, 21, 0),
      price: 39,
      capacity: 3000,
      imageUrl: "/images/summer_party.jpeg",
      imageAlt: "Outdoor block party crowd",
    },
  ];

  const createdEvents = [];
  for (const e of events) {
    const ev = await prisma.event.create({ data: e });
    createdEvents.push(ev);
  }

  // --- R E V I E W S : 7 per hotel + update hotel.rating to average ----------
  for (const hotel of createdHotels) {
    const ratings = makeRatingsCloseTo(hotel.rating ?? 4.6, 7);
    const reviewsData = ratings.map((r, i) => {
      const u = seedUsers[(i + hotel.id) % seedUsers.length]; // spread users
      return {
        hotelId: hotel.id,
        userId: u.id,
        rating: r,
        title: pick(reviewTitles),
        body: pick(hotelReviewBodies),
        createdAt: new Date(Date.now() - (i + 1) * 86400000), // last few days
      };
    });

    await prisma.hotelReview.createMany({ data: reviewsData });

    const agg = await prisma.hotelReview.aggregate({
      where: { hotelId: hotel.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const avgRounded = Math.round((agg._avg.rating || 0) * 10) / 10;
    await prisma.hotel.update({
      where: { id: hotel.id },
      data: { rating: avgRounded || hotel.rating || 4.6 },
    });
  }

  // --- E V E N T  R E V I E W S : 7 per event -------------------------------
  for (const ev of createdEvents) {
    // For events (no rating column), just use a nice 4–5 skew
    const ratings = makeRatingsCloseTo(4.7, 7);
    const reviewsData = ratings.map((r, i) => {
      const u = seedUsers[(i + ev.id) % seedUsers.length];
      return {
        eventId: ev.id,
        userId: u.id,
        rating: r,
        title: pick(reviewTitles),
        body: pick(eventReviewBodies),
        createdAt: new Date(Date.now() - (i + 1) * 43200000), // last few half-days
      };
    });

    await prisma.eventReview.createMany({ data: reviewsData });
  }

  console.log("✅ Seed complete: hotels, events, and 7 reviews each. Hotel ratings synced to review averages.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
