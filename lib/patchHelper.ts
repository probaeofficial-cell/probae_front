"use client";

import { getDeviceFingerprint } from "./fingerprint";
import { customerEndpoints } from "./customerApiService";

/**
 * Enquiry Patch Helper
 *
 * Manages caching, patching, and Redis sync of guest enquiries into customer onboarding & login sessions.
 */

const PATCH_STORAGE_KEY = "probae_patch_enquiry";

export interface PatchedEnquiryData {
  ulid: string;
  name: string;
  phone: string;
  email?: string;
  plan_interest?: string;
  message?: string;
  meta_data?: any;
  created_at?: string;
}

export function saveEnquiryForPatch(enquiry: PatchedEnquiryData) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(enquiry);
    sessionStorage.setItem(PATCH_STORAGE_KEY, raw);
    localStorage.setItem(PATCH_STORAGE_KEY, raw);

    // Asynchronously save to Redis using device fingerprint and phone
    const fp = getDeviceFingerprint();
    if (fp) {
      customerEndpoints.saveDraftToRedis(`fp_${fp}`, enquiry, 86400 * 2).catch(() => {});
    }
    if (enquiry.phone) {
      const cleanPhone = enquiry.phone.replace(/\D/g, "").slice(-10);
      if (cleanPhone.length >= 10) {
        customerEndpoints.saveDraftToRedis(`phone_${cleanPhone}`, enquiry, 86400 * 2).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Could not save enquiry for patch:", err);
  }
}

export function getEnquiryForPatch(): PatchedEnquiryData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PATCH_STORAGE_KEY) || localStorage.getItem(PATCH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function fetchDraftFromRedis(key: string): Promise<PatchedEnquiryData | null> {
  try {
    const res = await customerEndpoints.getDraftFromRedis(key);
    if (res && res.exists && res.data) {
      return res.data;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearEnquiryForPatch() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PATCH_STORAGE_KEY);
    localStorage.removeItem(PATCH_STORAGE_KEY);

    const fp = getDeviceFingerprint();
    if (fp) {
      customerEndpoints.deleteDraftFromRedis(`fp_${fp}`).catch(() => {});
    }
  } catch {
    // Ignore
  }
}
