import { Link } from "react-router-dom";

interface HotelCardProps {
  id: number;
  name: string;
  city: string;
  price: number;
  rating: number;
}

export default function HotelCard({ id, name, city, price, rating }: HotelCardProps) {
  return (
    <div className="rounded-2xl shadow-md p-4 bg-white hover:shadow-lg transition">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">{name}</h2>
        <span className="text-yellow-500 font-medium">{rating.toFixed(1)} ★</span>
      </div>
      <p className="text-gray-600">{city}</p>
      <p className="text-gray-800 mt-2 font-bold">₹{price} / night</p>
      <Link
        to={`/hotels/${id}`}
        className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500"
      >
        View Details
      </Link>
    </div>
  );
}
