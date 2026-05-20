"use client";
import React, { useState, FormEvent } from "react";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import { QRCodeSVG } from "qrcode.react";

export function TwoFactorSetup() {
  const { user, accessToken, fetchMe } = useAuth();
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
      <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-900">Two-Factor Authentication</h3>
        <p className="text-sm text-neutral-500 mt-1">
          Two-factor authentication is currently enabled on your account.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 font-medium text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Enabled
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
      <h3 className="text-lg font-semibold text-neutral-900">Two-Factor Authentication</h3>
      
      {success ? (
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg border border-green-200 font-medium w-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            2FA has been successfully enabled!
          </div>
        </div>
      ) : !setupData ? (
        <div className="mt-4">
          <p className="text-sm text-neutral-500 mb-4">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>
          <button
            onClick={handleBeginSetup}
            disabled={loading}
            className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
          >
            {loading ? "Loading..." : "Set up 2FA"}
          </button>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-start gap-6">
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
            <QRCodeSVG value={setupData.qr_code_url} size={160} />
          </div>
          
          <div className="w-full">
            <p className="text-sm font-medium text-neutral-900 mb-1">1. Scan the QR code</p>
            <p className="text-sm text-neutral-500 mb-4">
              Open your authenticator app (e.g. Google Authenticator) and scan the QR code above.<br/>
              Alternatively, you can manually enter the secret: <code className="bg-neutral-100 px-2 py-0.5 rounded text-neutral-800">{setupData.secret}</code>
            </p>

            <p className="text-sm font-medium text-neutral-900 mb-2">2. Enter the 6-digit code</p>
            <form onSubmit={handleVerify} className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\\D/g, ""))}
                className="border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500 w-32 tracking-widest text-center"
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
