// prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // wipe + seed (safe for local/dev)
  await prisma.favorite.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.hotelImage.deleteMany();
  await prisma.hotel.deleteMany();

  const mk = (data) =>
    prisma.hotel.create({
      data: {
        images: { create: data.images ?? [] },
        ...data,
      },
    });

  await mk({
    name: "Skyline Luxe Hotel",
    city: "Doha",
    country: "Qatar",
    capacity: 4,
    price: 189,
    rating: 4.9,
    description: "Glass-and-steel views with an infinity pool on the 30th.",
    images: [{ url: "/images/featured_hotel.avif", alt: "Skyline Luxe" }],
  });

  await mk({
    name: "Coastal Escape Villa",
    city: "Bali",
    country: "Indonesia",
    capacity: 6,
    price: 259,
    rating: 4.8,
    description: "Private beach access, sunset deck and outdoor cinema.",
    images: [{ url: "/images/featured_villa.jpeg", alt: "Coastal Villa" }],
  });

  await mk({
    name: "Downtown Creative Loft",
    city: "Barcelona",
    country: "Spain",
    capacity: 3,
    price: 139,
    rating: 4.7,
    description: "Industrial-chic loft with skyline terrace.",
    images: [{ url: "/images/featured_loft.avif", alt: "Loft" }],
  });

  // NEW seed entries (5+)
  await mk({
    name: "Seine Riverside Suites",
    city: "Paris",
    country: "France",
    capacity: 4,
    price: 210,
    rating: 4.8,
    description: "Romantic suites steps from the Louvre and the Seine.",
    images: [{ url: "/images/paris_hotel.jpg", alt: "Paris hotel" }],
  });

  await mk({
    name: "West End Boutique",
    city: "London",
    country: "United Kingdom",
    capacity: 2,
    price: 195,
    rating: 4.6,
    description: "Cozy rooms near theatre row with artisan breakfasts.",
    images: [{ url: "/images/london_hotel.jpg", alt: "London hotel" }],
  });

  await mk({
    name: "Shinjuku Sky Pods",
    city: "Tokyo",
    country: "Japan",
    capacity: 2,
    price: 165,
    rating: 4.7,
    description: "Compact futurist pods looking over neon canyons.",
    images: [{ url: "/images/tokyo_hotel.jpg", alt: "Tokyo hotel" }],
  });

  await mk({
    name: "Midtown Icon",
    city: "New York",
    country: "USA",
    capacity: 4,
    price: 240,
    rating: 4.6,
    description: "Big-apple energy with skyline bar and jazz nights.",
    images: [{ url: "/images/nyc_hotel.jpg", alt: "NYC hotel" }],
  });

  await mk({
    name: "Golden Horn Heritage",
    city: "Istanbul",
    country: "Türkiye",
    capacity: 5,
    price: 175,
    rating: 4.7,
    description: "Ottoman textures, modern comfort, Bosphorus glimpses.",
    images: [{ url: "/images/istanbul_hotel.jpg", alt: "Istanbul hotel" }],
  });
}

main()
  .then(() => console.log("Seed complete"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
