/**
 * Consent + non-essential scripts.
 *
 * One module owns the storage key, the version and the script injection so
 * the banner, the analytics loader and the cart's trace header can never
 * disagree about what the shopper chose (LGPD: opt-in, minimal, revocable).
 */

import { STORAGE_KEYS } from "@shared/const";

export const CONSENT_STORAGE_KEY = STORAGE_KEYS.consent;
export const CONSENT_VERSION = "2026-01";
/** Header consumed by the tRPC client so the server can log consent state. */
export const CONSENT_HEADER_VALUE = {
  essential: "essential",
  analytics: "analytics",
  all: "all",
} as const;

export type ConsentLevel = "essential" | "analytics";

type StoredConsent = {
  version: string;
  level: ConsentLevel;
  decidedAt: string;
};

const ANALYTICS_SCRIPT_ATTR = "data-aqv-analytics";

function readStored(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    if (raw === "essential" || raw === "all") {
      // Legacy value written by an earlier build: treat "all" as analytics.
      return {
        version: CONSENT_VERSION,
        level: raw === "all" ? "analytics" : "essential",
        decidedAt: "",
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (parsed.level !== "essential" && parsed.level !== "analytics")
      return null;
    return {
      version: CONSENT_VERSION,
      level: parsed.level,
      decidedAt: parsed.decidedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function getConsent(): StoredConsent | null {
  return readStored();
}

export function hasAnalyticsConsent(): boolean {
  return readStored()?.level === "analytics";
}

/** Stable react-query key so the banner and any other consumer stay in sync. */
export const CONSENT_QUERY_KEY = ["aqv", "consent"] as const;

export function saveConsent(level: ConsentLevel): void {
  if (typeof window === "undefined") return;
  const payload: StoredConsent = {
    version: CONSENT_VERSION,
    level,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage disabled (private mode): the banner simply reappears next visit.
  }
  window.dispatchEvent(
    new CustomEvent("aqv:consent-change", { detail: payload })
  );
}

/** Value forwarded as the `X-Consent` header by the tRPC client. */
export function consentHeaderValue(): string {
  const stored = readStored();
  if (!stored) return CONSENT_HEADER_VALUE.essential;
  return stored.level === "analytics"
    ? CONSENT_HEADER_VALUE.analytics
    : CONSENT_HEADER_VALUE.essential;
}

/**
 * Analytics is loaded *only* after an explicit opt-in, and only when the
 * titular configured an endpoint + website id. No consent, no request.
 */
export function loadAnalyticsWhenAllowed(): void {
  if (typeof document === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  if (document.querySelector(`script[${ANALYTICS_SCRIPT_ATTR}]`)) return;

  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
  if (!endpoint || !websiteId) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${endpoint.replace(/\/$/, "")}/umami`;
  script.dataset.websiteId = websiteId;
  script.setAttribute(ANALYTICS_SCRIPT_ATTR, "true");
  document.body.appendChild(script);
}

/** Replay the stored decision on boot (returning visitor with opt-in). */
export function bootstrapConsent(): void {
  loadAnalyticsWhenAllowed();
}
