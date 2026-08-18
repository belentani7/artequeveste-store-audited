import { describe, expect, it } from "vitest";
import { categoryMatches, findPurchasableVariant, normalizeCategory } from "@shared/storefrontRules";
import type { Product } from "@shared/commerce/types";

const product: Product = {
  id: "product-1",
  handle: "camiseta-traco",
  title: "Camiseta Traço",
  description: "",
  descriptionHtml: "",
  productType: "Camisetas",
  vendor: "Arte Que Veste",
  tags: [],
  images: [],
  priceRange: { min: { amount: "120.00", currencyCode: "BRL" }, max: { amount: "120.00", currencyCode: "BRL" } },
  options: [{ name: "Tamanho", values: ["P", "M"] }],
  variants: [
    { id: "v-sold", title: "P", price: { amount: "120.00", currencyCode: "BRL" }, compareAtPrice: null, availableForSale: false, selectedOptions: [{ name: "Tamanho", value: "P" }] },
    { id: "v-live", title: "M", price: { amount: "120.00", currencyCode: "BRL" }, compareAtPrice: null, availableForSale: true, selectedOptions: [{ name: "Tamanho", value: "M" }] },
  ],
};

describe("storefrontRules", () => {
  it("normalizes accents and plural category labels", () => {
    expect(normalizeCategory("Acessórios")).toBe("acessorio");
    expect(normalizeCategory("Camisetas")).toBe("camiseta");
  });

  it("matches products by category and accepts all products for Todos", () => {
    expect(categoryMatches(product, "Todos")).toBe(true);
    expect(categoryMatches(product, "Camisetas")).toBe(true);
    expect(categoryMatches(product, "Bolsas")).toBe(false);
  });

  it("selects an available variant before a sold-out first variant", () => {
    expect(findPurchasableVariant(product)?.id).toBe("v-live");
  });
});
