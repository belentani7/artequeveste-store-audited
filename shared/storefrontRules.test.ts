import { describe, expect, it } from "vitest";
import {
  categoryMatches,
  collectionBlurb,
  discountPercent,
  findCategory,
  findColorOption,
  findPurchasableVariant,
  findSizeOption,
  hasPriceRange,
  isPurchasable,
  normalizeCategory,
  resolveCategorySlug,
  sortProducts,
  STOREFRONT_CATEGORIES,
} from "@shared/storefrontRules";
import type { Product } from "@shared/commerce/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "gid://shopify/Product/1",
    handle: "camiseta-traco",
    title: "Camiseta Traço",
    description: "",
    descriptionHtml: "",
    productType: "Camisetas",
    vendor: "Arte Que Veste",
    tags: [],
    images: [],
    priceRange: {
      min: { amount: "120.00", currencyCode: "BRL" },
      max: { amount: "120.00", currencyCode: "BRL" },
    },
    options: [{ name: "Tamanho", values: ["P", "M"] }],
    variants: [
      {
        id: "v-sold",
        title: "P",
        price: { amount: "120.00", currencyCode: "BRL" },
        compareAtPrice: null,
        availableForSale: false,
        selectedOptions: [{ name: "Tamanho", value: "P" }],
      },
      {
        id: "v-live",
        title: "M",
        price: { amount: "130.00", currencyCode: "BRL" },
        compareAtPrice: null,
        availableForSale: true,
        selectedOptions: [{ name: "Tamanho", value: "M" }],
      },
    ],
    ...overrides,
  };
}

describe("category normalization and matching", () => {
  it("strips accents, case and a trailing plural", () => {
    expect(normalizeCategory("Acessórios")).toBe("acessorio");
    expect(normalizeCategory("Camisetas")).toBe("camiseta");
    expect(normalizeCategory(" QUIMONOS ")).toBe("quimono");
  });

  it("resolves the slug from Shopify productType, including multi-word types", () => {
    expect(resolveCategorySlug(product({ productType: "Camisetas" }))).toBe(
      "camisetas"
    );
    expect(
      resolveCategorySlug(product({ productType: "Camiseta Oversized" }))
    ).toBe("camisetas");
    expect(resolveCategorySlug(product({ productType: "Kimono" }))).toBe(
      "quimonos"
    );
    expect(
      resolveCategorySlug(product({ productType: "Bolsas de couro" }))
    ).toBe("bolsas");
  });

  it("lets an aqv:categoria tag win over the product type", () => {
    expect(
      resolveCategorySlug(
        product({ productType: "Camisetas", tags: ["aqv:categoria:bolsas"] })
      )
    ).toBe("bolsas");
  });

  it("returns null instead of guessing when nothing matches", () => {
    expect(
      resolveCategorySlug(
        product({ productType: "Cerâmica", tags: ["artesanal"] })
      )
    ).toBeNull();
    expect(
      resolveCategorySlug(product({ productType: null, tags: [] }))
    ).toBeNull();
  });

  it("matches by slug, legacy label and no-filter values", () => {
    const item = product();
    expect(categoryMatches(item, "todos")).toBe(true);
    expect(categoryMatches(item, null)).toBe(true);
    expect(categoryMatches(item, undefined)).toBe(true);
    expect(categoryMatches(item, "camisetas")).toBe(true);
    expect(categoryMatches(item, "bolsas")).toBe(false);
  });

  it("exposes a definition for every category the UI links to", () => {
    for (const category of STOREFRONT_CATEGORIES) {
      expect(findCategory(category.slug)).toBe(category);
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.blurb.length).toBeGreaterThan(0);
      expect(category.aliases.length).toBeGreaterThan(0);
    }
    expect(findCategory("inexistente")).toBeUndefined();
  });
});

