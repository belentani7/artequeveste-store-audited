/**
 * HTTP security policy for the storefront.
 *
 * Kept out of `index.ts` on purpose: the policy is the part most likely to be
 * reviewed or tested, and importing `index.ts` would start an HTTP server as a
 * side effect. Everything here is a pure function of its arguments.
 */

/**
 * Content Security Policy.
 *
 * Two profiles:
 *   - production: no inline scripts at all, and no framing by anyone;
 *   - development: the sandboxed preview renders the storefront inside the
 *     preview host's iframe and Vite injects an inline bootstrap, so
 *     `frame-ancestors` and `'unsafe-inline'` are relaxed there. Shipping the
 *     production profile to the preview would show a blank frame — that is a
 *     configuration bug, not a security win.
 *
 * Fonts are self-hosted (@fontsource) and analytics is loaded only after
 * consent, so no third-party origin is needed for either.
 */
export function contentSecurityPolicy(isProduction: boolean): string {
  const shared = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "form-action 'self' https:",
    "connect-src 'self' https:",
    "style-src 'self' 'unsafe-inline'",
  ];

  if (isProduction) {
    return [
      ...shared,
      "script-src 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
  }

  return [
    ...shared,
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https: ws: wss: http:",
    // Preview only: the sandbox embeds the app in an iframe.
    "frame-ancestors 'self' https:",
  ].join("; ");
}

export type RateBucket = { count: number; resetAt: number };

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 120;
export const RATE_LIMIT_MAX_KEYS = 10_000;

/**
 * Drop expired buckets.
 *
 * Without this the limiter is an unbounded map keyed by client IP: one entry
 * per address, forever. Also caps the map size so a spoofed/rotating-IP flood
 * cannot grow it without bound.
 */
export function pruneRateLimiter(
  buckets: Map<string, RateBucket>,
  now: number
): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size > RATE_LIMIT_MAX_KEYS) {
    const overflow = buckets.size - RATE_LIMIT_MAX_KEYS;
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++removed >= overflow) break;
    }
  }
}

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Fixed-window per-key limiter.
 *
 * Fixed windows are deliberate: the budget is small and per-minute, and a
 * rolling window would need per-request timestamps for no shopper-visible gain.
 * The first request of a window is always allowed, so a single burst cannot
 * lock out a legitimate client.
 */
export function checkRateLimit(
  buckets: Map<string, RateBucket>,
  key: string,
  now: number = Date.now(),
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS
): RateLimitDecision {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, remaining: maxRequests - current.count };
}
