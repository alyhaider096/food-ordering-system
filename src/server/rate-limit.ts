import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** Read-only check: does not consume a slot. Use with `recordFailedAttempt`/`resetRateLimit`
 * for flows (like login) that should only count failures, not every attempt. */
export function peekRateLimit(key: string, limit: number): { limited: boolean; retryAfterMs: number } {
  const existing = buckets.get(key);
  const now = Date.now();

  if (!existing || existing.resetAt <= now) {
    return { limited: false, retryAfterMs: 0 };
  }

  return { limited: existing.count >= limit, retryAfterMs: existing.resetAt - now };
}

export function recordFailedAttempt(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  existing.count = Math.min(existing.count + 1, limit + 1);
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(retryAfterMs: number, message: string) {
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

  return NextResponse.json(
    { message },
    {
      headers: { "Retry-After": String(retryAfterSeconds) },
      status: 429,
    },
  );
}
