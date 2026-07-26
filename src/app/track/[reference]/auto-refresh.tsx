"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-runs the server component on an interval so the tracking status stays live
 * without a manual reload. Stops once the order reaches a terminal state.
 */
export function TrackingAutoRefresh({
  active = true,
  intervalMs = 20_000,
}: {
  active?: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, router]);

  return null;
}
