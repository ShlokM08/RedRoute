import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import GamingLogin from "./gaming-login";
import { clearSession } from "./session";

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
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}

export default function SignIn() {
  const { search } = useLocation();

  // If /login?reset=1 → clear any sticky session
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("reset") === "1") clearSession();
  }, [search]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12">
      <VideoBackground src="/s.mp4" />
      <div className="relative z-10 w-full max-w-md">
        <GamingLogin />
        <div className="mt-3 text-center text-xs text-white/60">
          Troubleshooting:{" "}
          <a className="underline" href="/logout">force sign out</a> •{" "}
          <a className="underline" href="/login?reset=1">reset this device</a>
        </div>
      </div>
      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm z-10">
        © {new Date().getFullYear()} RedRoute
      </footer>
    </div>
  );
}
