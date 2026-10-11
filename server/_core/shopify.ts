/**
 * Shopify Storefront API adapter.
 *
 * All Storefront access — catalog reads and cart reads/writes — goes through
 * this module. The Admin token is intentionally not used in app code; product
 * setup is performed once via the Shopify MCP tools.
 *
 * Layout follows the rest of `server/_core/*`:
 *   1. Transport (`storefrontFetch`) with TRPCError mapping
 *   2. GraphQL fragments (the contract for what we request)
 *   3. The eight capability functions, flat named exports:
 *      listProducts, getProductByHandle, listCollections,
 *      getCollectionByHandle, createCart, getCart,
 *      addCartLines, updateCartLines, removeCartLines
 *
 * Every function returns backend-agnostic `shared/commerce/types` via
 * `shopifyNormalize.ts` — the rest of the app never sees raw Shopify shapes.
 */

import { TRPCError } from "@trpc/server";
import type {
  Cart,
  Collection,
  Product,
  ProductPage,
  ProductSort,
  StorefrontStatus,
} from "@shared/commerce/types";
import {
  type Connection,
  type RawCart,
  type RawCollection,
  type RawProduct,
  normalizeCart,
  normalizeCollection,
  normalizeProduct,
  normalizeProductPage,
  UNCONFIGURED_PAGE,
} from "./shopifyNormalize";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Storefront API version pinned for the whole adapter.
 */
export const SHOPIFY_API_VERSION = "2025-04";

/** Lazy env access — tests can override `process.env` before each case. */
function getShopifyStoreDomain(): string {
  return process.env.SHOPIFY_STORE_DOMAIN ?? "";
}
function getShopifyStorefrontToken(): string {
  return process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ?? "";
}
export function isShopifyConfigured(): boolean {
  return Boolean(getShopifyStoreDomain() && getShopifyStorefrontToken());
}

/**
 * Public, secret-free description of the storefront connection.
 *
 * Read-only catalog endpoints use this to answer with an empty catalog plus
 * `mode: "unconfigured"` instead of a 500 when the titular has not connected
 * Shopify yet. The storefront can then show its branded launch state — which
 * is honest — instead of an error that looks like a bug.
 */
export function getStorefrontStatus(): StorefrontStatus {
  const configured = isShopifyConfigured();
  return {
    mode: configured ? "live" : "unconfigured",
    storeDomain: configured ? getShopifyStoreDomain() : null,
    apiVersion: SHOPIFY_API_VERSION,
  };
}

function shopifyStorefrontEndpoint(): string {
  return `https://${getShopifyStoreDomain()}/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type ShopifyUserError = {
  message: string;
  field?: string[] | null;
  code?: string | null;
};

async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!isShopifyConfigured()) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API is not configured",
    });
  }

  let response: Response;
  try {
    response = await fetch(shopifyStorefrontEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": getShopifyStorefrontToken(),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    console.error("[Shopify] Network error", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API is unreachable",
    });
  }

  if (!response.ok) {
    console.error(
      "[Shopify] HTTP",
      response.status,
      await response.text().catch(() => "")
    );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Shopify Storefront API returned HTTP ${response.status}`,
    });
  }

  const json = (await response.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length) {
    console.error("[Shopify] GraphQL errors", json.errors);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: json.errors[0].message || "Shopify Storefront API error",
    });
  }
  if (!json.data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API returned no data",
    });
  }
  return json.data;
}

/**
 * Convert a `{ cart, userErrors }` mutation payload into a normalized cart.
 *
 * `userErrors` are user-correctable (invalid variant, qty out of range, etc.)
 * and become `BAD_REQUEST`. A missing cart with no userErrors is a server bug
 * and becomes `INTERNAL_SERVER_ERROR`.
 */
