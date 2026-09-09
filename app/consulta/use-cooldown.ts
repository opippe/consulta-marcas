"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicApiError } from "./api-error";

export function useCooldown() {
  const [until, setUntil] = useState(0);
  useEffect(() => {
    if (!until) return;
    const timer = setTimeout(() => setUntil(0), Math.max(0, until - Date.now()));
    return () => clearTimeout(timer);
  }, [until]);
  const registerError = useCallback((error: unknown) => {
    if (error instanceof PublicApiError && error.retryAfterSeconds) {
      setUntil(Date.now() + error.retryAfterSeconds * 1000);
    }
  }, []);
  return { coolingDown: until > 0, registerError };
}
