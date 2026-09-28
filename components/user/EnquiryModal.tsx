"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { BowlLoader } from "@/components/admin/BowlLoader";

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName?: string;
}

export default function EnquiryModal({ isOpen, onClose, planName }: EnquiryModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMessage(planName ? `I'm interested in: ${planName}` : "");
      setSubmitted(false);
      setError("");
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await endpoints.public.submitEnquiry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        plan_interest: planName,
      });
      setSubmitted(true);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-[#F97316] focus:bg-white focus:ring-4 focus:ring-[#F97316]/10 disabled:cursor-not-allowed disabled:opacity-60";

  return <div
    className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-neutral-950/55 p-4 backdrop-blur-sm animate-[fadeIn_180ms_ease-out] sm:p-6"
    onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}
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
            <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F97316]">ProBae plans</span>
            <h2 id="enquiry-modal-title" className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]">
              {planName ? "Let’s find your fit" : "Talk to our team"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              {planName ? <>You’re enquiring about <span className="font-semibold text-neutral-700">{planName}</span>. Leave your details and we’ll be in touch.</> : "Share your details and our team will help you choose what works for you."}
            </p>
          </div>
          <button type="button" aria-label="Close enquiry" disabled={submitting} onClick={onClose} className="shrink-0 rounded-full border border-neutral-100 bg-neutral-50 p-2.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitting ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-neutral-50 px-6 text-center" role="status" aria-live="polite">
            <BowlLoader className="h-14 w-14 text-[#6A0FAD]" />
            <p className="mt-5 text-lg font-bold text-neutral-800">Sending your enquiry</p>
            <p className="mt-1 text-sm text-neutral-500">We’re passing your details to our team.</p>
          </div>
        ) : submitted ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-green-50 to-white px-6 text-center">
            <div className="success-check-pop flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden="true">
                <circle cx="24" cy="24" r="21" className="success-circle-draw" stroke="currentColor" strokeWidth="2.5" />
                <path d="m14 24.5 7 7L34.5 18" className="success-tick-draw" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="mt-5 text-2xl font-extrabold text-neutral-900">Enquiry sent!</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">Thanks for reaching out. The ProBae team will contact you soon.</p>
            <button type="button" onClick={onClose} className="mt-7 rounded-xl bg-[#F97316] px-8 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold text-neutral-700">Name <span className="text-[#F97316]">*</span>
              <input required maxLength={255} autoComplete="name" placeholder="Your full name" value={name} onChange={(event) => setName(event.target.value)} disabled={submitting} className={inputClass} />
            </label>
            <label className="block text-sm font-semibold text-neutral-700">Phone <span className="text-[#F97316]">*</span>
              <input required type="tel" maxLength={20} autoComplete="tel" placeholder="Your phone number" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={submitting} className={inputClass} />
            </label>
            <label className="block text-sm font-semibold text-neutral-700">Email <span className="font-normal text-neutral-400">(optional)</span>
              <input type="email" maxLength={255} autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} className={inputClass} />
            </label>
            <label className="block text-sm font-semibold text-neutral-700">Message <span className="font-normal text-neutral-400">(optional)</span>
              <textarea rows={3} maxLength={2000} placeholder="Anything else you’d like us to know?" value={message} onChange={(event) => setMessage(event.target.value)} disabled={submitting} className={`${inputClass} resize-y`} />
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={submitting} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 py-3.5 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60">
              Send enquiry
            </button>
            <p className="pt-1 text-center text-xs text-neutral-400">Your details are only used to respond to this enquiry.</p>
          </form>
        )}
      </div>
    </div>
  </div>;
}
