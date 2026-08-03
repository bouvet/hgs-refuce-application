"use client";

import { useSyncExternalStore } from "react";

const debugListeners = new Set<() => void>();

function subscribeDebugMode(callback: () => void): () => void {
  debugListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    debugListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getDebugSnapshot(): boolean {
  return window.localStorage.getItem("WasteFlow:debug-mode") === "true";
}

export function DevBanner() {
  const isDebugMode = useSyncExternalStore(
    subscribeDebugMode,
    getDebugSnapshot,
    () => false,
  );

  if (!isDebugMode) return null;

  return (
    <div className="w-full bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-semibold">
      In development
    </div>
  );
}
