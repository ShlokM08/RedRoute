// src/HotelDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronLeft, Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";

type HotelImage = { url: string; alt?: string | null };
type Hotel = {
  id: string;              // <-- string id
  name: string;
  city: string;
  price: number;
  rating: number | null;
  images: HotelImage[];
};

export default function HotelDetail() {
  const { id } = useParams();           // id as string (slug)
  const navigate = useNavigate();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      if (!id) {
        setErr("Invalid hotel id in URL.");
        setLoading(false);
        return;
      }

      const url = `/api/hotels/${encodeURIComponent(id)}`;

      try {
        const r = await fetch(url, { credentials: "include" });

        // If the function crashed earlier, Vercel sometimes sets text/plain.
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await r.text().catch(() => "");
          throw new Error(
            `Expected JSON but got ${ct || "unknown"}. First bytes: ${text.slice(0, 60) || "n/a"}`
          );
        }

        if (!r.ok) {
          const j = await r.json().catch(() => null);
          throw new Error(j?.error || `Failed to load (HTTP ${r.status})`);
        }

        const data: Hotel = await r.json();
        setHotel(data);
      } catch (e: any) {
        setErr(e?.message || "Could not fetch hotel details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const mainImg = hotel?.images?.[0]?.url || "/images/featured_hotel.avif";

  return (
    <div className="min-h-screen bg-black text-white">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/20"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {loading && (
        <div className="p-6 max-w-5xl mx-auto">
          <div className="h-[50vh] w-full rounded-3xl bg-white/5 border border-white/10 animate-pulse" />
          <div className="mt-8 h-8 w-1/3 bg-white/5 rounded animate-pulse" />
          <div className="mt-4 h-4 w-2/3 bg-white/5 rounded animate-pulse" />
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {!loading && err && (
        <div className="max-w-3xl mx-auto p-6">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-white/80 mb-4">{err}</p>
            <button
              onClick={() => navigate("/home")}
              className="rounded-xl bg-[#E50914] px-5 py-2 font-semibold shadow-[0_10px_30px_rgba(229,9,20,0.45)] hover:brightness-110"
            >
              Go back home
            </button>
          </div>
        </div>
      )}

      {!loading && hotel && !err && (
        <>
          <div className="relative h-[50vh] w-full overflow-hidden">
            <motion.img
              src={mainImg}
              alt={hotel.name}
              className="h-full w-full object-cover"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <h1 className="text-4xl font-bold">{hotel.name}</h1>
              <div className="mt-2 flex items-center gap-4 text-white/85">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {hotel.city}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4" /> {hotel.rating ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-5xl p-6 space-y-10">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div>
                <div className="text-3xl font-bold">${hotel.price}</div>
                <div className="text-sm text-white/60">per night</div>
              </div>
              <button className="rounded-xl bg-[#E50914] px-6 py-3 font-semibold shadow-[0_10px_30px_rgba(229,9,20,0.45)] hover:brightness-110">
                Reserve Now
              </button>
            </div>

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
                      whileHover={{ scale: 1.04 }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/images/fallback.jpg";
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold mb-2">Overview</h2>
              <p className="text-white/80">
                A modern stay in {hotel.city}. Rated {hotel.rating ?? "—"}★ and starting at ${hotel.price}/night.
                Perfect for a cinematic escape with RedRoute’s lightning checkout.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
