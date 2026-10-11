/**
 * Document metadata for a client-rendered SPA.
 *
 * The storefront has no server-side rendering, so each route must keep the
 * document itself honest: title, description, canonical link and an optional
 * JSON-LD block. Every helper here is idempotent — navigating away and back
 * must not stack duplicate tags, and a route without metadata must *remove*
 * the previous block instead of leaving stale data behind.
 */

const DESCRIPTION_SELECTOR = 'meta[name="description"]';
const CANONICAL_SELECTOR = 'link[rel="canonical"]';
const JSON_LD_ID = "aqv-route-jsonld";

export type RouteMeta = {
  title: string;
  description: string;
  /** Absolute URL. Defaults to the current location. */
  canonical?: string;
  /** Set to true for routes that must not be indexed (cart, 404). */
  noindex?: boolean;
  /** Schema.org payload for this route, when the data is real. */
  jsonLd?: Record<string, unknown>;
};

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

export function applyRouteMeta(meta: RouteMeta): void {
  if (typeof document === "undefined") return;

  document.title = meta.title;

  let description =
    document.head.querySelector<HTMLMetaElement>(DESCRIPTION_SELECTOR);
  if (!description) {
    description = document.createElement("meta");
    description.setAttribute("name", "description");
    document.head.appendChild(description);
  }
  description.setAttribute("content", meta.description);

  let canonical =
    document.head.querySelector<HTMLLinkElement>(CANONICAL_SELECTOR);
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  const currentPath = `${window.location.pathname}${window.location.search}`;
  canonical.setAttribute("href", absoluteUrl(meta.canonical ?? currentPath));

  let robots = document.head.querySelector<HTMLMetaElement>(
    'meta[name="robots"]'
  );
  if (meta.noindex) {
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex,follow");
  } else if (robots) {
    robots.remove();
  }

  const existing = document.getElementById(JSON_LD_ID);
  if (existing) existing.remove();
  if (meta.jsonLd) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = JSON_LD_ID;
    script.textContent = JSON.stringify(meta.jsonLd);
    document.head.appendChild(script);
  }
}

export function clearRouteMeta(): void {
  document.getElementById(JSON_LD_ID)?.remove();
}
