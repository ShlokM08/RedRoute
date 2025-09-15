// prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // --- D E S T R U C T I V E  W I P E  (order matters: children → parent) ---
  await prisma.$transaction([
    prisma.favorite.deleteMany(),
    prisma.eventBooking.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.hotelImage.deleteMany(),
    prisma.event.deleteMany(),
    prisma.hotel.deleteMany(),
  ]);

  // --- R E S E E D  H O T E L S  (unchanged) --------------------------------
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

  for (const h of hotels) {
    await prisma.hotel.create({
      data: {
        name: h.name,
        city: h.city,
        country: h.country,
        price: h.price,
        capacity: h.capacity,
        rating: h.rating,
        description: h.description,
        images: { create: [{ url: h.imageUrl, alt: h.imageAlt }] },
      },
    });
  }

  // --- R E S E E D  E V E N T S  (longer descriptions) ----------------------
  const now = new Date();
  const daysFromNowUtcAt = (d, hour = 20, minute = 0) =>
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + d,
        hour,
        minute,
        0,
        0
      )
    );

  const events = [
    {
      name: "Rooftop Cinema",
      description: `Settle into a plush lounger as the city shimmers below and the projector hums to life. 
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
      description: `Step through vintage doors into a velvet-draped hall where the lights warm, the orchestra tunes, 
and the first cue floats into the balcony. This classic matinee celebrates timeless scores with a live ensemble, 
intermission treats from local bakers, and a lobby exhibit of original playbills. 
Perfect for a slow afternoon steeped in nostalgia and rich acoustics.`,
      location: "Old Town Theatre",
      startsAt: daysFromNowUtcAt(3, 14, 0),
      price: 35,
      capacity: 300,
      imageUrl: "/images/event_theatre.png",
      imageAlt: "Historic theatre with purple lights and audience",
    },
    {
      name: "Arena Night: The Tour",
      description: `A full-scale arena production with towering LED walls, sweeping lasers, and a sound system you feel in your chest. 
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
      description: `A candle-lit quartet drifts across the waterfront as the sky deepens to indigo. 
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
      description: `An immersive trail of projection art, luminous sculptures, and interactive installations lighting up downtown blocks. 
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
      description: `Hands-on with next-gen hardware, live founder demos, and rapid-fire pitch-offs on the main stage. 
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
      description: `Street food smoke curling through neon, vinyl pop-ups spinning edits, and back-to-back DJ sets rolling into the night. 
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

  for (const e of events) {
    await prisma.event.create({ data: e });
  }

  console.log("Seed complete (wipe + fresh insert for Hotels & Events with longer event descriptions).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
