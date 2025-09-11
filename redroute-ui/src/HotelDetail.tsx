import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronLeft, Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";

type HotelImage = { url: string; alt?: string | null };
type Hotel = {
  id: number;
  name: string;
  city: string;
  price: number;
  rating: number | null;
  images: HotelImage[];
};

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await fetch(`/api/hotels/${id}`);
      if (r.ok) {
        setHotel(await r.json());
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-white p-6">Loading…</div>;
  if (!hotel) return <div className="text-white p-6">Hotel not found.</div>;

  const mainImg = hotel.images?.[0]?.url || "/images/featured_hotel.avif";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/20"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero image */}
      <div className="relative h-[50vh] w-full overflow-hidden">
        <motion.img
          src={mainImg}
          alt={hotel.name}
          className="h-full w-full object-cover"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-6 left-6">
          <h1 className="text-4xl font-bold">{hotel.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-white/80">
            <MapPin className="h-4 w-4" /> {hotel.city}
            <Star className="h-4 w-4" /> {hotel.rating ?? "—"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl p-6 space-y-10">
        {/* Price and reserve */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <div className="text-3xl font-bold">${hotel.price}</div>
            <div className="text-sm text-white/60">per night</div>
          </div>
          <button className="rounded-xl bg-[#E50914] px-6 py-3 font-semibold shadow-[0_10px_30px_rgba(229,9,20,0.45)] hover:brightness-110">
            Reserve Now
          </button>
        </div>

        {/* Gallery */}
        {hotel.images?.length > 1 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {hotel.images.slice(1).map((img, i) => (
                <motion.img
                  key={i}
                  src={img.url}
                  alt={img.alt ?? hotel.name}
                  className="rounded-xl object-cover w-full h-48"
                  whileHover={{ scale: 1.05 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <h2 className="text-2xl font-semibold mb-2">Overview</h2>
          <p className="text-white/80">
            Enjoy a luxurious stay at {hotel.name} in {hotel.city}. Rated {hotel.rating}★
            and starting at ${hotel.price}/night. Perfect for a cinematic escape with
            world-class amenities, stunning views, and RedRoute’s lightning checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
