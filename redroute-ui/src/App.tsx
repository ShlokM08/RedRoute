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
//import HotelsList from "./HotelsList";      // ⬅️ Import hotels listing
import HotelDetail from "./HotelDetail";    // ⬅️ Import hotel detail page
import { hasValidSession, clearSession } from "./session";

/** Protected-route wrapper using robust session check */
function RequireAuth() {
  return hasValidSession() ? <Outlet /> : <Navigate to="/login" replace />;
}

/** /logout route clears session and goes to /login */
function Logout() {
  useEffect(() => {
    clearSession();
    window.location.replace("/login");
  }, []);
  return null;
}

export default function App() {
  // Optional: dev-only helpers (disabled by default)
  useEffect(() => {
    if (import.meta.env.DEV) {
      // localStorage.removeItem("rr_demo_user");
      // localStorage.removeItem("rr_guest");
      // localStorage.removeItem("rr_session_ts");
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Always show login. No guard here. */}
        <Route path="/login" element={<SignIn />} />

        {/* Protected app */}
        <Route element={<RequireAuth />}>
          <Route path="/home" element={<RedRouteLandingUltra />} />
          <Route path="/hotels/:id" element={<HotelDetail />} />

          

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
        </Route>

        {/* Utility */}
        <Route path="/logout" element={<Logout />} />

        {/* Root & catch-all → go to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
