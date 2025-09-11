import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

interface HotelDetail {
  id: number;
  name: string;
  city: string;
  price: number;
  rating: number;
  images: { url: string; alt?: string }[];
  // Include other headings/fields from your seed.mjs as needed
}

export default function HotelDetail() {
  const { id } = useParams();
  const [hotel, setHotel] = useState<HotelDetail | null>(null);

  useEffect(() => {
    fetch(`/api/hotels/${id}`)
      .then((res) => res.json())
      .then(setHotel)
      .catch(console.error);
  }, [id]);

  if (!hotel) return <p className="p-6">Loading…</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold mb-2">{hotel.name}</h1>
      <div className="flex items-center mb-4">
        <span className="text-yellow-500 font-semibold mr-3">{hotel.rating.toFixed(1)} ★</span>
        <span className="text-gray-500">{hotel.city}</span>
      </div>
      <p className="text-lg font-medium mb-4">₹{hotel.price} / night</p>

      {hotel.images?.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {hotel.images.map((img) => (
            <img
              key={img.url}
              src={img.url}
              alt={img.alt ?? hotel.name}
              className="rounded-xl object-cover w-full h-48"
            />
          ))}
        </div>
      )}

      {/* Example headings and content from seed.mjs */}
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Overview</h2>
        <p className="text-gray-700">
          {/* Replace with actual overview text from your seed data */}
          A modern and comfortable stay located in the heart of {hotel.city}.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Amenities</h2>
        <ul className="list-disc ml-5 text-gray-700">
          <li>Free Wi-Fi</li>
          <li>Swimming pool</li>
          <li>Spa & Wellness</li>
          {/* Populate dynamically if your seed contains a list */}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Location</h2>
        <p className="text-gray-700">
          {/* Replace with actual location details from your seed data */}
          Centrally located, close to major attractions and public transport.
        </p>
      </section>
    </div>
  );
}
