import  { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import GamingLogin from "./gaming-login";

const LANDING_ROUTE = "/app"; // make sure this matches your router

function VideoBackground({ videoUrl }: { videoUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="absolute inset-0 bg-black/30 z-10" />
      <video
        ref={videoRef}
        className="absolute inset-0 min-w-full min-h-full object-cover w-auto h-auto"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
}

export default function SignIn() {
  const navigate = useNavigate();

  // If already logged in/guest, send to landing
  useEffect(() => {
    const saved = localStorage.getItem("rr_demo_user");
    if (saved) navigate(LANDING_ROUTE, { replace: true });
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12 bg-black">
      <VideoBackground videoUrl="/s.mp4" />

      <div className="relative z-20 w-full max-w-md">
        {/* onSubmit is optional; GamingLogin navigates to LANDING_ROUTE on success */}
        <GamingLogin onSubmit={() => { /* analytics hook (optional) */ }} />
      </div>

      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-sm z-20">
        © 2025 by RedRoute
      </footer>
    </div>
  );
}
