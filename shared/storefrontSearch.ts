/**
 * Shopify search operators must not reach the Storefront API as user queries.
 * This pure rule is shared by the API validator and the search interface.
 */
export const MAX_STOREFRONT_SEARCH_LENGTH = 80;

export function normalizeStorefrontSearchTerm(value: string): string {
  return value
    .trim()
    .slice(0, MAX_STOREFRONT_SEARCH_LENGTH)
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\:*()"'`~^[\]{}=!<>&|+,\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type StorefrontSearchState =
  | { kind: "browse"; term: "" }
  | { kind: "invalid"; term: "" }
  | { kind: "search"; term: string };

/** Distinguish a genuinely empty search from operator-only input. */
export function resolveStorefrontSearch(value: string): StorefrontSearchState {
  const raw = value.trim().slice(0, MAX_STOREFRONT_SEARCH_LENGTH);
  if (!raw) return { kind: "browse", term: "" };
  const term = normalizeStorefrontSearchTerm(raw);
  return term ? { kind: "search", term } : { kind: "invalid", term: "" };
}

/** Use router navigation so browser Back/Forward restores submitted searches. */
export function storefrontSearchPath(value: string): string {
  const raw = value.trim().slice(0, MAX_STOREFRONT_SEARCH_LENGTH);
  return raw ? `/busca?q=${encodeURIComponent(raw)}` : "/busca";
}
