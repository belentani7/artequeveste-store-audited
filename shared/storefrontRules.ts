/**
 * Storefront merchandising rules shared by server and client.
 *
 * Pure functions only — no React, no network, no globals. That keeps them
 * unit-testable and lets the same category logic drive the Home, the catalog
 * route, the collection route and the sitemap.
 */

import type {
  Collection,
  Product,
  ProductSort,
  ProductVariant,
} from "./commerce/types";

/**
 * Category slugs are stable, ASCII, URL-safe tokens published by the titular.
 * Two sources feed them, in priority order:
 *   1. a product type (`productType`) such as "Camisetas";
 *   2. an `aqv:categoria:<slug>` product tag, which is how a piece that is not
 *      really a "type" (a bolsa, an acessório) gets filed.
 *
 * The Home tiles and the catalog filter both resolve a slug through
 * `categoryMatches`, so a tile never links to an empty, invented bucket.
 */
export type CategorySlug = "camisetas" | "quimonos" | "bolsas" | "acessorios";

export type CategoryDefinition = {
  slug: CategorySlug;
  /** pt-BR label used in navigation, tiles, filters and document titles. */
  label: string;
  /** Shop-facing description; deliberately generic, never inventing stock. */
  blurb: string;
  /** Extra search terms matched against productType when a tag is absent. */
  aliases: string[];
};

export const STOREFRONT_CATEGORIES: readonly CategoryDefinition[] = [
  {
    slug: "camisetas",
    label: "Camisetas",
    blurb: "Malharia autoral, corte reto e estampa de ateliê.",
    aliases: ["camiseta", "camisetas", "t-shirt", "tshirt", "tee", "camisa"],
  },
  {
    slug: "quimonos",
    label: "Quimonos",
    blurb: "Camadas amplas para vestir movimento e sombra.",
    aliases: ["quimono", "quimonos", "kimono", "kimonos"],
  },
  {
    slug: "bolsas",
    label: "Bolsas",
    blurb: "Estrutura, alça e tecido para carregar o dia.",
    aliases: ["bolsa", "bolsas", "bag", "bags", "mochila", "necessaire"],
  },
  {
    slug: "acessorios",
    label: "Acessórios",
    blurb: "Detalhes que fecham o look: faixa, boné, lenço.",
    aliases: [
      "acessorio",
      "acessorios",
      "acessório",
      "acessórios",
      "bone",
      "faixa",
      "lenco",
      "cinto",
    ],
  },
] as const;

export function findCategory(slug: string): CategoryDefinition | undefined {
  return STOREFRONT_CATEGORIES.find(category => category.slug === slug);
}

/** Strip accents, lowercase and drop a trailing plural "s". */
export function normalizeCategory(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, "");
}

/**
 * Resolve the category a product belongs to.
 *
 * Tag wins over productType because tags are explicit merchandising intent;
 * productType is the fallback the titular already fills in Shopify.
 */
export function resolveCategorySlug(
  product: Pick<Product, "productType" | "tags">
): CategorySlug | null {
  for (const tag of product.tags ?? []) {
    const match = /^aqv:categoria:([a-z0-9-]+)$/i.exec(tag.trim());
    if (!match) continue;
    const slug = match[1].toLowerCase() as CategorySlug;
    if (findCategory(slug)) return slug;
  }

  const type = product.productType ?? "";
  if (!type.trim()) return null;
  const normalizedType = normalizeCategory(type.split(/[,/>|-]/)[0]);
  for (const category of STOREFRONT_CATEGORIES) {
    if (
      category.aliases.some(
        alias => normalizeCategory(alias) === normalizedType
      )
    ) {
      return category.slug;
    }
  }
  // Last resort: substring match so "Camiseta Oversized" still files correctly.
  for (const category of STOREFRONT_CATEGORIES) {
    if (
      category.aliases.some(alias =>
        normalizedType.includes(normalizeCategory(alias))
      )
    ) {
      return category.slug;
    }
  }
  return null;
}

