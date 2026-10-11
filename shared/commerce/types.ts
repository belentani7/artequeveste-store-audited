/**
 * Backend-agnostic commerce types.
 *
 * These shapes are the ONLY thing the frontend imports for commerce data.
 * They intentionally don't expose any Shopify-specific concepts (GraphQL
 * edges/nodes, GIDs, userErrors). The Shopify adapter in
 * `server/_core/shopify.ts` + `server/_core/shopifyNormalize.ts` are
 * responsible for normalizing into these shapes.
 *
 * Keep `Money.amount` as a `string` — it mirrors what every commerce backend
 * returns and avoids float-precision risk on totals. The UI converts to a
 * number only when calling `Intl.NumberFormat`.
 */

export type Money = {
  amount: string; // decimal string, e.g. "385.00"
  currencyCode: string; // ISO 4217, e.g. "USD"
};

export type Image = {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
};

export type ProductOption = {
  name: string; // e.g. "Size"
  values: string[]; // e.g. ["Small", "Medium", "Large"]
};

export type SelectedOption = {
  name: string;
  value: string;
};

export type ProductVariant = {
  /** Opaque variant identifier — pass back to addItem / cart mutations as-is. */
  id: string;
  /** Human label such as "Medium / Charcoal" or "Default Title". */
  title: string;
  price: Money;
  compareAtPrice: Money | null;
  availableForSale: boolean;
  /** Flat list of selected options — sized for variant pickers. */
  selectedOptions: SelectedOption[];
};

export type Product = {
  id: string;
  /** URL-friendly slug used as the route param on PDP. */
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  images: Image[];
  /** Min / max across all variants — useful for "from $X" pricing. */
  priceRange: { min: Money; max: Money };
  /** Available option dimensions (e.g. Size, Color) for the variant picker. */
  options: ProductOption[];
  variants: ProductVariant[];
  /**
   * Optional merchandising metadata published in Shopify product
   * metafields (`aqv.*`). All fields are optional by design: the storefront
   * renders them only when the titular filled them in, and never invents
   * measurements, composition or care instructions.
   */
  metafields?: ProductMetafields;
};

/**
 * Real, titular-authored details. Every field is optional — absence means
 * "not published yet", and the UI must say so instead of guessing.
 */
export type ProductMetafields = {
  /** Size chart rows: e.g. [{ size: "P", bust: "96 cm", waist: "78 cm" }] */
  sizeChart?: Array<Record<string, string>>;
  composition?: string | null;
  careInstructions?: string | null;
  measurements?: string | null;
  fitNotes?: string | null;
  modelInfo?: string | null;
};

export type Collection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: Image | null;
  /**
   * Merchandising hint published by the backend (Shopify tags such as
   * `aqv:categoria`). Optional and never invented locally.
   */
  tags?: string[];
};

/**
 * Cursor pagination for catalog listings.
 *
 * `endCursor` is an opaque backend token — pass it back as `after` to fetch
 * the next page. `hasNextPage` is what the UI should trust; never assume a
 * full page means there is more.
 */
export type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export type ProductPage = {
  products: Product[];
  pageInfo: PageInfo;
  /**
   * Why the page looks the way it does. `"unconfigured"` means the store has
   * no commerce credentials yet — an empty page is expected and the UI shows
   * the branded launch state instead of an error.
   */
  mode: StorefrontMode;
};

/**
 * Storefront connection state.
 *
 * The UI uses this to distinguish three honest situations:
 *   - "live":       the commerce backend answers and the catalog is real.
 *   - "unconfigured": no credentials yet — show the branded launch state.
 *   - "error":      the backend was reachable in principle but failed.
 *
 * Nothing here is ever fabricated: `mode` describes configuration, not stock.
 */
export type StorefrontMode = "live" | "unconfigured";

export type StorefrontStatus = {
  mode: StorefrontMode;
  /** Store domain when configured. Never contains a token. */
  storeDomain: string | null;
  apiVersion: string;
};

/**
 * Sort orders offered by the storefront UI. Backend-agnostic names — the
 * Shopify adapter is what maps them onto `ProductSortKeys`.
 */
export const PRODUCT_SORTS = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "title",
  "relevance",
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Human labels for the storefront sort control (pt-BR). */
export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  featured: "Destaques",
  newest: "Novidades",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  title: "A–Z",
  relevance: "Mais relevantes",
};

export type CartItem = {
  /** Cart-line identifier — required for update/remove. */
  lineId: string;
  variantId: string;
  productHandle: string;
  productTitle: string;
  variantTitle: string;
  image: Image | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
};

export type Cart = {
  id: string;
  /** Already includes `channel=online_store` — open directly. */
  checkoutUrl: string;
  items: CartItem[];
  itemCount: number;
  subtotal: Money;
  total: Money;
};
