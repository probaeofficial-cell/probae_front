"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { endpoints } from "@/lib/apiService";

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

  if (!isOpen) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await endpoints.public.submitEnquiry({ name, phone, email: email || undefined, message: message || undefined, plan_interest: planName });
      setSubmitted(true);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 transition-opacity" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="enquiry-modal-title" className="w-full max-w-md rounded-2xl bg-white p-6 font-sans text-neutral-900 shadow-2xl transition-transform">
      <div className="mb-5 flex items-center justify-between"><h2 id="enquiry-modal-title" className="text-xl font-bold">{planName ? `Enquire about ${planName}` : "Send an enquiry"}</h2><button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100"><X className="h-5 w-5" /></button></div>
      {submitted ? <div className="py-8 text-center"><Check className="mx-auto h-10 w-10 text-green-600" /><p className="mt-3 font-semibold">Thanks! We’ll contact you soon.</p><button type="button" onClick={onClose} className="mt-5 rounded-xl bg-[#F97316] px-5 py-3 font-bold text-white">Done</button></div> : <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">Name *<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#F97316]" /></label>
        <label className="block text-sm font-medium">Phone *<input required type="tel" maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#F97316]" /></label>
        <label className="block text-sm font-medium">Email<input type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#F97316]" /></label>
        <label className="block text-sm font-medium">Message<textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:border-[#F97316]" /></label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={submitting} className="w-full rounded-xl bg-[#F97316] px-5 py-3 font-bold text-white transition hover:bg-orange-600 disabled:opacity-60">{submitting ? "Sending…" : "Send enquiry"}</button>
      </form>}
    </div>
  </div>;
}
