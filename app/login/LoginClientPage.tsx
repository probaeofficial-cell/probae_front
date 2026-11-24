"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles, ShieldCheck, Flame, Utensils, CheckCircle2 } from "lucide-react";
import { customerEndpoints } from "@/lib/customerApiService";
import { getEnquiryForPatch, PatchedEnquiryData } from "@/lib/patchHelper";
import { triggerHaptic } from "@/lib/haptics";

export default function LoginClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramPhone = searchParams.get("phone") || "";
  const paramName = searchParams.get("name") || "";
  const isPatchFlow = searchParams.get("patch") === "true";

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [activeOtpIndex, setActiveOtpIndex] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [patchData, setPatchData] = useState<PatchedEnquiryData | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize from searchParams or stored patch draft
  useEffect(() => {
    const saved = getEnquiryForPatch();
    if (saved) {
      setPatchData(saved);
      if (saved.phone) {
        const clean = saved.phone.replace(/^\+91\s*/, "").replace(/\D/g, "");
        setPhone(clean);
      }
    } else if (paramPhone) {
      const clean = paramPhone.replace(/^\+91\s*/, "").replace(/\D/g, "");
      setPhone(clean);
    }
  }, [paramPhone]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step === "otp" && countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, countdown]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(val);
    if (error) setError("");
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length < 10) {
      triggerHaptic("error");
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    triggerHaptic("impact");
    setIsSubmitting(true);
    setError("");

    try {
      const res = await customerEndpoints.sendCustomerOtp(cleanPhone);
      setIsSubmitting(false);
      setStep("otp");
      setCountdown(60);
      triggerHaptic("selection");

      // Auto-fill dev code if available in non-prod
      if (res && res.dev_otp && String(res.dev_otp).length === 6) {
        const digits = String(res.dev_otp).split("");
        setOtp(digits);
      }

      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setIsSubmitting(false);
      triggerHaptic("error");
      setError(err?.message || "Failed to send verification code. Please try again.");
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanDigits = val.replace(/\D/g, "");
    if (cleanDigits.length > 1) {
      // Handle multi-character input / autofill / paste
      const nextOtp = [...otp];
      for (let i = 0; i < 6 - index && i < cleanDigits.length; i++) {
        nextOtp[index + i] = cleanDigits[i];
      }
      setOtp(nextOtp);
      const nextFocus = Math.min(5, index + cleanDigits.length);
      setActiveOtpIndex(nextFocus);
      otpInputsRef.current[nextFocus]?.focus();
      triggerHaptic("digit");
      if (error) setError("");
      return;
    }

    const digit = cleanDigits.slice(-1);
    triggerHaptic("digit");
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    if (error) setError("");

    if (digit && index < 5) {
      setActiveOtpIndex(index + 1);
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const nextOtp = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      nextOtp[i] = pasted[i];
    }
    setOtp(nextOtp);
    const focusIdx = Math.min(5, pasted.length);
    setActiveOtpIndex(focusIdx);
    otpInputsRef.current[focusIdx]?.focus();
    triggerHaptic("digit");
    if (error) setError("");
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      triggerHaptic("digit");
      setActiveOtpIndex(index - 1);
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      triggerHaptic("error");
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    triggerHaptic("impact");
    setIsSubmitting(true);
    setError("");

    try {
      const res = await customerEndpoints.verifyCustomerOtp(
        cleanPhone,
        code,
        paramName || patchData?.name
      );

      if (res && res.access_token) {
        localStorage.setItem("customer_token", res.access_token);
        localStorage.setItem("customer_phone", cleanPhone);
      }
      sessionStorage.setItem("probae_dismiss_enquiry_prompt", "true");

      setIsSubmitting(false);
      triggerHaptic("success");
      router.push("/onboarding?verified=true");
    } catch (err: any) {
      setIsSubmitting(false);
      triggerHaptic("error");
      setError(err?.message || "Invalid or expired verification code. Please check and try again.");
    }
  };

  const handleSkip = () => {
    triggerHaptic("selection");
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] lg:bg-gradient-to-br lg:from-[#F8F9FB] lg:via-[#F1F3F7] lg:to-[#E9EDF4] flex items-center justify-center p-0 lg:p-8 xl:p-12 font-sans relative overflow-x-hidden selection:bg-[#6C0EAD] selection:text-white">
      
      {/* Background Decorative Lighting (Laptop Only - Soft Airy Glows) */}
      <div className="hidden lg:block pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#6C0EAD]/5 rounded-full blur-[140px]" />
      <div className="hidden lg:block pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#E6683B]/5 rounded-full blur-[140px]" />

      {/* Subtle Light Grid Pattern Background */}
      <div 
        className="hidden lg:block absolute inset-0 opacity-[0.4] pointer-events-none" 
        style={{ 
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px"
        }} 
      />

      {/* Main Dual-Pane Container:
          On mobile: Full viewport height, edge-to-edge.
          On laptop/desktop: Elegant floating showcase card with soft deep shadow and crisp border.
      */}
      <div className="w-full lg:max-w-5xl xl:max-w-6xl min-h-screen lg:min-h-[720px] lg:max-h-[840px] bg-white lg:rounded-[36px] shadow-none lg:shadow-[0_25px_70px_rgba(0,0,0,0.1),0_10px_25px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row overflow-hidden relative border-0 lg:border border-neutral-200/90">
        
        {/* ======================================================== */}
        {/* LEFT / TOP HERO SECTION (Iconic Brand Purple #6C0EAD)     */}
        {/* ======================================================== */}
        <div className="w-full lg:w-[48%] xl:w-[46%] bg-[#6C0EAD] text-white flex flex-col justify-between p-6 sm:p-8 lg:p-12 xl:p-14 relative overflow-hidden shrink-0 rounded-b-[32px] lg:rounded-b-none lg:rounded-r-[44px] shadow-lg lg:shadow-xl z-10">
          
          {/* Subtle radial inner glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Header Row (Official Logo + Skip Pill) */}
          <div className="flex items-center justify-between w-full relative z-20">
            
            {/* Official Vector Probae Logo */}
            <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-90">
              <img
                src="/images/logos/probae-logo-white.svg"
                alt="Probae"
                className="h-7 sm:h-8 lg:h-9 w-auto object-contain filter drop-shadow-sm"
              />
            </Link>

            {/* Skip Button Pill (Visible on mobile; right pane has desktop skip) */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition active:scale-95 cursor-pointer border border-white/25 shadow-sm"
              >
                Skip
              </button>
            </div>
          </div>

          {/* Main Title & Hero Messaging */}
          <div className="relative z-20 pt-8 pb-4 lg:py-6 my-auto max-w-sm sm:max-w-md">
            
            {/* Tagline Pill (Laptop Only) */}
            <div className="hidden lg:inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 rounded-full px-3.5 py-1 text-xs font-bold text-[#FFD700] mb-5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>Smart Nutrition • Calculated to Your Goals</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[52px] font-black leading-[1.1] tracking-tight mb-3">
              Eat Proper, <br />
              <span className="text-white">Live Better.</span>
            </h1>

            <p className="text-white/85 text-xs sm:text-sm leading-relaxed hidden lg:block mb-6 max-w-[320px]">
              Every bowl is portioned to your metabolic target using Mifflin-St Jeor formulas. Prepared fresh daily.
            </p>

            {/* Laptop Nutrition Highlights (Constrained max-width so they NEVER overlap the salad bowl) */}
            <div className="hidden lg:flex flex-col gap-2.5 pt-1 max-w-[270px] xl:max-w-[300px]">
              <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 transition hover:bg-white/20 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-[#41A64E] flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-white">Calorie Precision Guarantee</p>
                  <p className="text-white/75 text-[10px]">Macro-balanced protein & carbs</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 transition hover:bg-white/20 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-[#E6683B] flex items-center justify-center shrink-0 shadow-sm">
                  <Utensils className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-white">Chef-Crafted Fresh Everyday</p>
                  <p className="text-white/75 text-[10px]">Whole natural ingredients, zero junk</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Ultra-Sharp Salad Bowl Artwork (Positioned strictly in bottom-right corner without overlapping pills) */}
          <div className="absolute right-[-10px] bottom-[-10px] sm:right-0 sm:bottom-0 pointer-events-none select-none z-10 w-36 sm:w-44 lg:w-52 xl:w-64 h-36 sm:h-44 lg:h-52 xl:h-64 flex items-end justify-end">
            <img
              src="/images/client-salad-bowl-hd.webp"
              alt="Probae Fresh Salad Bowl"
              className="w-full h-full object-contain object-bottom-right filter drop-shadow-xl"
            />
          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT / MAIN INTERACTION CANVAS (White Sheet)             */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col justify-between bg-white px-6 sm:px-10 lg:px-14 xl:px-16 pt-8 pb-6 relative z-20 min-h-[460px] lg:min-h-full">
          
          {/* Laptop Top Row: Actionable Skip Button */}
          <div className="hidden lg:flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-bold px-4 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition active:scale-95 cursor-pointer shadow-sm border border-neutral-200/80"
            >
              Skip to custom plan →
            </button>
          </div>

          {/* Center Form Wrapper matching exact mockup layout */}
          <div className="w-full max-w-[360px] sm:max-w-md mx-auto my-auto flex-1 flex flex-col justify-between">
            
            {step === "phone" ? (
              /* =================================================== */
              /* STEP 1: PHONE NUMBER INPUT (Client Mockup 1 & 2)    */
              /* =================================================== */
              <form onSubmit={handleSendOtp} className="flex-1 flex flex-col justify-between">
                
                <div className="pt-2 sm:pt-4">
                  
                  {/* Laptop Context Header */}
                  <div className="hidden lg:block mb-6">
                    <span className="text-[11px] font-black tracking-widest text-[#6C0EAD] uppercase block mb-1">
                      Customer Authentication
                    </span>
                    <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                      Sign in to your plan
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1">
                      We’ll verify your phone number to restore or link your meal schedule.
                    </p>
                  </div>

                  {/* Patched Enquiry Alert if arrived from Onboarding */}
                  {isPatchFlow && patchData && (
                    <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/80 p-3.5 text-xs text-orange-950 shadow-sm animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#E6683B]" />
                        <span>Ready to patch details for {patchData.name || paramName}:</span>
                      </div>
                      <p className="text-neutral-600">
                        {patchData.plan_interest ? `${patchData.plan_interest} • ` : ""}Your selections will be pre-filled automatically.
                      </p>
                    </div>
                  )}

                  {/* Floating Labeled Phone Input Box */}
                  <div className="relative mt-3">
                    <div className="border-[1.5px] border-[#E6683B] rounded-2xl p-3.5 sm:p-4 flex items-center gap-2.5 bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all shadow-sm">
                      
                      {/* Floating Label */}
                      <span className="text-[11px] font-bold text-[#E6683B] absolute -top-2.5 left-4 bg-white px-1.5 leading-none">
                        Enter your number
                      </span>
                      
                      {/* Indian Flag & Country Code */}
                      <div className="flex items-center gap-1.5 text-neutral-900 font-bold text-base shrink-0 pr-2.5 border-r border-neutral-300">
                        <span className="text-lg">🇮🇳</span>
                        <span>+91</span>
                      </div>

                      {/* Clean Phone Input */}
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoFocus
                        required
                        placeholder=""
                        value={phone}
                        onChange={handlePhoneChange}
                        className="w-full text-lg font-bold text-neutral-900 outline-none bg-transparent tracking-wide placeholder:font-normal placeholder:text-neutral-300"
                      />
                    </div>

                    {error && (
                      <p className="mt-2 text-xs font-semibold text-red-500 pl-2">{error}</p>
                    )}
                  </div>

                </div>

                {/* Green Continue Button */}
                <div className="pt-8 pb-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || phone.length < 10}
                    className="w-full py-4 rounded-2xl bg-[#41A64E] hover:bg-[#389443] active:scale-98 text-white font-bold text-base sm:text-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending code…</span>
                      </>
                    ) : (
                      "Continue"
                    )}
                  </button>
                </div>

              </form>
            ) : (
              /* =================================================== */
              /* STEP 2: VERIFICATION CODE (Client Mockup 3)         */
              /* =================================================== */
              <form onSubmit={handleVerifyOtp} className="flex-1 flex flex-col justify-between">
                
                <div className="pt-4 sm:pt-6">
                  
                  {/* Back to Phone option */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setStep("phone");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-neutral-800 mb-6 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change number (+91 {phone})</span>
                  </button>

                  {/* Heading */}
                  <h2 className="text-center text-neutral-800 font-bold text-base sm:text-lg mb-6">
                    Enter the verification code
                  </h2>

                  {/* 6 Digit Input Boxes (Warm Cream Yellow #FFF3C9) */}
                  <div className="flex justify-center gap-2 sm:gap-2.5 mb-6">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputsRef.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        onFocus={() => setActiveOtpIndex(idx)}
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-black rounded-xl outline-none transition-all ${
                          activeOtpIndex === idx
                            ? "bg-[#FFF3C9] border-2 border-[#F59E0B] text-neutral-900 shadow-sm scale-105"
                            : digit
                            ? "bg-[#FFF3C9] border-2 border-transparent text-neutral-900"
                            : "bg-[#FFF3C9] border-2 border-transparent text-neutral-900"
                        }`}
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="text-center text-xs font-semibold text-red-500 mb-3">{error}</p>
                  )}

                  {/* Resend Countdown */}
                  <div className="text-center text-xs text-neutral-400">
                    {countdown > 0 ? (
                      <p>Resend code in <span className="font-bold text-neutral-700">{countdown}s</span></p>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          triggerHaptic("selection");
                          setCountdown(60);
                          setError("");
                          try {
                            const cleanPhone = phone.replace(/\D/g, "").slice(-10);
                            const res = await customerEndpoints.sendCustomerOtp(cleanPhone);
                            if (res && res.dev_otp && String(res.dev_otp).length === 6) {
                              setOtp(String(res.dev_otp).split(""));
                            }
                          } catch (err: any) {
                            setError(err?.message || "Could not resend code.");
                          }
                        }}
                        className="font-bold text-[#E6683B] hover:underline cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>

                  {/* Submit Verification Action */}
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting || otp.join("").length < 6}
                      className="w-full py-3.5 rounded-2xl bg-[#41A64E] hover:bg-[#389443] active:scale-98 text-white font-bold text-base shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying…</span>
                        </>
                      ) : (
                        "Verify & Continue"
                      )}
                    </button>
                  </div>

                </div>

                {/* Enhanced Ultra-Sharp Bottom Salad Illustration */}
                <div className="w-full pt-4 pointer-events-none select-none flex justify-center">
                  <img
                    src="/images/client-bottom-salad-hd.webp"
                    alt="Fresh Salad Ingredients"
                    className="w-full max-h-48 sm:max-h-56 object-contain object-bottom filter drop-shadow-sm"
                  />
                </div>

              </form>
            )}

          </div>

          {/* Bottom Security / Terms Note */}
          <div className="text-center text-[11px] text-neutral-400 py-2">
            <span>Protected by Probae Security • Verified via OTP</span>
          </div>

        </div>

      </div>

    </div>
  );
}
