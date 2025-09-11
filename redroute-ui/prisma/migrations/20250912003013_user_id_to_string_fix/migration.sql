-- SAFETY: drop old FKs first (names must match your DB)
ALTER TABLE "public"."Booking"  DROP CONSTRAINT IF EXISTS "Booking_hotelId_fkey";
ALTER TABLE "public"."Booking"  DROP CONSTRAINT IF EXISTS "Booking_userId_fkey";
ALTER TABLE "public"."Favorite" DROP CONSTRAINT IF EXISTS "Favorite_hotelId_fkey";
ALTER TABLE "public"."Favorite" DROP CONSTRAINT IF EXISTS "Favorite_userId_fkey";
ALTER TABLE "public"."HotelImage" DROP CONSTRAINT IF EXISTS "HotelImage_hotelId_fkey";

-- If this index exists, drop it (we'll re-create as needed)
DROP INDEX IF EXISTS "public"."HotelImage_hotelId_idx";

-- ---------- Your table edits (kept) ----------
ALTER TABLE "public"."Booking"
  DROP COLUMN IF EXISTS "endDate",
  DROP COLUMN IF EXISTS "guests",
  DROP COLUMN IF EXISTS "startDate",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "updatedAt",
  ADD COLUMN     "checkIn"  TIMESTAMP(3) NOT NULL,
  ADD COLUMN     "checkOut" TIMESTAMP(3) NOT NULL,
  ALTER COLUMN   "userId" SET NOT NULL;

ALTER TABLE "public"."Hotel"
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "updatedAt",
  ALTER COLUMN "rating" DROP NOT NULL;

-- ---------- THE IMPORTANT PART ----------
-- Convert userId columns from INT -> TEXT to match User.id (cuid)
ALTER TABLE "public"."Booking"
  ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;

ALTER TABLE "public"."Favorite"
  ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;

-- Optional helper index (safe if already absent)
CREATE INDEX IF NOT EXISTS "Favorite_hotelId_idx"
  ON "public"."Favorite" ("hotelId");

-- ---------- Re-add FKs ----------
ALTER TABLE "public"."HotelImage"
  ADD CONSTRAINT "HotelImage_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Booking"
  ADD CONSTRAINT "Booking_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Booking"
  ADD CONSTRAINT "Booking_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Favorite"
  ADD CONSTRAINT "Favorite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Favorite"
  ADD CONSTRAINT "Favorite_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
