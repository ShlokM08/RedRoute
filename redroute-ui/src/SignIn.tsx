import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginPage from "./gaming-login"; 

export default function SignIn() {
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("rr_demo_user");
    if (saved) navigate("/home");
  }, [navigate]);

  const handleLogin = (email: string, password: string) => {
    if (!email || !password) return;
    localStorage.setItem("rr_demo_user", email);
    navigate("/home");
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12">
      <LoginPage.VideoBackground videoUrl="/s.mp4" />

      <div className="relative z-20 w-full max-w-md">
        <LoginPage.LoginForm onSubmit={handleLogin} />
      </div>

      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-sm z-20">
        © 2025 by RedRoute
      </footer>
    </div>
  );
}
