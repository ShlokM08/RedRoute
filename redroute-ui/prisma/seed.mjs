// prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Idempotent upsert:
 * - Upsert hotel by a stable unique key (here: name). If you later add a `slug` column, use that instead.
 * - Replace all images for that hotel so updating the URL in seed is deterministic.
 */
async function upsertHotel({
  name, city, country, price, capacity, rating, description,
  imageUrl, imageAlt,
}) {
  const hotel = await prisma.hotel.upsert({
    where: { name }, // assumes "name" is unique enough for your dataset
    update: { city, country, price, capacity, rating, description },
    create: { name, city, country, price, capacity, rating, description },
  });

  // Replace images in a predictable way
  await prisma.hotelImage.deleteMany({ where: { hotelId: hotel.id } });
  await prisma.hotelImage.create({
    data: { url: imageUrl, alt: imageAlt ?? name, hotelId: hotel.id },
  });

  return hotel;
}

async function main() {
  // Wipe (dev-safe). Remove these deletes if you want to preserve data.

  const sameImage = {
    create: [{ url: "/images/featured_hotel.avif", alt: "Skyline Luxe" }],
  };
  // 1) Skyline Luxe — capacity 2
  await prisma.hotel.create({
    data: {
      name: "Skyline Luxe Hotel",
      city: "Doha",
      country: "Qatar",
      price: 189,
      capacity: 2,
      rating: 4.9,
      description: "Glass-and-steel views with an infinity pool on the 30th.",
      images: {
        create: [{ url: "/images/featured_hotel.avif", alt: "Skyline Luxe" }],
      },
    },
  });

  // 2) Coastal Escape — capacity 2
  await prisma.hotel.create({
    data: {
      name: "Coastal Escape Villa",
      city: "Bali",
      country: "Indonesia",
      price: 259,
      capacity: 2,
      rating: 4.8,
      description: "Private beach access, sunset deck and outdoor cinema.",
      images: {
        create: [{ url: "/images/featured_villa.jpeg", alt: "Coastal Villa" }],
      },
    },
  });

  // 3) Downtown Loft — capacity 2
  await prisma.hotel.create({
    data: {
      name: "Downtown Creative Loft",
      city: "Barcelona",
      country: "Spain",
      price: 139,
      capacity: 2,
      rating: 4.7,
      description: "Industrial-chic loft with skyline terrace.",
      images: {
        create: [{ url: "/images/featured_loft.avif", alt: "Loft" }],
      },
    },
  });

  // 4) Marina View — capacity 4
  await prisma.hotel.create({
    data: {
      name: "Marina View Suites",
      city: "Dubai",
      country: "UAE",
      price: 210,
      capacity: 4,
      rating: 4.6,
      description: "Harborfront suites with sweeping marina panoramas.",
      images: {
        create: [{ url: "/images/featured_hotel.avif", alt: "Skyline Luxe" }],
      },
    },
  });

  // 5) Left Bank Boutique — capacity 2
  await prisma.hotel.create({
    data: {
      name: "Left Bank Boutique",
      city: "Paris",
      country: "France",
      price: 240,
      capacity: 2,
      rating: 4.8,
      description: "Haussmann charm steps from the Seine and cafés.",
images: {
        create: [{ url: "/images/Left Bank Boutique.jpg", alt: "Left Bank Boutique" }],
      },    },
  });

  // 6) Shinjuku Sky Pods — capacity 2
  await prisma.hotel.create({
    data: {
      name: "Shinjuku Sky Pods",
      city: "Tokyo",
      country: "Japan",
      price: 175,
      capacity: 2,
      rating: 4.5,
      description: "Futuristic pods with neon views in Shinjuku.",
images: {
        create: [{ url: "/images/Shinjuku Sky Pods.jpg", alt: "Shinjuku Sky Pods" }],
      },    },
  });

  // 7) Bosphorus Heritage — capacity 3
  await prisma.hotel.create({
    data: {
      name: "Bosphorus Heritage Hotel",
      city: "Istanbul",
      country: "Türkiye",
      price: 160,
      capacity: 3,
      rating: 4.6,
      description: "Ottoman-era details with modern amenities by the strait.",
images: {
        create: [{ url: "/images/Bosphorus Heritage Hotel.jpeg", alt: "Bosphorus Heritage Hotel" }],
      },    },
  });

  // 8) Midtown Signature — capacity 5
  await prisma.hotel.create({
    data: {
      name: "Midtown Signature",
      city: "New York",
      country: "USA",
      price: 320,
      capacity: 5,
      rating: 4.7,
      description: "Steps from Broadway with skyline lounge.",
images: {
        create: [{ url: "/images/Midtown Signature.jpeg", alt: "Midtown Signature" }],
      },    },
  });

  // 9) Trastevere Courtyard Inn — capacity 3
  await prisma.hotel.create({
    data: {
      name: "Trastevere Courtyard Inn",
      city: "Rome",
      country: "Italy",
      price: 180,
      capacity: 3,
      rating: 4.4,
      description: "Sun-drenched courtyard in the heart of Trastevere.",
images: {
        create: [{ url: "/images/Trastevere Courtyard Inn.jpeg", alt: "Trastevere Courtyard Inn" }],
      },    },
  });

  // 10) Riverside Opera House Stay — capacity 4
  await prisma.hotel.create({
    data: {
      name: "Riverside Opera House Stay",
      city: "London",
      country: "United Kingdom",
      price: 290,
      capacity: 4,
      rating: 4.7,
      description: "River views near theatres and markets.",
images: {
        create: [{ url: "/images/Riverside Opera House Stay.webp", alt: "Riverside Opera House Stay" }],
      },    },
  });

  // 11) Alpine Panorama Lodge — capacity 6
  await prisma.hotel.create({
    data: {
      name: "Alpine Panorama Lodge",
      city: "Zurich",
      country: "Switzerland",
      price: 230,
      capacity: 6,
      rating: 4.6,
      description: "Lakeside alpine lodge with spa and mountain views.",
images: {
        create: [{ url: "/images/Alpine Panorama Lodge.jpg", alt: "Alpine Panorama Lodge" }],
      },    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
