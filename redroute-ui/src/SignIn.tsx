// src/SignIn.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GamingLogin from "./gaming-login";

/** Fullscreen looping background video */
function VideoBackground({ src = "/s.mp4", poster }: { src?: string; poster?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <video
        data-login-video
        className="h-full w-full object-cover"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      {/* subtle dark overlay so the form pops */}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}

export default function SignIn() {
  const navigate = useNavigate();

  useEffect(() => {
    const hasSession =
      localStorage.getItem("rr_demo_user") || localStorage.getItem("rr_guest");
    if (hasSession) navigate("/home", { replace: true });
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12">
      <VideoBackground src="/s.mp4" />
      <div className="relative z-10 w-full max-w-md">
        <GamingLogin />
      </div>
      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm z-10">
        © {new Date().getFullYear()} RedRoute
      </footer>
    </div>
  );
}
