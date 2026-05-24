"use client";
import { useState, useRef, useEffect, FormEvent, KeyboardEvent, ClipboardEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ProbaeButton } from "./ProbaeButton";
import { useAuth } from "@/lib/AuthContext";
import { endpoints, ApiError } from "@/lib/apiService";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" />
    </svg>
  );
}

export function ProbaeWordmark() {
  return (
    <div className="flex items-center justify-center mb-10 w-full">
      <Image
        src="/images/logos/PB_Probae Logo - LabWhite Horizontal.png"
        alt="Probae Logo"
        width={180}
        height={45}
        priority
        className="object-contain select-none"
      />
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputCls = `
  w-full bg-transparent border border-[#3a3a3a]
  text-white placeholder:text-neutral-600
  rounded-2xl px-4 py-3.5 text-sm
  outline-none focus:border-neutral-500
  transition-colors duration-150
`;

// ─── OTP Input (shared) ───────────────────────────────────────────────────────
interface OtpInputProps {
  length: number;
  value: string[];
  onChange: (val: string[]) => void;
}
function OtpInput({ length, value, onChange }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(idx: number, char: string) {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < length - 1) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (value[idx]) {
        const next = [...value];
        next[idx] = "";
        onChange(next);
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const next = [...value];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    onChange(next);
    const lastFilled = Math.min(pasted.length, length - 1);
    refs.current[lastFilled]?.focus();
  }

  return (
    <div className="flex gap-3 my-8 w-full justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="flex-1 aspect-square max-w-[50px] text-center text-white text-lg font-medium
            bg-transparent border border-[#3a3a3a] rounded-2xl
            outline-none focus:border-neutral-400
            caret-white transition-colors duration-150"
          style={{ minWidth: 0 }}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function useCountdown(initial: number) {
  const [seconds, setSeconds] = useState(initial);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) { setRunning(false); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, running]);

  const reset = () => { setSeconds(initial); setRunning(true); };
  return { seconds, expired: seconds <= 0, reset };
}

// ─── VIEW: Login ──────────────────────────────────────────────────────────────
function LoginView({
  rememberMe,
  onChangeRememberMe,
  onForgot,
  onSuccess,
  onRequires2FA
}: {
  rememberMe: boolean;
  onChangeRememberMe: (val: boolean) => void;
  onForgot: () => void;
  onSuccess: (token: string) => void;
  onRequires2FA: (email: string, pass: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const data = await endpoints.auth.login({ identifier: email, password }, rememberMe);
      onSuccess(data.access_token);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403 && err.detail === "2FA verification required") {
        onRequires2FA(email, password);
        return;
      }
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ProbaeWordmark />
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-1 text-center w-full">Admin Login</h1>
      <p className="text-neutral-500 text-sm mb-7 text-center w-full">Secure portal access</p>

      {error && (
        <p className="text-red-400 text-xs mb-4 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2 w-full text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-3" noValidate>
        <input
          type="text"
          placeholder="Username or email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          className={inputCls}
        />
        <div className="relative w-full">
          <input
            type={showPwd ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={`${inputCls} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {showPwd ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pb-1.5 pt-0.5 px-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div className="relative">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => onChangeRememberMe(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-[18px] h-[18px] rounded-[6px] border transition-all duration-150 flex items-center justify-center ${rememberMe ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-[#3a3a3a] bg-transparent group-hover:border-neutral-500'}`}>
                {rememberMe && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3 h-3 text-white"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
              Remember me
            </span>
          </label>
        </div>

        <ProbaeButton type="submit" disabled={!canSubmit || loading}>
          {loading ? (
            <span className="animate-pulse">Logging in…</span>
          ) : (
            <>Login <ChevronRightIcon /></>
          )}
        </ProbaeButton>
      </form>

      <button
        type="button"
        onClick={onForgot}
        className="mt-5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors self-center"
      >
        forgot password
      </button>
    </>
  );
}

// ─── VIEW: Google Authenticator OTP ───────────────────────────────────────────
function AuthenticatorView({
  email,
  password,
  rememberMe,
  onSuccess
}: {
  email: string;
  password: string;
  rememberMe: boolean;
  onSuccess: (token: string) => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = digits.every((d) => d !== "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!filled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await endpoints.auth.login({ identifier: email, password, totp_code: digits.join("") }, rememberMe);
      onSuccess(data.access_token);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      setDigits(Array(6).fill(""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ProbaeWordmark />
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-1 text-center w-full">
        Admin Verification
      </h1>
      <p className="text-neutral-500 text-sm leading-relaxed text-center w-full">
        Restricted access. Enter your 6-digit Authenticator code.
      </p>

      {error && (
        <p className="text-red-400 text-xs mt-4 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2 w-full text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center" noValidate>
        <OtpInput length={6} value={digits} onChange={setDigits} />

        <ProbaeButton type="submit" disabled={!filled || loading}>
          {loading ? <span className="animate-pulse">Verifying…</span> : <>Submit <ChevronRightIcon /></>}
        </ProbaeButton>
      </form>
    </>
  );
}

function ForgotView({
  onBack,
}: {
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = email.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await endpoints.auth.requestPasswordReset(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center w-full">
        <ProbaeWordmark />
        <div className="w-14 h-14 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-white text-[2rem] font-bold tracking-tight mb-2 w-full">Check your inbox</h1>
        <p className="text-neutral-500 text-sm mb-8 w-full leading-relaxed">
          We&apos;ve sent a recovery link to your email.
        </p>
        <ProbaeButton type="button" onClick={onBack}>
          Back to Login
        </ProbaeButton>
      </div>
    );
  }

  return (
    <>
      <ProbaeWordmark />
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-1 text-center w-full">
        Reset your password
      </h1>
      <p className="text-neutral-500 text-sm mb-7 text-center w-full">
        Enter your email to get a recovery link.
      </p>

      {error && (
        <p className="text-red-400 text-xs mb-4 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2 w-full text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-3" noValidate>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={inputCls}
          disabled={loading}
        />

        <ProbaeButton type="submit" disabled={!canSubmit || loading}>
          {loading ? <span className="animate-pulse">Sending…</span> : <>Send Reset Link <ChevronRightIcon /></>}
        </ProbaeButton>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="mt-5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors self-center"
      >
        ← back to login
      </button>
    </>
  );
}

function ResetView({
  token,
  onSuccess,
}: {
  token: string;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = password.length > 0 && confirm.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await endpoints.auth.resetPassword(token, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ProbaeWordmark />
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-1 text-center w-full">Update Password</h1>
      <p className="text-neutral-500 text-sm mb-7 text-center w-full">Create a new, secure password.</p>

      {error && (
        <p className="text-red-400 text-xs mb-4 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2 w-full text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-3" noValidate>
        <div className="relative w-full">
          <input
            type={showPwd ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputCls} pr-11`}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {showPwd ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className="relative w-full">
          <input
            type={showPwd ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`${inputCls} pr-11`}
            disabled={loading}
          />
        </div>

        <ProbaeButton type="submit" disabled={!canSubmit || loading}>
          {loading ? (
            <span className="animate-pulse">Updating…</span>
          ) : (
            <>Update Password <ChevronRightIcon /></>
          )}
        </ProbaeButton>
      </form>
    </>
  );
}

function PasswordChangedSuccessView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center text-center w-full">
      <ProbaeWordmark />
      <div className="w-14 h-14 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-2 w-full">Password updated</h1>
      <p className="text-neutral-500 text-sm mb-8 w-full leading-relaxed">
        Your password has been changed successfully.
      </p>

      <ProbaeButton type="button" onClick={onLogin}>
        Return to Login
      </ProbaeButton>
    </div>
  );
}

// ─── VIEW: Success (Dashboard redirect placeholder) ───────────────────────────
function SuccessView() {
  return (
    <div className="flex flex-col items-center text-center w-full">
      <ProbaeWordmark />
      <div className="w-14 h-14 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-1 w-full">You&apos;re in!</h1>
      <p className="text-neutral-500 text-sm w-full">Redirecting to your dashboard…</p>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
type View =
  | "login"
  | "authenticator"
  | "forgot"
  | "reset"
  | "password-changed"
  | "success";

export default function LoginForm() {
  const [view, setView] = useState<View>("login");
  const [token, setToken] = useState("");
  const [pendingCredentials, setPendingCredentials] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  
  const { setAccessToken, fetchMe } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      if (urlToken) {
        setToken(urlToken);
        setView("reset");
      }
    }
  }, []);

  const handleLoginSuccess = async (tokenVal: string) => {
    setAccessToken(tokenVal, rememberMe);
    setView("success");
    await fetchMe(tokenVal);
    setTimeout(() => {
      router.push("/admin/dashboard");
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[360px] mx-auto">
      {view === "login" && (
        <LoginView
          rememberMe={rememberMe}
          onChangeRememberMe={setRememberMe}
          onForgot={() => setView("forgot")}
          onSuccess={handleLoginSuccess}
          onRequires2FA={(email, password) => {
            setPendingCredentials({ email, password });
            setView("authenticator");
          }}
        />
      )}
      {view === "authenticator" && (
        <AuthenticatorView 
          email={pendingCredentials.email}
          password={pendingCredentials.password}
          rememberMe={rememberMe}
          onSuccess={handleLoginSuccess} 
        />
      )}
      {view === "forgot" && (
        <ForgotView onBack={() => setView("login")} />
      )}
      {view === "reset" && (
        <ResetView token={token} onSuccess={() => setView("password-changed")} />
      )}
      {view === "password-changed" && (
        <PasswordChangedSuccessView onLogin={() => setView("login")} />
      )}
      {view === "success" && <SuccessView />}
    </div>
  );
}