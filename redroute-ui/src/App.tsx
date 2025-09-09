import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import SignIn from "./SignIn";
import RedRouteLandingUltra from "./RedRouteLandingUltra";
import SquareImage from "./components/SquareImage";

/** read localStorage safely */
function getLS(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
/** treat either rr_demo_user or rr_guest as a session */
function isAuthed() {
  return !!(getLS("rr_demo_user") || getLS("rr_guest"));
}

/** /logout route clears session and returns to "/" */
function Logout() {
  useEffect(() => {
    try {
      localStorage.removeItem("rr_demo_user");
      localStorage.removeItem("rr_guest");
      localStorage.removeItem("rr_name");
    } catch {}
    // hard replace so history doesn’t go back to protected routes
    window.location.replace("/");
  }, []);
  return null;
}

/** Only for routes that require a session */
function RequireAuth() {
  return isAuthed() ? <Outlet /> : <Navigate to="/" replace />;
}

/** Redirect signed-in users away from SignIn
 *  If ?forceLogin=1 is present, always show SignIn (handy in prod).
 */
function RedirectIfAuthed() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const forceLogin = params.get("forceLogin") === "1";
  if (forceLogin) return <Outlet />;
  return isAuthed() ? <Navigate to="/home" replace /> : <Outlet />;
}

export default function App() {
  // Optional dev helper: clear sessions when running locally
  useEffect(() => {
    if (import.meta.env.DEV) {
      // comment these out if you don't want auto-clear in dev
      // localStorage.removeItem("rr_demo_user");
      // localStorage.removeItem("rr_guest");
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public: show SignIn unless already authed (unless ?forceLogin=1) */}
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

        {/* Explicit logout route */}
        <Route path="/logout" element={<Logout />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
