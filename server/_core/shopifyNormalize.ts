/**
 * The decoupling seam.
 *
 * This file is the ONLY place in the codebase that's allowed to know the
 * shape of a Shopify Storefront GraphQL response. Everything it returns is
 * typed against `shared/commerce/types` — backend-agnostic. If a future store
 * ever swaps Shopify for another commerce backend, this file (plus the
 * GraphQL fragments in `shopify.ts`) is what changes; the router, the
 * shared types, and the UI all stay put.
 *
 * The corresponding test in `server/commerce.router.test.ts` serializes a
 * normalized `Product` and asserts the substring `"edges"` is absent — that's
 * the canary for this seam.
 */

import type {
  Cart,
  CartItem,
  Collection,
  Image,
  Money,
  PageInfo,
  Product,
  ProductMetafields,
  ProductOption,
  ProductPage,
  ProductVariant,
  StorefrontMode,
  SelectedOption,
} from "@shared/commerce/types";

// ---- Raw Shopify shapes (kept private to this file) ----

type RawMoney = { amount: string; currencyCode: string };
type RawImage = {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
};
type RawSelectedOption = { name: string; value: string };
type RawProductOption = { name: string; values: string[] };
type Edges<T> = { edges: Array<{ node: T }> };
type RawPageInfo = { hasNextPage: boolean; endCursor: string | null };
export type Connection<T> = Edges<T> & { pageInfo?: RawPageInfo };
type RawMetafield = {
  namespace: string;
  key: string;
  value: string;
  type: string;
};

type RawVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: RawMoney;
  compareAtPrice: RawMoney | null;
  selectedOptions: RawSelectedOption[];
};

export type RawProduct = {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  options: RawProductOption[];
  priceRange: { minVariantPrice: RawMoney; maxVariantPrice: RawMoney };
  images: Edges<RawImage>;
  variants: Edges<RawVariant>;
  /**
   * Aliased single-metafield lookups. Shopify's `metafield(namespace, key)`
   * is stable across API versions, so the transport asks for each `aqv.*`
   * field under its own alias instead of relying on `metafields(first:)`.
   * The alias names carry no meaning here — `normalizeMetafields` reads the
   * real `namespace`/`key` from the payload.
   */
  sizeChart?: RawMetafield | null;
  composition?: RawMetafield | null;
  careInstructions?: RawMetafield | null;
  measurements?: RawMetafield | null;
  fitNotes?: RawMetafield | null;
  modelInfo?: RawMetafield | null;
};

export type RawCollection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: RawImage | null;
  /** Optional: only requested on the collection detail query. */
  products?: Connection<RawProduct>;
};

export type RawCartLine = {
  id: string;
  quantity: number;
  cost: { totalAmount: RawMoney };
  merchandise: {
    id: string;
    title: string;
    price: RawMoney;
    product: {
      handle: string;
      title: string;
      images: Edges<{
        url: string;
        altText: string | null;
        width?: number;
        height?: number;
      }>;
    };
  };
};

export type RawCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { totalAmount: RawMoney; subtotalAmount: RawMoney };
  lines: Edges<RawCartLine>;
};

// ---- Normalizers ----

function normalizeMoney(m: RawMoney): Money {
  return { amount: m.amount, currencyCode: m.currencyCode };
}

function normalizeImage(i: RawImage): Image {
  return {
    url: i.url,
    altText: i.altText ?? null,
    width: i.width,
    height: i.height,
  };
}

function normalizeSelectedOption(o: RawSelectedOption): SelectedOption {
  return { name: o.name, value: o.value };
}

function normalizeProductOption(o: RawProductOption): ProductOption {
  return { name: o.name, values: o.values };
}

/**
 * Merchandising metafields are optional and titular-authored.
 *
 * Rules that keep the storefront honest:
 *   - unknown namespaces/keys are ignored (no guessing);
 *   - malformed JSON is dropped instead of crashing the product query;
 *   - only flat `Record<string, string>` rows survive for the size chart.
 */
