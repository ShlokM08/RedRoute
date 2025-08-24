import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignIn from "./SignIn";
import RedRouteLandingUltra from "./RedRouteLandingUltra";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Sign-in is the landing page */}
        <Route path="/" element={<SignIn />} />
        {/* Main site after sign-in */}
        <Route path="/home" element={<RedRouteLandingUltra />} />
      </Routes>
    </BrowserRouter>
  );
}
