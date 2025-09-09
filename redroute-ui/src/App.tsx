// src/App.tsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./SignIn";
import RedRouteLandingUltra from "./RedRouteLandingUltra";
import SquareImage from "./components/SquareImage";

export default function App() {
  // On first mount, clear any stale session (keeps dev flow predictable)
  useEffect(() => {
    localStorage.removeItem("rr_demo_user");
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<SignIn />} />
        <Route path="/" element={<SignIn />} />

        {/* Main site after you log in from Sign-In */}
        <Route path="/home" element={<RedRouteLandingUltra />} />

        {/* Square image demo route */}
        <Route
          path="/square"
          element={
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">Square Image Demo</h1>
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

        {/* Anything else → send to Sign-In */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
