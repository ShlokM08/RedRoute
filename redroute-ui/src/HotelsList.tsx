import { useEffect, useState } from "react";
import HotelCard from "./HotelCard";

interface Hotel {
  id: number;
  name: string;
  city: string;
  price: number;
  rating: number;
}

export default function HotelsList() {
  const [hotels, setHotels] = useState<Hotel[]>([]);

  useEffect(() => {
    fetch("/api/hotels") // 👉 Adjust endpoint if needed
      .then((res) => res.json())
      .then(setHotels)
      .catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {hotels.map((hotel) => (
        <HotelCard key={hotel.id} {...hotel} />
      ))}
    </div>
  );
}
