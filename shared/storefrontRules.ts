import type { Product, ProductVariant } from "./commerce/types";

export function normalizeCategory(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/s$/, "");
}

export function categoryMatches(product: Product, category: string) {
  if (category === "Todos") return true;
  const needle = normalizeCategory(category);
  return normalizeCategory(product.productType ?? "").includes(needle);
}

export function findPurchasableVariant(product: Product): ProductVariant | undefined {
  return product.variants.find((variant) => variant.availableForSale) ?? product.variants[0];
}
