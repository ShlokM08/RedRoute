// prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // --- D E S T R U C T I V E  W I P E  (order matters: children → parent) ---
  await prisma.$transaction([
    prisma.favorite.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.hotelImage.deleteMany(),
    prisma.hotel.deleteMany(),
  ]);

  // --- R E S E E D  W I T H  O N L Y  T H E S E ---
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
    const created = await prisma.hotel.create({
      data: {
        name: h.name,
        city: h.city,
        country: h.country,
        price: h.price,
        capacity: h.capacity,
        rating: h.rating,
        description: h.description,
        images: {
          create: [{ url: h.imageUrl, alt: h.imageAlt }],
        },
      },
    });
    // Optional: log what was created
    // console.log("Created hotel:", created.name);
  }

  console.log("Seed complete (wipe + fresh insert).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
