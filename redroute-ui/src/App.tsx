import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./SignIn";
import RedRouteLandingUltra from "./RedRouteLandingUltra";

export default function App() {
  // Always start fresh: remove any previous "logged in" flag on first load
  useEffect(() => {
    localStorage.removeItem("rr_demo_user");
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Default / landing: Gaming Sign-In */}
        <Route index element={<SignIn />} />
        <Route path="/" element={<SignIn />} />

        {/* Main site after you log in from Sign-In */}
        <Route path="/home" element={<RedRouteLandingUltra />} />

        {/* Anything else → send to Sign-In */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
