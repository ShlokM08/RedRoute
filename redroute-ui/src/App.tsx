import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./SignIn";
import RedRouteLandingUltra from "./RedRouteLandingUltra";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default / landing: Gaming Sign-In */}
        <Route index element={<SignIn />} />
        <Route path="/" element={<SignIn />} />

        {/* Main site after you navigate from Sign-In */}
        <Route path="/home" element={<RedRouteLandingUltra />} />

        {/* Anything else -> send to Sign-In */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