/**
 * Does a product belong to the requested category slug?
 * `null` / empty / "todos" means "no filter applied".
 */
export function categoryMatches(
  product: Product,
  slugOrLabel: string | null | undefined
): boolean {
  if (!slugOrLabel) return true;

  const normalized = normalizeCategory(slugOrLabel);
  // "no filter" values: the slug used by the UI, plus the legacy pt-BR label
  // and the English equivalent, so old links keep working.
  if (normalized === "todo" || normalized === "all" || normalized === "todas")
    return true;

  const target =
    STOREFRONT_CATEGORIES.find(
      category => category.slug === slugOrLabel.toLowerCase()
    )?.slug ??
    STOREFRONT_CATEGORIES.find(
      category => normalizeCategory(category.label) === normalized
    )?.slug ??
    (normalized as CategorySlug);

  const resolved = resolveCategorySlug(product);
  if (resolved === target) return true;
  // A product can carry several tags; honour any of them.
  return (product.tags ?? []).some(
    tag => normalizeCategory(tag) === normalizeCategory(target)
  );
}

/** Products that can actually be bought right now. */
export function isPurchasable(product: Product): boolean {
  return product.variants.some(variant => variant.availableForSale);
}

/**
 * The variant "Adicionar ao carrinho" should use from a card.
 *
 * Returns an in-stock variant first, then — for honest "Esgotado" states —
 * the cheapest variant so price/`compareAt` still render. Never invents a
 * variant: an empty `variants` array yields `undefined`.
 */
export function findPurchasableVariant(
  product: Product
): ProductVariant | undefined {
  const inStock = product.variants.find(variant => variant.availableForSale);
  if (inStock) return inStock;
  return [...product.variants].sort(
    (a, b) =>
      Number.parseFloat(a.price.amount) - Number.parseFloat(b.price.amount)
  )[0];
}

/** Option dimension that represents sizing, across pt-BR and en labels. */
export function findSizeOption(product: Pick<Product, "options">) {
  return product.options.find(option =>
    /tamanho|size|numera/i.test(option.name)
  );
}

export function findColorOption(product: Pick<Product, "options">) {
  return product.options.find(option => /cor|color|colour/i.test(option.name));
}

/**
 * Sort order applied client-side when the backend cannot do it (empty search
 * result pages, launch state) — keeps the UI consistent between the two.
 */
export function sortProducts(
  products: Product[],
  sort: ProductSort
): Product[] {
  const copy = [...products];
  const price = (product: Product) =>
    Number.parseFloat(product.priceRange.min.amount) || 0;
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => price(a) - price(b));
    case "price-desc":
      return copy.sort((a, b) => price(b) - price(a));
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    default:
      return copy;
  }
}

/** Cheapest variant price, used for "a partir de" labels. */
export function cheapestPrice(product: Product) {
  return product.priceRange.min;
}

/** Highest price in the range, used to detect a true price range. */
export function hasPriceRange(product: Product): boolean {
  return product.priceRange.max.amount !== product.priceRange.min.amount;
}

/**
 * Merchandising label for a collection card. Uses the collection's own
 * description when the titular wrote one, otherwise the generic category
 * blurb — never invented specifics.
 */
export function collectionBlurb(collection: Collection): string {
  const own = collection.description?.trim();
  if (own) return own;
  return (
    findCategory(collection.handle.toLowerCase())?.blurb ??
    "Coleção publicada no catálogo."
  );
}

/**
 * Discount percentage for a variant. Returns `null` unless there is a real,
 * higher compare-at price — no fake scarcity, no invented "de/por".
 */
export function discountPercent(
  variant: Pick<ProductVariant, "price" | "compareAtPrice">
): number | null {
  const compare = variant.compareAtPrice
    ? Number.parseFloat(variant.compareAtPrice.amount)
    : 0;
  const price = Number.parseFloat(variant.price.amount);
  if (
    !Number.isFinite(compare) ||
    !Number.isFinite(price) ||
    compare <= price ||
    price <= 0
  )
    return null;
  return Math.round(((compare - price) / compare) * 100);
}
