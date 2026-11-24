"use client";

/**
 * Device & Guest Fingerprint Utility
 *
 * Tracks non-authenticated visitors across inquiries and plan explorations.
 * This allows Probae to save guest inquiries per-device without requiring premature registration,
 * and seamlessly present suggestions / pre-fill them when the user logs in.
 */

const FP_STORAGE_KEY = "probae_guest_fp_v1";
const FP_COOKIE_KEY = "probae_guest_fp";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Returns a stable device fingerprint string for the browser session.
 */
export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") {
    return "server-rendered";
  }

  try {
    // 1. Check localStorage first
    let fp = localStorage.getItem(FP_STORAGE_KEY);
    if (fp && fp.startsWith("fp_")) {
      return fp;
    }

    // 2. Check Cookie fallback
    const cookieFp = getCookie(FP_COOKIE_KEY);
    if (cookieFp && cookieFp.startsWith("fp_")) {
      localStorage.setItem(FP_STORAGE_KEY, cookieFp);
      return cookieFp;
    }

    // 3. Generate a robust client fingerprint
    const screenInfo = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lang = navigator.language || "";
    const rawEntropy = `${screenInfo}|${tz}|${lang}|${generateUUID()}`;

    // Simple deterministic hash
    let hash = 0;
    for (let i = 0; i < rawEntropy.length; i++) {
      hash = (hash << 5) - hash + rawEntropy.charCodeAt(i);
      hash |= 0;
    }
    const cleanHash = Math.abs(hash).toString(36);
    fp = `fp_${cleanHash}_${generateUUID().slice(0, 8)}`;

    // Store in both localStorage and cookie
    localStorage.setItem(FP_STORAGE_KEY, fp);
    setCookie(FP_COOKIE_KEY, fp);

    return fp;
  } catch {
    return `fp_fallback_${Date.now()}`;
  }
}
