'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** Route where RedRouteLandingUltra is mounted */
const LANDING_ROUTE = '/app';
/** Leave empty to use Vite proxy; otherwise put API origin */
const API_BASE = '';

/* ---------------------------------------------------------------------- */
/* Reusable UI bits                                                       */
/* ---------------------------------------------------------------------- */
interface FormInputProps {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
}
const FormInput: React.FC<FormInputProps> = ({
  icon, type, placeholder, value, onChange, required, autoComplete,
}) => (
  <div className="relative">
    <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      autoComplete={autoComplete}
      className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-purple-500/50 transition-colors"
    />
  </div>
);

interface ToggleSwitchProps { checked: boolean; onChange: () => void; id: string; }
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, id }) => (
  <div className="relative inline-block w-10 h-5 cursor-pointer">
    <input type="checkbox" id={id} className="sr-only" checked={checked} onChange={onChange} />
    <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${checked ? 'bg-purple-600' : 'bg-white/20'}`}>
      <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
    </div>
  </div>
);

export const VideoBackground: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="absolute inset-0 bg-black/30 z-10" />
      <video
        ref={videoRef}
        className="absolute inset-0 min-w-full min-h-full object-cover w-auto h-auto"
        autoPlay loop muted playsInline
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
};

/* ---------------------------------------------------------------------- */
/* Login + Register                                                       */
/* ---------------------------------------------------------------------- */
type Mode = 'login' | 'register';

export interface LoginFormProps {
  /** Optional callback; we still navigate to LANDING_ROUTE on success */
  onSubmit?: (email: string, password: string, remember: boolean, mode: Mode) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');

  // shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  // register-only
  const [password2, setPassword2] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [dob, setDob]             = useState(''); // yyyy-mm-dd

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = mode === 'login' ? 'Welcome back' : 'Create your account';
  const cta   = submitting ? (mode === 'login' ? 'Logging in…' : 'Creating…') : (mode === 'login' ? 'Login' : 'Create Account');

  const resetErr = () => setError(null);

  const validate = (): string | null => {
    if (!email || !password) return 'Please fill out all fields.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email.';
    if (password.length < 6) return 'Password should be at least 6 characters.';
    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) return 'Please enter your first and last name.';
      if (password !== password2) return 'Passwords do not match.';
      if (dob) {
        // very light sanity check
        const d = new Date(dob);
        if (Number.isNaN(+d) || d.getFullYear() < 1900) return 'Enter a valid date of birth.';
      }
    }
    return null;
  };

  async function call(path: string, body: any) {
    const r = await fetch(`${API_BASE}/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
    return data;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetErr();
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await call('register', {
          email,
          password,
          remember,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dob: dob || null,
        });
      } else {
        await call('login', { email, password, remember });
      }
      onSubmit?.(email, password, remember, mode);

      // mark access for your existing checks and go to landing
      localStorage.removeItem('rr_guest');
      localStorage.setItem('rr_demo_user', 'auth');
      navigate(LANDING_ROUTE, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  function proceedAsGuest() {
    localStorage.setItem('rr_guest', '1');
    localStorage.setItem('rr_demo_user', 'guest');
    navigate(LANDING_ROUTE, { replace: true });
  }

  return (
    <div className="p-8 rounded-2xl backdrop-blur-sm bg-black/50 border border-white/10 w-[min(480px,92vw)]">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-2 relative group">
          <span className="absolute -inset-1 bg-gradient-to-r from-purple-600/30 via-pink-500/30 to-blue-500/30 blur-xl opacity-75 group-hover:opacity-100 transition-all duration-500" />
          <span className="relative inline-block text-3xl font-bold mb-2 text-white">RedRoute</span>
        </h2>
        <p className="text-white/80 mt-2">{title}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Register-only names row */}
        {mode === 'register' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormInput
              icon={<User className="text-white/60" size={18} />}
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => { resetErr(); setFirstName(e.target.value); }}
              required
              autoComplete="given-name"
            />
            <FormInput
              icon={<User className="text-white/60" size={18} />}
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => { resetErr(); setLastName(e.target.value); }}
              required
              autoComplete="family-name"
            />
          </div>
        )}

        <FormInput
          icon={<Mail className="text-white/60" size={18} />}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => { resetErr(); setEmail(e.target.value); }}
          required
          autoComplete="email"
        />

        {/* Register-only DOB */}
        {mode === 'register' && (
          <div className="relative">
            <FormInput
              icon={<Calendar className="text-white/60" size={18} />}
              type="date"
              placeholder="Date of birth"
              value={dob}
              onChange={(e) => { resetErr(); setDob(e.target.value); }}
              autoComplete="bday"
            />
            {/* helper text (optional) */}
            <div className="mt-1 text-[11px] text-white/60">DOB (optional)</div>
          </div>
        )}

        <div className="relative">
          <FormInput
            icon={<Lock className="text-white/60" size={18} />}
            type={showPassword ? 'text' : 'password'}
            placeholder={mode === 'register' ? 'Create a password' : 'Password'}
            value={password}
            onChange={(e) => { resetErr(); setPassword(e.target.value); }}
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {mode === 'register' && (
          <FormInput
            icon={<Lock className="text-white/60" size={18} />}
            type="password"
            placeholder="Confirm password"
            value={password2}
            onChange={(e) => { resetErr(); setPassword2(e.target.value); }}
            required
            autoComplete="new-password"
          />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div onClick={() => setRemember((r) => !r)} className="cursor-pointer">
              <ToggleSwitch checked={remember} onChange={() => setRemember((r) => !r)} id="remember-me" />
            </div>
            <label
              htmlFor="remember-me"
              className="text-sm text-white/80 cursor-pointer"
              onClick={() => setRemember((r) => !r)}
            >
              Remember me
            </label>
          </div>

          {mode === 'login' ? (
            <button type="button" className="text-sm text-white/80 hover:text-white" onClick={() => setMode('register')}>
              Create account
            </button>
          ) : (
            <button type="button" className="text-sm text-white/80 hover:text-white" onClick={() => setMode('login')}>
              Have an account? Sign in
            </button>
          )}
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg text-white font-medium transition-all bg-[#E50914] hover:bg-[#c40b13] focus:outline-none focus:ring-2 focus:ring-[#E50914]/50 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(229,9,20,0.35)]"
        >
          {cta}
        </button>

        <button
          type="button"
          onClick={proceedAsGuest}
          className="w-full py-3 rounded-lg text-white font-medium transition-all bg-white/10 hover:bg-white/15 border border-white/15"
        >
          Proceed as Guest
        </button>
      </form>

      <div className="mt-8">
        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 absolute w-full" />
        </div>
      </div>
    </div>
  );
};

/* Keep the same export shape you were using */
const LoginPage = { LoginForm, VideoBackground };
export default LoginPage;
