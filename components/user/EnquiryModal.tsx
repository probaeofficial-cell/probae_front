"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, User, X } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { customerEndpoints } from "@/lib/customerApiService";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { triggerHaptic } from "@/lib/haptics";

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName?: string;
}

interface Suggestion {
  ulid: string;
  name: string;
  phone: string;
  email?: string;
  plan_interest?: string;
}

export default function EnquiryModal({ isOpen, onClose, planName }: EnquiryModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingStage, setSubmittingStage] = useState<string>("Connecting to Probae…");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMessage(planName ? `I'm interested in: ${planName}` : "");
      setSubmitted(false);
      setError("");

      // Check for past enquiries linked to this device fingerprint
      const fp = getDeviceFingerprint();
      if (fp) {
        setLoadingSuggestions(true);
        customerEndpoints
          .getEnquirySuggestions(fp)
          .then((res: any) => {
            if (res && res.success && Array.isArray(res.suggestions) && res.suggestions.length > 0) {
              setSuggestions(res.suggestions);
            }
          })
          .catch(() => {
            // Silently ignore suggestion errors
          })
          .finally(() => {
            setLoadingSuggestions(false);
          });
      }
    }
  }, [isOpen, planName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  const applySuggestion = (s: Suggestion) => {
    triggerHaptic("selection");
    setName(s.name);
    setPhone(s.phone);
    if (s.email) setEmail(s.email);
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    triggerHaptic("impact");
    setSubmitting(true);
    setError("");
    setSubmittingStage("Connecting to nutrition team…");

    const timer1 = setTimeout(() => {
      setSubmittingStage("Encrypting & saving preferences…");
    }, 700);

    try {
      const fp = getDeviceFingerprint();
      await endpoints.public.submitEnquiry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        plan_interest: planName,
        device_fingerprint: fp,
        meta_data: {
          submitted_at: new Date().toISOString(),
          plan_interest: planName,
          client_platform: typeof navigator !== "undefined" ? navigator.userAgent : "web",
        },
      });

      triggerHaptic("success");
      setSubmitted(true);
    } catch (submitError: unknown) {
      triggerHaptic("error");
      setError(submitError instanceof Error ? submitError.message : "Could not submit your enquiry. Please try again.");
    } finally {
      clearTimeout(timer1);
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-[#F97316] focus:bg-white focus:ring-4 focus:ring-[#F97316]/10 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-neutral-950/55 p-4 backdrop-blur-sm animate-[fadeIn_180ms_ease-out] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-modal-title"
        aria-busy={submitting}
        className="relative my-auto w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-white font-poppins text-neutral-900 shadow-[0_28px_90px_rgba(0,0,0,0.28)] animate-[modalEnter_260ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#F97316] via-[#FB923C] to-[#6A0FAD]" />
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F97316]">
                ProBae plans
              </span>
              <h2 id="enquiry-modal-title" className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]">
                {planName ? "Let’s find your fit" : "Talk to our team"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {planName ? (
                  <>
                    You’re enquiring about <span className="font-semibold text-neutral-700">{planName}</span>. Leave your details and we’ll be in touch.
                  </>
                ) : (
                  "Share your details and our team will help you choose what works for you."
                )}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close enquiry"
              disabled={submitting}
              onClick={() => {
                triggerHaptic("selection");
                onClose();
              }}
              className="shrink-0 rounded-full border border-neutral-100 bg-neutral-50 p-2.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Previous Enquiry suggestions on this device */}
          {!submitting && !submitted && suggestions.length > 0 && (
            <div className="mb-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-3.5 text-xs">
              <div className="mb-2 flex items-center gap-1.5 font-bold text-orange-950">
                <Sparkles className="h-3.5 w-3.5 text-[#F97316]" />
                <span>Found previous inquiries on this device:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={s.ulid || idx}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 font-semibold text-neutral-700 shadow-sm transition hover:border-[#F97316] hover:bg-orange-50"
                  >
                    <User className="h-3 w-3 text-neutral-400" />
                    <span>{s.name} ({s.phone.slice(-4).padStart(s.phone.length, "•")})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {submitting ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-neutral-50 px-6 text-center" role="status" aria-live="polite">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-20 w-20 animate-ping rounded-full bg-purple-100 opacity-60" />
                <BowlLoader className="relative h-14 w-14 text-[#6A0FAD]" />
              </div>
              <p className="mt-6 text-lg font-bold text-neutral-800">{submittingStage}</p>
              <p className="mt-1.5 max-w-xs text-xs text-neutral-400">
                Associating your enquiry with this device so we can customize your nutrition plan instantly.
              </p>
              {/* Progress dots */}
              <div className="mt-5 flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#6A0FAD] [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#F97316] [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#16A34A]" />
              </div>
            </div>
          ) : submitted ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-green-50 to-white px-6 text-center">
              <div className="success-check-pop flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-md shadow-green-100">
                <Check className="h-10 w-10" strokeWidth={3} />
              </div>
              <h3 className="mt-5 text-2xl font-extrabold text-neutral-900">Enquiry Saved!</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">
                Thanks for reaching out! We&apos;ve registered your enquiry and your nutrition consultant will be in touch shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("impact");
                  onClose();
                }}
                className="mt-7 rounded-xl bg-[#F97316] px-8 py-3.5 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 active:scale-95"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-semibold text-neutral-700">
                Name <span className="text-[#F97316]">*</span>
                <input
                  required
                  maxLength={255}
                  autoComplete="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-semibold text-neutral-700">
                Phone <span className="text-[#F97316]">*</span>
                <input
                  required
                  type="tel"
                  maxLength={20}
                  autoComplete="tel"
                  placeholder="Your phone number"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-semibold text-neutral-700">
                Email <span className="font-normal text-neutral-400">(optional)</span>
                <input
                  type="email"
                  maxLength={255}
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-semibold text-neutral-700">
                Message <span className="font-normal text-neutral-400">(optional)</span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  placeholder="Anything else you’d like us to know?"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={submitting}
                  className={`${inputClass} resize-y`}
                />
              </label>
              {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <button
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 py-3.5 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
              >
                Send enquiry
              </button>
              <p className="pt-1 text-center text-xs text-neutral-400">
                Your details are securely saved for your personalized Probae meal plans.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