function unwrapCart(
  payload: { cart: RawCart | null; userErrors: ShopifyUserError[] },
  context: string
): Cart {
  if (payload.userErrors && payload.userErrors.length) {
    console.error(`[Shopify] ${context} userErrors`, payload.userErrors);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: payload.userErrors[0].message || `Shopify ${context} failed`,
    });
  }
  if (!payload.cart) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Shopify ${context} returned no cart`,
    });
  }
  return normalizeCart(payload.cart);
}

// ---------------------------------------------------------------------------
// GraphQL fragments — single source of truth for what we request.
// Two rules baked in here:
//   - Never include `quantityAvailable` (requires a scope we don't have →
//     ACCESS_DENIED). Use `availableForSale: boolean` instead.
//   - Pin the API version (env.ts), keep fragments aligned with normalize.ts.
// ---------------------------------------------------------------------------

const MONEY_FRAGMENT = /* GraphQL */ `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`;

const VARIANT_FRAGMENT = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    price {
      ...MoneyFields
    }
    compareAtPrice {
      ...MoneyFields
    }
    selectedOptions {
      name
      value
    }
  }
`;

const PRODUCT_FRAGMENT = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  fragment ProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    productType
    vendor
    tags
    options {
      name
      values
    }
    priceRange {
      minVariantPrice {
        ...MoneyFields
      }
      maxVariantPrice {
        ...MoneyFields
      }
    }
    images(first: 8) {
      edges {
        node {
          ...ImageFields
        }
      }
    }
    variants(first: 25) {
      edges {
        node {
          ...VariantFields
        }
      }
    }
    sizeChart: metafield(namespace: "aqv", key: "size_chart") {
      namespace
      key
      value
      type
    }
    composition: metafield(namespace: "aqv", key: "composition") {
      namespace
      key
      value
      type
    }
    careInstructions: metafield(namespace: "aqv", key: "care_instructions") {
      namespace
      key
      value
      type
    }
    measurements: metafield(namespace: "aqv", key: "measurements") {
      namespace
      key
      value
      type
    }
    fitNotes: metafield(namespace: "aqv", key: "fit_notes") {
      namespace
      key
      value
      type
    }
    modelInfo: metafield(namespace: "aqv", key: "model_info") {
      namespace
      key
      value
      type
    }
  }
`;

const PAGE_INFO_FRAGMENT = /* GraphQL */ `
  fragment PageInfoFields on PageInfo {
    hasNextPage
    endCursor
  }
`;

const COLLECTION_FRAGMENT = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  fragment CollectionFields on Collection {
    id
    handle
    title
    description
    image {
      ...ImageFields
    }
  }
`;

