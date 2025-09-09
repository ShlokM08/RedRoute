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

/** single source of truth for auth */
function isAuthed() {
  // treat either auth or guest as a "session"
  return !!(localStorage.getItem("rr_demo_user") || localStorage.getItem("rr_guest"));
}

/** Only for routes that require a session */
function RequireAuth() {
  return isAuthed() ? <Outlet /> : <Navigate to="/" replace />;
}

/** Redirect signed-in users away from SignIn */
function RedirectIfAuthed() {
  return isAuthed() ? <Navigate to="/home" replace /> : <Outlet />;
}

export default function App() {
  // Dev-only: clear stale sessions during local dev
  useEffect(() => {
    if (import.meta.env.DEV) {
      // comment these out if you don’t want auto-clear locally
      // localStorage.removeItem("rr_demo_user");
      // localStorage.removeItem("rr_guest");
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public gate: if authed, go to /home; else show SignIn */}
        <Route element={<RedirectIfAuthed />}>
          <Route index element={<SignIn />} />
          <Route path="/" element={<SignIn />} />
        </Route>

        {/* Protected app */}
        <Route element={<RequireAuth />}>
          <Route path="/home" element={<RedRouteLandingUltra />} />
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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
