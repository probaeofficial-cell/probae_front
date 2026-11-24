"use client";

/**
 * Mobile Haptic Engine for Web
 *
 * Provides tactile feedback on mobile devices using navigator.vibrate where supported,
 * with graceful fallback for iOS Safari.
 */

export type HapticType = "selection" | "impact" | "success" | "warning" | "error" | "digit";

export function triggerHaptic(type: HapticType = "selection") {
  if (typeof window === "undefined") return;

  // Modern Android / Chrome Web Vibration API
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      switch (type) {
        case "digit":
        case "selection":
          navigator.vibrate(12);
          break;
        case "impact":
          navigator.vibrate(25);
          break;
        case "success":
          navigator.vibrate([20, 50, 30]);
          break;
        case "warning":
          navigator.vibrate([30, 40, 30]);
          break;
        case "error":
          navigator.vibrate([40, 40, 40, 40, 60]);
          break;
      }
    } catch {
      // Ignore vibration blockers
    }
  }
}