const CART_FRAGMENT = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      totalAmount {
        ...MoneyFields
      }
      subtotalAmount {
        ...MoneyFields
      }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              ...MoneyFields
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              price {
                ...MoneyFields
              }
              product {
                handle
                title
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                      width
                      height
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

type Edges<T> = { edges: Array<{ node: T }> };

/**
 * Storefront sort orders mapped onto Shopify's enums.
 *
 * `RELEVANCE` is only valid together with a `query`, and collections use a
 * different enum, so the mapping is applied per call instead of globally.
 * See https://shopify.dev/docs/api/storefront/latest/enums/ProductSortKeys
 */
const PRODUCT_SORT_KEYS = {
  featured: "BEST_SELLING",
  newest: "CREATED_AT",
  "price-asc": "PRICE",
  "price-desc": "PRICE",
  title: "TITLE",
  relevance: "RELEVANCE",
} as const satisfies Record<ProductSort, string>;

function sortKeyFor(sort: ProductSort | undefined, hasQuery: boolean) {
  const requested = sort ?? (hasQuery ? "relevance" : "featured");
  if (requested === "relevance" && !hasQuery)
    return { sortKey: "BEST_SELLING" as const, reverse: false };
  return {
    sortKey: PRODUCT_SORT_KEYS[requested],
    reverse: requested === "newest" || requested === "price-desc",
  };
}

export type ListProductsOptions = {
  first?: number;
  /** Optional handle of a collection to scope the listing to. */
  collectionHandle?: string;
  /** Opaque forward cursor from a previous `pageInfo.endCursor`. */
  after?: string;
  /** Full-text search terms (Storefront `query` argument). */
  query?: string;
  sort?: ProductSort;
};

/**
 * Paginated catalog listing.
 *
 * Returns an empty page with `mode: "unconfigured"`-friendly semantics when
 * Shopify is not connected, so the storefront can render its launch state
 * instead of an error. Cart operations still fail loudly — you cannot fake a
 * checkout.
 */
export async function listProductPage(
  options: ListProductsOptions = {}
): Promise<ProductPage> {
  const first = options.first ?? 24;

  if (!isShopifyConfigured()) return UNCONFIGURED_PAGE;

  const hasQuery = Boolean(options.query?.trim());

  if (options.collectionHandle) {
    // Collection listings use ProductCollectionSortKeys (COLLECTION_DEFAULT
    // respects the merchant's manual curation).
    const collectionSort = hasQuery
      ? "RELEVANCE"
      : options.sort === "newest"
        ? "CREATED"
        : options.sort === "price-asc" || options.sort === "price-desc"
          ? "PRICE"
          : options.sort === "title"
            ? "TITLE"
            : "COLLECTION_DEFAULT";
    const data = await storefrontFetch<{
      collection: { products: Connection<RawProduct> } | null;
    }>(
      `${PRODUCT_FRAGMENT}
       ${PAGE_INFO_FRAGMENT}
       query productsByCollection($handle: String!, $first: Int!, $after: String, $query: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean!) {
         collection(handle: $handle) {
           products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
             edges { node { ...ProductFields } }
             pageInfo { ...PageInfoFields }
           }
         }
       }`,
      {
        handle: options.collectionHandle,
        first,
        after: options.after ?? null,
        query: hasQuery ? options.query : null,
        sortKey: collectionSort,
        reverse: options.sort === "newest" || options.sort === "price-desc",
      }
    );
    if (!data.collection) return UNCONFIGURED_PAGE;
    return normalizeProductPage(data.collection.products);
  }

  const { sortKey, reverse } = sortKeyFor(options.sort, hasQuery);
  const data = await storefrontFetch<{ products: Connection<RawProduct> }>(
    `${PRODUCT_FRAGMENT}
     ${PAGE_INFO_FRAGMENT}
     query listProducts($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean!) {
       products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
         edges { node { ...ProductFields } }
         pageInfo { ...PageInfoFields }
       }
     }`,
    {
      first,
      after: options.after ?? null,
      query: hasQuery ? options.query : null,
      sortKey,
      reverse,
    }
  );
  return normalizeProductPage(data.products);
}

/** Convenience wrapper that keeps the flat `Product[]` shape for callers
 * (probe scripts, smoke tests) that only care about the first page. */
export async function listProducts(
  options: ListProductsOptions = {}
): Promise<Product[]> {
  const page = await listProductPage(options);
  return page.products;
}

export async function getProductByHandle(handle: string): Promise<Product> {
  if (!isShopifyConfigured()) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Product "${handle}" is unavailable: the store is not connected to Shopify yet`,
    });
  }
  const data = await storefrontFetch<{ productByHandle: RawProduct | null }>(
    `${PRODUCT_FRAGMENT}
     query productByHandle($handle: String!) {
       productByHandle(handle: $handle) { ...ProductFields }
     }`,
    { handle }
  );
  if (!data.productByHandle) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Product "${handle}" not found`,
    });
  }
  return normalizeProduct(data.productByHandle);
}

export async function listCollections(
  first: number = 10
): Promise<Collection[]> {
  if (!isShopifyConfigured()) return [];
  const data = await storefrontFetch<{ collections: Edges<RawCollection> }>(
    `${COLLECTION_FRAGMENT}
     query listCollections($first: Int!) {
       collections(first: $first) {
         edges { node { ...CollectionFields } }
       }
     }`,
    { first }
  );
  return data.collections.edges.map(e => normalizeCollection(e.node));
}

export async function getCollectionByHandle(
  handle: string
): Promise<Collection> {
  if (!isShopifyConfigured()) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Collection "${handle}" is unavailable: the store is not connected to Shopify yet`,
    });
  }
  const data = await storefrontFetch<{ collection: RawCollection | null }>(
    `${COLLECTION_FRAGMENT}
     query collectionByHandle($handle: String!) {
       collection(handle: $handle) { ...CollectionFields }
     }`,
    { handle }
  );
  if (!data.collection) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Collection "${handle}" not found`,
    });
  }
  return normalizeCollection(data.collection);
}

export type CollectionPage = {
  collection: Collection | null;
  products: Product[];
  pageInfo: ProductPage["pageInfo"];
  mode: ProductPage["mode"];
};

