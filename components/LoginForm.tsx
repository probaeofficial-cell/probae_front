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
  onForgot,
  onSuccess,
  onRequires2FA
}: {
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
      const data = await endpoints.auth.login({ email, password });
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
function AuthenticatorView({ email, password, onSuccess }: { email: string, password: string, onSuccess: (token: string) => void }) {
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
      const data = await endpoints.auth.login({ email, password, totp_code: digits.join("") });
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

// ─── VIEW: Forgot password — enter email ──────────────────────────────────────
function ForgotEmailView({
  onBack,
  onSent,
}: {
  onBack: () => void;
  onSent: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 700));
      onSent(email.trim());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ProbaeWordmark />
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-1 text-center w-full">
        Admin Recovery
      </h1>
      <p className="text-neutral-500 text-sm mb-7 text-center w-full">
        Secure portal access. Enter your email for a reset code.
      </p>

      {error && (
        <p className="text-red-400 text-xs mb-4 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2 w-full text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-3" noValidate>
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={inputCls}
        />

        <ProbaeButton type="submit" disabled={!canSubmit || loading}>
          {loading ? <span className="animate-pulse">Sending…</span> : <>Send code <ChevronRightIcon /></>}
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

// ─── VIEW: Email OTP verification ─────────────────────────────────────────────
function EmailOtpView({
  email,
  onBack,
  onSuccess,
}: {
  email: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(4).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { seconds, expired, reset } = useCountdown(240);

  const filled = digits.every((d) => d !== "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!filled) return;
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      onSuccess();
    } catch {
      setError("Invalid code. Please try again.");
      setDigits(Array(4).fill(""));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    reset();
    setDigits(Array(4).fill(""));
    setError(null);
  }

  return (
    <>
      <ProbaeWordmark />
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-1 text-center w-full">
        Admin Verification
      </h1>
      <p className="text-neutral-500 text-sm leading-relaxed text-center w-full">
        Restricted access. Enter the verification code sent to<br />
        <strong className="text-white font-semibold">{email}</strong>
      </p>

      {error && (
        <p className="text-red-400 text-xs mt-4 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2 w-full text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center" noValidate>
        <OtpInput length={4} value={digits} onChange={setDigits} />

        {/* Countdown */}
        {!expired && (
          <p className="text-neutral-500 text-sm mb-4">{seconds}s</p>
        )}

        <ProbaeButton type="submit" disabled={!filled || loading}>
          {loading ? <span className="animate-pulse">Verifying…</span> : <>Verify email <ChevronRightIcon /></>}
        </ProbaeButton>
      </form>

      {/* Resend */}
      <p className="mt-5 text-xs text-neutral-500 text-center w-full">
        {expired ? (
          <>
            Didn't receive a code?{" "}
            <button
              type="button"
              onClick={handleResend}
              className="text-white font-semibold hover:text-neutral-300 transition-colors"
            >
              Resend Code
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onBack}
              className="hover:text-neutral-300 transition-colors"
            >
              ← back
            </button>
          </>
        )}
      </p>
    </>
  );
}

// ─── VIEW: Create New Password ────────────────────────────────────────────────
function ResetPasswordView({ onSuccess }: { onSuccess: () => void }) {
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
      await new Promise((r) => setTimeout(r, 800));
      onSuccess();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ProbaeWordmark />
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-1 text-center w-full">Admin Reset</h1>
      <p className="text-neutral-500 text-sm mb-7 text-center w-full">Secure portal access. Create a new password.</p>

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
          />
        </div>

        <ProbaeButton type="submit" disabled={!canSubmit || loading}>
          {loading ? (
            <span className="animate-pulse">Updating…</span>
          ) : (
            <>Update password <ChevronRightIcon /></>
          )}
        </ProbaeButton>
      </form>
    </>
  );
}

// ─── VIEW: Password Changed Success ───────────────────────────────────────────
function PasswordChangedView({ onLogin }: { onLogin: () => void }) {
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
      <p className="text-neutral-500 text-sm mb-8 w-full">
        Your password has been changed successfully.<br />
        You can now log in with your new password.
      </p>

      <ProbaeButton type="button" onClick={onLogin}>
        Back to Login <ChevronRightIcon />
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
      <h1 className="text-white text-[2rem] font-bold tracking-tight mb-1 w-full">You're in!</h1>
      <p className="text-neutral-500 text-sm w-full">Redirecting to your dashboard…</p>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
type View =
  | "login"
  | "authenticator"        // Google Auth TOTP — after login
  | "forgot-email"         // Forgot password: enter email
  | "forgot-otp"           // Forgot password: verify OTP
  | "reset-password"       // Forgot password: enter new password
  | "password-changed"     // Forgot password: success message
  | "success";             // Login successful

export default function LoginForm() {
  const [view, setView] = useState<View>("login");
  const [resetEmail, setResetEmail] = useState("");
  const [pendingCredentials, setPendingCredentials] = useState({ email: "", password: "" });
  
  const { setAccessToken, fetchMe } = useAuth();
  const router = useRouter();

  const handleLoginSuccess = async (token: string) => {
    setAccessToken(token);
    setView("success");
    await fetchMe(token);
    // Add small delay to let user see the success view before navigating
    setTimeout(() => {
      router.push("/admin/dashboard");
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[360px] mx-auto">
      {view === "login" && (
        <LoginView
          onForgot={() => setView("forgot-email")}
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
          onSuccess={handleLoginSuccess} 
        />
      )}
      {view === "forgot-email" && (
        <ForgotEmailView
          onBack={() => setView("login")}
          onSent={(email) => { setResetEmail(email); setView("forgot-otp"); }}
        />
      )}
      {view === "forgot-otp" && (
        <EmailOtpView
          email={resetEmail}
          onBack={() => setView("forgot-email")}
          onSuccess={() => setView("reset-password")}
        />
      )}
      {view === "reset-password" && (
        <ResetPasswordView onSuccess={() => setView("password-changed")} />
      )}
      {view === "password-changed" && (
        <PasswordChangedView onLogin={() => setView("login")} />
      )}
      {view === "success" && <SuccessView />}
    </div>
  );
}