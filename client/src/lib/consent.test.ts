// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  bootstrapConsent,
  consentHeaderValue,
  getConsent,
  hasAnalyticsConsent,
  loadAnalyticsWhenAllowed,
  saveConsent,
} from "./consent";

function analyticsScripts(): NodeListOf<HTMLScriptElement> {
  return document.querySelectorAll("script[data-aqv-analytics]");
}

beforeEach(() => {
  window.localStorage.clear();
  document.body.innerHTML = "";
  vi.unstubAllEnvs();
});

describe("consent storage", () => {
  it("starts empty, which the banner reads as 'no decision yet'", () => {
    expect(getConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(consentHeaderValue()).toBe("essential");
  });

  it("persists a decision with a version stamp", () => {
    saveConsent("analytics");
    const stored = getConsent();
    expect(stored?.level).toBe("analytics");
    expect(stored?.version).toBe(CONSENT_VERSION);
    expect(hasAnalyticsConsent()).toBe(true);
    expect(consentHeaderValue()).toBe("analytics");
  });

  it("ignores a stored decision from an older consent version", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ version: "1999-01", level: "analytics", decidedAt: "" })
    );
    expect(getConsent()).toBeNull();
    expect(consentHeaderValue()).toBe("essential");
  });

  it("keeps reading the legacy string value written by the previous build", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "essential");
    expect(getConsent()?.level).toBe("essential");
    expect(hasAnalyticsConsent()).toBe(false);

    window.localStorage.setItem(CONSENT_STORAGE_KEY, "all");
    expect(getConsent()?.level).toBe("analytics");
  });

  it("survives corrupt storage instead of throwing", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "{not json");
    expect(getConsent()).toBeNull();
    expect(() => saveConsent("essential")).not.toThrow();
  });

  it("announces the decision so other components can react", () => {
    const listener = vi.fn();
    window.addEventListener("aqv:consent-change", listener as EventListener);
    saveConsent("essential");
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("aqv:consent-change", listener as EventListener);
  });
});

describe("analytics loading", () => {
  it("never injects a script before consent", () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "https://analytics.example.com");
    vi.stubEnv("VITE_ANALYTICS_WEBSITE_ID", "site-1");

    loadAnalyticsWhenAllowed();
    expect(analyticsScripts()).toHaveLength(0);

    saveConsent("essential");
    loadAnalyticsWhenAllowed();
    expect(analyticsScripts()).toHaveLength(0);
  });

  it("injects the script once after an explicit opt-in", () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "https://analytics.example.com");
    vi.stubEnv("VITE_ANALYTICS_WEBSITE_ID", "site-1");

    saveConsent("analytics");
    loadAnalyticsWhenAllowed();
    loadAnalyticsWhenAllowed();

    const scripts = analyticsScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].getAttribute("src")).toBe(
      "https://analytics.example.com/umami"
    );
    expect(scripts[0].dataset.websiteId).toBe("site-1");
  });

  it("does nothing when the titular configured no analytics endpoint", () => {
    saveConsent("analytics");
    loadAnalyticsWhenAllowed();
    expect(analyticsScripts()).toHaveLength(0);
  });

  it("replays the stored opt-in on boot for a returning shopper", () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "https://analytics.example.com/");
    vi.stubEnv("VITE_ANALYTICS_WEBSITE_ID", "site-1");
    saveConsent("analytics");

    bootstrapConsent();
    const scripts = analyticsScripts();
    expect(scripts).toHaveLength(1);
    // Trailing slash on the endpoint must not produce a double slash.
    expect(scripts[0].getAttribute("src")).toBe(
      "https://analytics.example.com/umami"
    );
  });
});