export function normalizeMetafields(
  metafields: Array<RawMetafield | null | undefined>
): ProductMetafields | undefined {
  const present = metafields.filter((field): field is RawMetafield =>
    Boolean(field)
  );
  if (!present.length) return undefined;

  const result: ProductMetafields = {};
  const text = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  for (const field of present) {
    if (field.namespace !== "aqv") continue;
    switch (field.key) {
      case "size_chart": {
        const rows = parseSizeChart(field.value);
        if (rows.length) result.sizeChart = rows;
        break;
      }
      case "composition":
        result.composition = text(field.value);
        break;
      case "care_instructions":
        result.careInstructions = text(field.value);
        break;
      case "measurements":
        result.measurements = text(field.value);
        break;
      case "fit_notes":
        result.fitNotes = text(field.value);
        break;
      case "model_info":
        result.modelInfo = text(field.value);
        break;
      default:
        break;
    }
  }

  return Object.keys(result).length ? result : undefined;
}

function parseSizeChart(value: string): Array<Record<string, string>> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === "object"
      )
      .map(row =>
        Object.fromEntries(
          Object.entries(row)
            .filter(([, v]) => typeof v === "string" || typeof v === "number")
            .map(([k, v]) => [k, String(v)] as const)
        )
      )
      .filter(row => Object.keys(row).length > 0)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function normalizePageInfo(connection: {
  pageInfo?: RawPageInfo;
}): PageInfo {
  return {
    hasNextPage: Boolean(connection.pageInfo?.hasNextPage),
    endCursor: connection.pageInfo?.endCursor ?? null,
  };
}

export function normalizeProductPage(
  connection: Connection<RawProduct>,
  mode: StorefrontMode = "live"
): ProductPage {
  return {
    products: connection.edges.map(e => normalizeProduct(e.node)),
    pageInfo: normalizePageInfo(connection),
    mode,
  };
}

/** Empty page used when the store has no commerce credentials yet. */
export const UNCONFIGURED_PAGE: ProductPage = {
  products: [],
  pageInfo: { hasNextPage: false, endCursor: null },
  mode: "unconfigured",
};

function normalizeVariant(v: RawVariant): ProductVariant {
  return {
    id: v.id,
    title: v.title,
    price: normalizeMoney(v.price),
    compareAtPrice: v.compareAtPrice ? normalizeMoney(v.compareAtPrice) : null,
    availableForSale: v.availableForSale,
    selectedOptions: (v.selectedOptions ?? []).map(normalizeSelectedOption),
  };
}

export function normalizeProduct(p: RawProduct): Product {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    productType: p.productType || null,
    vendor: p.vendor || null,
    tags: p.tags ?? [],
    images: p.images.edges.map(e => normalizeImage(e.node)),
    priceRange: {
      min: normalizeMoney(p.priceRange.minVariantPrice),
      max: normalizeMoney(p.priceRange.maxVariantPrice),
    },
    options: (p.options ?? []).map(normalizeProductOption),
    variants: p.variants.edges.map(e => normalizeVariant(e.node)),
    metafields: normalizeMetafields([
      p.sizeChart,
      p.composition,
      p.careInstructions,
      p.measurements,
      p.fitNotes,
      p.modelInfo,
    ]),
  };
}

export function normalizeCollection(c: RawCollection): Collection {
  return {
    id: c.id,
    handle: c.handle,
    title: c.title,
    description: c.description,
    image: c.image ? normalizeImage(c.image) : null,
  };
}

function normalizeCartItem(line: RawCartLine): CartItem {
  const img = line.merchandise.product.images.edges[0]?.node ?? null;
  return {
    lineId: line.id,
    variantId: line.merchandise.id,
    productHandle: line.merchandise.product.handle,
    productTitle: line.merchandise.product.title,
    variantTitle: line.merchandise.title,
    image: img ? normalizeImage(img) : null,
    unitPrice: normalizeMoney(line.merchandise.price),
    quantity: line.quantity,
    lineTotal: normalizeMoney(line.cost.totalAmount),
  };
}

/**
 * Always append `channel=online_store` to checkout URLs so a password-protected
 * dev store still lets the hosted checkout render. Doing this server-side
 * (here, behind `normalizeCart`) means no caller can forget it.
 */
export function withChannelParam(checkoutUrl: string): string {
  if (!checkoutUrl) return checkoutUrl;
  return checkoutUrl.includes("?")
    ? `${checkoutUrl}&channel=online_store`
    : `${checkoutUrl}?channel=online_store`;
}

export function normalizeCart(c: RawCart): Cart {
  return {
    id: c.id,
    checkoutUrl: withChannelParam(c.checkoutUrl),
    items: c.lines.edges.map(e => normalizeCartItem(e.node)),
    itemCount: c.totalQuantity,
    subtotal: normalizeMoney(c.cost.subtotalAmount),
    total: normalizeMoney(c.cost.totalAmount),
  };
}
