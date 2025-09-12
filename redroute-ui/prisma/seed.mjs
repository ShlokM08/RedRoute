// prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // wipe + seed (safe for local/dev; remove deletes if you want)
  await prisma.favorite.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.hotelImage.deleteMany();
  await prisma.hotel.deleteMany();

  await prisma.hotel.create({
    data: {
      name: "Skyline Luxe Hotel",
      city: "Doha",
      price: 189,
      rating: 4.9,
      description: "Glass-and-steel views with an infinity pool on the 30th.",
      images: {
        create: [
          { url: "/images/featured_hotel.avif", alt: "Skyline Luxe" }
        ]
      }
    }//change
  });

  await prisma.hotel.create({
    data: {
      name: "Coastal Escape Villa",
      city: "Bali",
      price: 259,
      rating: 4.8,
      description: "Private beach access, sunset deck and outdoor cinema.",
      images: { create: [{ url: "/images/featured_villa.jpeg", alt: "Coastal Villa" }] }
    }
  });

  await prisma.hotel.create({
    data: {
      name: "Downtown Creative Loft",
      city: "Barcelona",
      price: 139,
      rating: 4.7,
      description: "Industrial-chic loft with skyline terrace.",
      images: { create: [{ url: "/images/featured_loft.avif", alt: "Loft" }] }
    }
  });
}

main()
  .then(() => console.log("Seed complete"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
