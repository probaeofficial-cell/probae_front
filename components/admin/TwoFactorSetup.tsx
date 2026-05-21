"use client";
import React, { useState, FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, Check, ShieldCheck, QrCode } from "lucide-react";

export function TwoFactorSetup() {
  const { user, fetchMe } = useAuth();
  const [setupData, setSetupData] = useState<{ secret: string; qr_code_url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  async function handleBeginSetup() {
    setLoading(true);
    setError(null);
    try {
      const data = await endpoints.auth.setup2FA();
      setSetupData(data);
    } catch (err: any) {
      setError(err.message || "Failed to start 2FA setup");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Code must be 6 digits.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await endpoints.auth.verify2FA(code);
      setSuccess(true);
      await fetchMe(); // Refresh user data to get two_factor_enabled: true
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (user.two_factor_enabled && !success) {
    return (
      <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-800">Two-Factor Authentication (2FA)</h3>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Two-factor authentication is active. Your account is protected with time-based verification codes.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
          <QrCode className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-800">Two-Factor Authentication</h3>
          <p className="text-sm text-neutral-500 mt-1">
            Add an extra layer of protection by requiring a temporary code from an authenticator app when signing in.
          </p>
        </div>
      </div>
      
      {success ? (
        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Authentication configured successfully!</p>
            <p className="text-xs text-emerald-600 mt-0.5">Two-factor authentication is now active on your account.</p>
          </div>
        </div>
      ) : !setupData ? (
        <div className="mt-6">
          <button
            onClick={handleBeginSetup}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-70 shadow-sm shadow-violet-100 hover:shadow-md hover:scale-[1.01]"
          >
            {loading ? "Starting Setup..." : "Set Up 2FA Verification"}
          </button>
          
          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 pt-6 border-t border-neutral-100 flex flex-col md:flex-row gap-8 items-start">
          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-3 p-5 bg-neutral-50 rounded-2xl border border-neutral-100 shadow-inner w-full md:w-auto">
            <div className="bg-white p-3 rounded-xl border border-neutral-200/60 shadow-sm">
              <QRCodeSVG value={setupData.qr_code_url} size={150} />
            </div>
            <span className="text-[11px] text-neutral-400 font-medium tracking-wide">Scan with Authenticator App</span>
          </div>
          
          {/* Steps & Verification */}
          <div className="flex-1 w-full space-y-6">
            <div>
              <h4 className="text-sm font-bold text-neutral-800 mb-1.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-bold">1</span>
                Scan QR Code
              </h4>
              <p className="text-sm text-neutral-500 pl-7 leading-relaxed">
                Open your authenticator app (e.g., Google Authenticator, Authy, or 1Password) and scan the QR code.
              </p>
              <div className="pl-7 mt-3">
                <p className="text-xs text-neutral-400 mb-1 font-medium">Or enter setup key manually:</p>
                <code className="inline-block bg-neutral-100/80 border border-neutral-200 px-3 py-1.5 rounded-lg text-neutral-700 font-mono text-xs select-all tracking-wide">
                  {setupData.secret}
                </code>
              </div>
            </div>

            <div className="h-[1px] bg-neutral-100" />

            <div>
              <h4 className="text-sm font-bold text-neutral-800 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-bold">2</span>
                Enter Verification Code
              </h4>
              <p className="text-sm text-neutral-500 pl-7 mb-4 leading-relaxed">
                Type the 6-digit confirmation code generated by your authenticator app to complete the activation.
              </p>
              
              <form onSubmit={handleVerify} className="pl-7 flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="border border-neutral-200 rounded-xl px-4 py-2.5 text-base font-semibold tracking-widest text-center text-neutral-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 w-36 transition-all bg-neutral-50/50"
                />
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-70 shadow-sm shadow-violet-100 hover:shadow-md hover:scale-[1.01]"
                >
                  {loading ? "Verifying..." : "Verify & Activate"}
                </button>
              </form>
              
              {error && (
                <div className="mt-4 ml-7 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm flex items-center gap-2 max-w-md">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
