import { describe, expect, it } from "vitest";
import {
  normalizeCart,
  normalizeCollection,
  normalizeMetafields,
  normalizePageInfo,
  normalizeProduct,
  normalizeProductPage,
  UNCONFIGURED_PAGE,
  withChannelParam,
  type RawProduct,
} from "./_core/shopifyNormalize";

const rawProduct: RawProduct = {
  id: "gid://shopify/Product/1",
  title: "Quimono Sombra",
  handle: "quimono-sombra",
  description: "Camada ampla",
  descriptionHtml: "<p>Camada ampla</p>",
  productType: "Quimonos",
  vendor: "Arte Que Veste",
  tags: ["aqv:categoria:quimonos"],
  options: [{ name: "Tamanho", values: ["P", "M"] }],
  priceRange: {
    minVariantPrice: { amount: "290.00", currencyCode: "BRL" },
    maxVariantPrice: { amount: "320.00", currencyCode: "BRL" },
  },
  images: {
    edges: [
      {
        node: {
          url: "https://cdn/1.jpg",
          altText: null,
          width: 800,
          height: 1000,
        },
      },
    ],
  },
  variants: {
    edges: [
      {
        node: {
          id: "gid://shopify/ProductVariant/1",
          title: "P",
          availableForSale: true,
          price: { amount: "290.00", currencyCode: "BRL" },
          compareAtPrice: { amount: "350.00", currencyCode: "BRL" },
          selectedOptions: [{ name: "Tamanho", value: "P" }],
        },
      },
    ],
  },
};

describe("normalizeProduct", () => {
  it("maps a raw Shopify product onto the backend-agnostic shape", () => {
    const product = normalizeProduct(rawProduct);
    expect(product.productType).toBe("Quimonos");
    expect(product.priceRange.max.amount).toBe("320.00");
    expect(product.variants[0].compareAtPrice?.amount).toBe("350.00");
    expect(product.images[0]).toEqual({
      url: "https://cdn/1.jpg",
      altText: null,
      width: 800,
      height: 1000,
    });
    // The seam must not leak GraphQL connection shapes to the frontend.
    expect(JSON.stringify(product)).not.toContain("edges");
  });

  it("omits metafields entirely when the titular published none", () => {
    expect(normalizeProduct(rawProduct).metafields).toBeUndefined();
  });

  it("normalizes aliased aqv.* metafields, including a JSON size chart", () => {
    const product = normalizeProduct({
      ...rawProduct,
      sizeChart: {
        namespace: "aqv",
        key: "size_chart",
        type: "json",
        value: JSON.stringify([
          { Tamanho: "P", Busto: "96 cm" },
          { Tamanho: "M", Busto: "102 cm" },
        ]),
      },
      composition: {
        namespace: "aqv",
        key: "composition",
        type: "single_line_text_field",
        value: "100% algodão",
      },
      careInstructions: {
        namespace: "aqv",
        key: "care_instructions",
        type: "multi_line_text_field",
        value: "Lavar à mão",
      },
    });

    expect(product.metafields?.sizeChart).toEqual([
      { Tamanho: "P", Busto: "96 cm" },
      { Tamanho: "M", Busto: "102 cm" },
    ]);
    expect(product.metafields?.composition).toBe("100% algodão");
    expect(product.metafields?.careInstructions).toBe("Lavar à mão");
    expect(product.metafields?.fitNotes).toBeUndefined();
  });
});

describe("normalizeMetafields", () => {
  it("ignores other namespaces, empty values and malformed JSON", () => {
    const result = normalizeMetafields([
      {
        namespace: "shopify",
        key: "composition",
        value: "ignorado",
        type: "x",
      },
      { namespace: "aqv", key: "composition", value: "   ", type: "x" },
      { namespace: "aqv", key: "size_chart", value: "{not json", type: "json" },
      {
        namespace: "aqv",
        key: "size_chart",
        value: '"a string"',
        type: "json",
      },
      null,
    ]);
    expect(result?.composition).toBeNull();
    expect(result?.sizeChart).toBeUndefined();
  });

  it("drops non-string keys from size-chart rows and caps the list", () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      Tamanho: `T${index}`,
      extra: index,
    }));
    const result = normalizeMetafields([
      {
        namespace: "aqv",
        key: "size_chart",
        value: JSON.stringify(rows),
        type: "json",
      },
    ]);
    expect(result?.sizeChart).toHaveLength(20);
    expect(result?.sizeChart?.[0]).toEqual({ Tamanho: "T0", extra: "0" });
  });

  it("returns undefined when nothing valid was published", () => {
    expect(normalizeMetafields([])).toBeUndefined();
    expect(normalizeMetafields([null, undefined])).toBeUndefined();
  });
});

