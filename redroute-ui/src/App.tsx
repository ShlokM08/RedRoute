// src/App.tsx
import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import SignIn from "./SignIn";
import RedRouteLandingUltra from "./RedRouteLandingUltra";
import SquareImage from "./components/SquareImage";
import HotelDetail from "./HotelDetail";
import Checkout from "./Checkout";            // ⟵ NEW
import { hasValidSession, clearSession } from "./session";

function RequireAuth() {
  const valid = hasValidSession();
  console.log("RequireAuth check:", valid);
  return valid ? <Outlet /> : <Navigate to="/login" replace />;
}

function Logout() {
  useEffect(() => {
    clearSession();
    window.location.replace("/login");
  }, []);
  return null;
}

export default function App() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Uncomment to clear session during dev:
      // localStorage.removeItem("rr_session_ts");
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<SignIn />} />
        {/* Allow hotel detail without auth (your original behavior) */}
        <Route path="/hotels/:id" element={<HotelDetail />} />

        {/* Auth-gated routes */}
        <Route element={<RequireAuth />}>
          <Route path="/home" element={<RedRouteLandingUltra />} />
          <Route
            path="/square"
            element={
              <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-800 mb-8">
                    Square Image Demo
                  </h1>
                  <div className="flex flex-wrap gap-8 justify-center">
                    <SquareImage size={150} color="#3b82f6" />
                    <SquareImage size={200} color="#ef4444" />
                    <SquareImage size={250} color="#10b981" />
                    <SquareImage size={180} color="#f59e0b" />
                  </div>
                </div>
              </div>
            }
          />
          {/* NEW: Checkout is behind auth so payment/booking only happens for logged-in users */}
          <Route path="/checkout" element={<Checkout />} />
        </Route>

        {/* Misc */}
        <Route path="/logout" element={<Logout />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
