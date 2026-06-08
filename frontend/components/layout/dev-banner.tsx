"use client";

import { useEffect, useState } from "react";

export function DevBanner() {
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    const debugMode = localStorage.getItem("boss-app:debug-mode") === "true";
    setIsDebugMode(debugMode);
  }, []);

  if (!isDebugMode) return null;

  return (
    <div className="w-full bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-semibold">
      In development
    </div>
  );
}