describe("pagination and collection normalizers", () => {
  it("normalizes page info, defaulting to a closed page", () => {
    expect(normalizePageInfo({})).toEqual({
      hasNextPage: false,
      endCursor: null,
    });
    expect(
      normalizePageInfo({
        pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
      })
    ).toEqual({
      hasNextPage: true,
      endCursor: "cursor-1",
    });
  });

  it("wraps a product connection into a page with a mode", () => {
    const page = normalizeProductPage({
      edges: [{ node: rawProduct }],
      pageInfo: { hasNextPage: true, endCursor: "abc" },
    });
    expect(page.products).toHaveLength(1);
    expect(page.pageInfo).toEqual({ hasNextPage: true, endCursor: "abc" });
    expect(page.mode).toBe("live");
  });

  it("describes the unconfigured store as an empty, non-error page", () => {
    expect(UNCONFIGURED_PAGE).toEqual({
      products: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      mode: "unconfigured",
    });
  });

  it("normalizes a collection without inventing a description or image", () => {
    expect(
      normalizeCollection({
        id: "1",
        handle: "bolsas",
        title: "Bolsas",
        description: "",
        image: null,
      })
    ).toEqual({
      id: "1",
      handle: "bolsas",
      title: "Bolsas",
      description: "",
      image: null,
    });
  });
});

describe("cart normalization", () => {
  const rawCart = {
    id: "gid://shopify/Cart/1",
    checkoutUrl: "https://loja.myshopify.com/checkout/abc",
    totalQuantity: 3,
    cost: {
      totalAmount: { amount: "390.00", currencyCode: "BRL" },
      subtotalAmount: { amount: "390.00", currencyCode: "BRL" },
    },
    lines: {
      edges: [
        {
          node: {
            id: "gid://shopify/CartLine/1",
            quantity: 3,
            cost: { totalAmount: { amount: "390.00", currencyCode: "BRL" } },
            merchandise: {
              id: "gid://shopify/ProductVariant/1",
              title: "M",
              price: { amount: "130.00", currencyCode: "BRL" },
              product: {
                handle: "camiseta-traco",
                title: "Camiseta Traço",
                images: {
                  edges: [
                    { node: { url: "https://cdn/1.jpg", altText: "Frente" } },
                  ],
                },
              },
            },
          },
        },
      ],
    },
  };

  it("appends channel=online_store exactly once, whatever the URL looks like", () => {
    expect(withChannelParam("https://loja.myshopify.com/checkout/abc")).toBe(
      "https://loja.myshopify.com/checkout/abc?channel=online_store"
    );
    expect(withChannelParam("https://loja.myshopify.com/checkout?x=1")).toBe(
      "https://loja.myshopify.com/checkout?x=1&channel=online_store"
    );
    expect(withChannelParam("")).toBe("");
  });

  it("normalizes lines, totals and the checkout URL", () => {
    const cart = normalizeCart(rawCart);
    expect(cart.itemCount).toBe(3);
    expect(cart.checkoutUrl).toContain("channel=online_store");
    expect(cart.items[0]).toMatchObject({
      lineId: "gid://shopify/CartLine/1",
      variantId: "gid://shopify/ProductVariant/1",
      productTitle: "Camiseta Traço",
      variantTitle: "M",
      quantity: 3,
    });
    expect(cart.items[0].unitPrice.amount).toBe("130.00");
    expect(cart.subtotal.amount).toBe("390.00");
  });
});