/**
 * One round trip for the collection route: metadata + first product page.
 *
 * Two distinct "empty" answers, because the UI must not confuse them:
 *   - `null`            → the handle does not exist (render a 404 state);
 *   - `collection: null` + `mode: "unconfigured"` → Shopify is not connected
 *     yet, so the store has no collections at all (render launch state).
 */
export async function getCollectionPage(
  handle: string,
  options: Omit<ListProductsOptions, "collectionHandle"> = {}
): Promise<CollectionPage | null> {
  if (!isShopifyConfigured()) {
    return { collection: null, ...UNCONFIGURED_PAGE };
  }

  const first = options.first ?? 24;
  const hasQuery = Boolean(options.query?.trim());
  const data = await storefrontFetch<{ collection: RawCollection | null }>(
    `${COLLECTION_FRAGMENT}
     ${PRODUCT_FRAGMENT}
     ${PAGE_INFO_FRAGMENT}
     query collectionPage($handle: String!, $first: Int!, $after: String, $query: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean!) {
       collection(handle: $handle) {
         ...CollectionFields
         products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
           edges { node { ...ProductFields } }
           pageInfo { ...PageInfoFields }
         }
       }
     }`,
    {
      handle,
      first,
      after: options.after ?? null,
      query: hasQuery ? options.query : null,
      sortKey: hasQuery
        ? "RELEVANCE"
        : options.sort === "newest"
          ? "CREATED"
          : options.sort === "price-asc" || options.sort === "price-desc"
            ? "PRICE"
            : options.sort === "title"
              ? "TITLE"
              : "COLLECTION_DEFAULT",
      reverse: options.sort === "newest" || options.sort === "price-desc",
    }
  );

  if (!data.collection) return null;

  const page = data.collection.products
    ? normalizeProductPage(data.collection.products)
    : UNCONFIGURED_PAGE;

  return {
    collection: normalizeCollection(data.collection),
    products: page.products,
    pageInfo: page.pageInfo,
    mode: page.mode,
  };
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export type CartLineInput = { variantId: string; quantity: number };
export type CartLineUpdate = { lineId: string; quantity: number };

type CartMutationResponse<K extends string> = Record<
  K,
  { cart: RawCart | null; userErrors: ShopifyUserError[] }
>;

export async function createCart(lines: CartLineInput[]): Promise<Cart> {
  const data = await storefrontFetch<CartMutationResponse<"cartCreate">>(
    `${CART_FRAGMENT}
     mutation cartCreate($input: CartInput!) {
       cartCreate(input: $input) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      input: {
        lines: lines.map(l => ({
          merchandiseId: l.variantId,
          quantity: l.quantity,
        })),
      },
    }
  );
  return unwrapCart(data.cartCreate, "cartCreate");
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const data = await storefrontFetch<{ cart: RawCart | null }>(
    `${CART_FRAGMENT}
     query getCart($cartId: ID!) {
       cart(id: $cartId) { ...CartFields }
     }`,
    { cartId }
  );
  return data.cart ? normalizeCart(data.cart) : null;
}

export async function addCartLines(
  cartId: string,
  lines: CartLineInput[]
): Promise<Cart> {
  const data = await storefrontFetch<CartMutationResponse<"cartLinesAdd">>(
    `${CART_FRAGMENT}
     mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
       cartLinesAdd(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      cartId,
      lines: lines.map(l => ({
        merchandiseId: l.variantId,
        quantity: l.quantity,
      })),
    }
  );
  return unwrapCart(data.cartLinesAdd, "cartLinesAdd");
}

export async function updateCartLines(
  cartId: string,
  updates: CartLineUpdate[]
): Promise<Cart> {
  const data = await storefrontFetch<CartMutationResponse<"cartLinesUpdate">>(
    `${CART_FRAGMENT}
     mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
       cartLinesUpdate(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      cartId,
      lines: updates.map(u => ({ id: u.lineId, quantity: u.quantity })),
    }
  );
  return unwrapCart(data.cartLinesUpdate, "cartLinesUpdate");
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[]
): Promise<Cart> {
  const data = await storefrontFetch<CartMutationResponse<"cartLinesRemove">>(
    `${CART_FRAGMENT}
     mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
       cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    { cartId, lineIds }
  );
  return unwrapCart(data.cartLinesRemove, "cartLinesRemove");
}
