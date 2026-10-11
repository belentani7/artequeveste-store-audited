import { describe, expect, it } from "vitest";
import {
  RATE_LIMIT_MAX_KEYS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  checkRateLimit,
  contentSecurityPolicy,
  pruneRateLimiter,
  type RateBucket,
} from "./_core/security";

describe("contentSecurityPolicy", () => {
  it("production allows no inline scripts and forbids framing", () => {
    const csp = contentSecurityPolicy(true);
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-inline' 'unsafe-eval'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("development keeps the sandboxed preview embeddable", () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("frame-ancestors 'self' https:");
    expect(csp).toMatch(/script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
  });

  it("never needs a third-party font or media origin", () => {
    for (const isProduction of [true, false]) {
      const csp = contentSecurityPolicy(isProduction);
      expect(csp).toContain("font-src 'self' data:");
      expect(csp).not.toContain("fonts.googleapis.com");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
    }
  });
});

describe("checkRateLimit", () => {
  it("allows the full budget inside a window and refuses one more", () => {
    const buckets = new Map<string, RateBucket>();
    const start = 1_000_000;
    for (let index = 0; index < RATE_LIMIT_MAX_REQUESTS; index++) {
      const decision = checkRateLimit(buckets, "1.2.3.4", start);
      expect(decision.allowed).toBe(true);
    }
    const blocked = checkRateLimit(buckets, "1.2.3.4", start + 10);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("resets the budget after the window expires", () => {
    const buckets = new Map<string, RateBucket>();
    checkRateLimit(buckets, "ip", 0);
    expect(
      checkRateLimit(buckets, "ip", RATE_LIMIT_WINDOW_MS + 1).allowed
    ).toBe(true);
  });

  it("keeps budgets independent per client", () => {
    const buckets = new Map<string, RateBucket>();
    for (let index = 0; index < RATE_LIMIT_MAX_REQUESTS; index++)
      checkRateLimit(buckets, "a", 0);
    expect(checkRateLimit(buckets, "a", 0).allowed).toBe(false);
    expect(checkRateLimit(buckets, "b", 0).allowed).toBe(true);
  });
});

describe("pruneRateLimiter", () => {
  it("drops expired buckets so the limiter cannot leak memory", () => {
    const buckets = new Map<string, RateBucket>([
      ["expired", { count: 5, resetAt: 1_000 }],
      ["active", { count: 1, resetAt: 10_000 }],
    ]);
    pruneRateLimiter(buckets, 5_000);
    expect(buckets.has("expired")).toBe(false);
    expect(buckets.has("active")).toBe(true);
  });

  it("caps the map size under a rotating-IP flood", () => {
    const buckets = new Map<string, RateBucket>();
    for (let index = 0; index < RATE_LIMIT_MAX_KEYS + 500; index++) {
      buckets.set(`ip-${index}`, { count: 1, resetAt: 10_000 });
    }
    pruneRateLimiter(buckets, 5_000);
    expect(buckets.size).toBe(RATE_LIMIT_MAX_KEYS);
  });
});