describe("variant selection", () => {
  it("prefers an in-stock variant over a sold-out first variant", () => {
    expect(findPurchasableVariant(product())?.id).toBe("v-live");
  });

  it("falls back to the cheapest variant so a sold-out card still shows a price", () => {
    const soldOut = product({
      variants: [
        {
          ...product().variants[0],
          id: "expensive",
          price: { amount: "300.00", currencyCode: "BRL" },
        },
        {
          ...product().variants[0],
          id: "cheap",
          price: { amount: "90.00", currencyCode: "BRL" },
        },
      ],
    });
    expect(findPurchasableVariant(soldOut)?.id).toBe("cheap");
  });

  it("returns undefined for a product with no variants instead of inventing one", () => {
    expect(findPurchasableVariant(product({ variants: [] }))).toBeUndefined();
    expect(isPurchasable(product({ variants: [] }))).toBe(false);
    expect(isPurchasable(product())).toBe(true);
  });
});

describe("merchandising helpers", () => {
  it("detects a genuine price range only", () => {
    expect(hasPriceRange(product())).toBe(false);
    const ranged = product({
      priceRange: {
        min: { amount: "120.00", currencyCode: "BRL" },
        max: { amount: "160.00", currencyCode: "BRL" },
      },
    });
    expect(hasPriceRange(ranged)).toBe(true);
  });

  it("computes a discount only from a real compare-at price", () => {
    expect(
      discountPercent({
        price: { amount: "80.00", currencyCode: "BRL" },
        compareAtPrice: null,
      })
    ).toBeNull();
    expect(
      discountPercent({
        price: { amount: "80.00", currencyCode: "BRL" },
        compareAtPrice: { amount: "100.00", currencyCode: "BRL" },
      })
    ).toBe(20);
    // A compare-at price lower than the price is not a discount.
    expect(
      discountPercent({
        price: { amount: "120.00", currencyCode: "BRL" },
        compareAtPrice: { amount: "100.00", currencyCode: "BRL" },
      })
    ).toBeNull();
  });

  it("sorts without mutating the input array", () => {
    const items = [
      product({
        id: "b",
        title: "B",
        priceRange: {
          min: { amount: "200", currencyCode: "BRL" },
          max: { amount: "200", currencyCode: "BRL" },
        },
      }),
      product({
        id: "a",
        title: "A",
        priceRange: {
          min: { amount: "100", currencyCode: "BRL" },
          max: { amount: "100", currencyCode: "BRL" },
        },
      }),
    ];
    expect(sortProducts(items, "price-asc").map(item => item.id)).toEqual([
      "a",
      "b",
    ]);
    expect(sortProducts(items, "price-desc").map(item => item.id)).toEqual([
      "b",
      "a",
    ]);
    expect(sortProducts(items, "title").map(item => item.id)).toEqual([
      "a",
      "b",
    ]);
    expect(items.map(item => item.id)).toEqual(["b", "a"]);
  });

  it("finds size and colour option dimensions across pt-BR and en labels", () => {
    expect(findSizeOption(product())?.name).toBe("Tamanho");
    expect(
      findSizeOption(product({ options: [{ name: "Size", values: ["S"] }] }))
        ?.name
    ).toBe("Size");
    expect(
      findSizeOption(product({ options: [{ name: "Cor", values: ["Ink"] }] }))
    ).toBeUndefined();
    expect(
      findColorOption(
        product({ options: [{ name: "Color", values: ["Ink"] }] })
      )?.name
    ).toBe("Color");
  });

  it("uses the collection's own copy when published, and never invents specifics", () => {
    const base = { id: "1", handle: "camisetas", image: null };
    expect(
      collectionBlurb({
        ...base,
        title: "Camisetas",
        description: "Malha pesada do ateliê.",
      })
    ).toBe("Malha pesada do ateliê.");
    expect(
      collectionBlurb({ ...base, title: "Camisetas", description: "   " })
    ).toContain("Malharia autoral");
    expect(
      collectionBlurb({
        id: "2",
        handle: "outra",
        title: "Outra",
        description: "",
        image: null,
      })
    ).toBe("Coleção publicada no catálogo.");
  });
});
