"use client";
import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    const wasAlreadyControlled = Boolean(navigator.serviceWorker.controller);
    let hasReloadedForUpdate = false;
    const handleControllerChange = () => {
      // An updated worker now bypasses the old broad cache. Reload a page that
      // was controlled by the previous worker so it gets fresh HTML and assets.
      if (wasAlreadyControlled && !hasReloadedForUpdate) {
        hasReloadedForUpdate = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        console.log("Service Worker registered with scope:", registration.scope);
        return registration.update();
      })
      .catch((error) => {
        console.error("Service Worker registration/update failed:", error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);
  return null;
}
