import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./SignIn";
import RedRouteLandingUltra from "./RedRouteLandingUltra";

export default function App() {
  const isAuthed = !!localStorage.getItem("rr_demo_user");

  return (
    <BrowserRouter>
      <Routes>
        {/* Sign-in is the landing page */}
        <Route path="/" element={<SignIn />} />
        {/* Main site after sign-in */}
        <Route path="/home" element={<RedRouteLandingUltra />} />
        {/* Fallback: send unknown routes to the right place */}
        <Route path="*" element={<Navigate to={isAuthed ? "/home" : "/"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
