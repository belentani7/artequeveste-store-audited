import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { safeSearchTerm } from "./routers/commerce";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

const fetchMock = vi.fn();

function configureShopify() {
  process.env.SHOPIFY_STORE_DOMAIN = "test.myshopify.com";
  process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN = "test-token";
}

function clearShopify() {
  delete process.env.SHOPIFY_STORE_DOMAIN;
  delete process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  configureShopify();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearShopify();
});

function ok(data: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ data }),
    text: async () => "",
  } as Response);
}

const rawVariant = {
  id: "gid://shopify/ProductVariant/1",
  title: "Default Title",
  availableForSale: true,
  price: { amount: "385.00", currencyCode: "BRL" },
  compareAtPrice: null,
  selectedOptions: [{ name: "Title", value: "Default Title" }],
};

const rawProduct = {
  id: "gid://shopify/Product/1",
  title: "Quimono Sombra",
  handle: "quimono-sombra",
  description: "Camada ampla",
  descriptionHtml: "<p>Camada ampla</p>",
  productType: "Quimonos",
  vendor: "Arte Que Veste",
  tags: ["aqv:categoria:quimonos"],
  options: [{ name: "Tamanho", values: ["P"] }],
  priceRange: {
    minVariantPrice: { amount: "385.00", currencyCode: "BRL" },
    maxVariantPrice: { amount: "385.00", currencyCode: "BRL" },
  },
  images: {
    edges: [
      {
        node: {
          url: "https://img/1.jpg",
          altText: null,
          width: 800,
          height: 1000,
        },
      },
    ],
  },
  variants: { edges: [{ node: rawVariant }] },
};

describe("commerce.products.list", () => {
  it("returns a paginated page with a mode instead of a bare array", async () => {
    ok({
      products: {
        edges: [{ node: rawProduct }],
        pageInfo: { hasNextPage: true, endCursor: "cursor-2" },
      },
    });

    const caller = appRouter.createCaller(makeCtx());
    const page = await caller.commerce.products.list({ first: 12 });

    expect(page.mode).toBe("live");
    expect(page.products).toHaveLength(1);
    expect(page.pageInfo).toEqual({ hasNextPage: true, endCursor: "cursor-2" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/2025-04\/graphql\.json$/);
    expect((init as RequestInit).headers).toMatchObject({
      "X-Shopify-Storefront-Access-Token": "test-token",
    });
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.variables).toMatchObject({
      first: 12,
      sortKey: "BEST_SELLING",
      reverse: false,
    });
    // The query must ask for the titular's merchandising metafields.
    expect(body.query).toContain("size_chart");
  });

  it("maps UI sort orders onto Shopify sort keys", async () => {
    const emptyPage = {
      products: {
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    };
    ok(emptyPage);
    ok(emptyPage);
    ok(emptyPage);
    const caller = appRouter.createCaller(makeCtx());

    await caller.commerce.products.list({ sort: "price-desc" });
    let body = JSON.parse(
      String((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body)
    );
    expect(body.variables).toMatchObject({ sortKey: "PRICE", reverse: true });

    await caller.commerce.products.list({ sort: "newest" });
    body = JSON.parse(
      String((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body)
    );
    expect(body.variables).toMatchObject({
      sortKey: "CREATED_AT",
      reverse: true,
    });

    await caller.commerce.products.list({ sort: "price-asc" });
    body = JSON.parse(
      String((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body)
    );
    expect(body.variables).toMatchObject({ sortKey: "PRICE", reverse: false });
  });

  it("answers with an honest empty page when Shopify is not connected", async () => {
    clearShopify();
    const caller = appRouter.createCaller(makeCtx());

    const page = await caller.commerce.products.list({ first: 4 });
    expect(page).toEqual({
      products: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      mode: "unconfigured",
    });
    expect(fetchMock).not.toHaveBeenCalled();

    const status = await caller.commerce.status();
    expect(status).toMatchObject({ mode: "unconfigured", storeDomain: null });
  });
});

describe("commerce.products.byHandle", () => {
  it("normalizes a product and never leaks raw GraphQL edges", async () => {
    ok({ productByHandle: rawProduct });

    const caller = appRouter.createCaller(makeCtx());
    const product = await caller.commerce.products.byHandle({
      handle: "quimono-sombra",
    });

    expect(product.title).toBe("Quimono Sombra");
    expect(JSON.stringify(product)).not.toContain("edges");
  });

  it("maps a missing handle to NOT_FOUND, and an unconnected store too", async () => {
    ok({ productByHandle: null });
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.commerce.products.byHandle({ handle: "nope" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    clearShopify();
    await expect(
      caller.commerce.products.byHandle({ handle: "nope" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("commerce.products.search", () => {
  it("reuses the catalog query with RELEVANCE ordering", async () => {
    ok({
      products: {
        edges: [{ node: rawProduct }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });

    const caller = appRouter.createCaller(makeCtx());
    const page = await caller.commerce.products.search({ term: "quimono" });

    expect(page.products).toHaveLength(1);
    const body = JSON.parse(
      String((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body)
    );
    expect(body.variables).toMatchObject({
      query: "quimono",
      sortKey: "RELEVANCE",
    });
  });

  it("strips Shopify search operators so a term can never become a query", () => {
    const parsed = safeSearchTerm.parse('tag:secret OR (title:*)"hidden"');
    expect(parsed).not.toMatch(/[:*()"]/);
    expect(parsed).toBe("tag secret OR title hidden");
  });

  it("keeps accents and normal words intact", () => {
    expect(safeSearchTerm.parse("Acessórios quimono")).toBe(
      "Acessórios quimono"
    );
  });

  it("rejects empty terms", () => {
    expect(() => safeSearchTerm.parse("   ")).toThrow();
  });
});

describe("commerce.collections", () => {
  it("returns collection metadata plus its first product page", async () => {
    ok({
      collection: {
        id: "gid://shopify/Collection/1",
        handle: "quimonos",
        title: "Quimonos",
        description: "",
        image: null,
        products: {
          edges: [{ node: rawProduct }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });

    const caller = appRouter.createCaller(makeCtx());
    const page = await caller.commerce.collections.page({
      handle: "quimonos",
      first: 6,
    });

    expect(page?.collection?.title).toBe("Quimonos");
    expect(page?.products).toHaveLength(1);
    const body = JSON.parse(
      String((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body)
    );
    expect(body.variables).toMatchObject({
      handle: "quimonos",
      first: 6,
      sortKey: "COLLECTION_DEFAULT",
    });
  });

  it("distinguishes an unknown collection (null) from an unconnected store", async () => {
    ok({ collection: null });
    const caller = appRouter.createCaller(makeCtx());
    expect(
      await caller.commerce.collections.page({ handle: "nao-existe" })
    ).toBeNull();

    clearShopify();
    const page = await caller.commerce.collections.page({ handle: "quimonos" });
    expect(page).toMatchObject({
      collection: null,
      products: [],
      mode: "unconfigured",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list (not an error) for collections when unconfigured", async () => {
    clearShopify();
    const caller = appRouter.createCaller(makeCtx());
    expect(await caller.commerce.collections.list()).toEqual([]);
  });
});

describe("commerce.cart", () => {
  it("creates a cart, normalizes lines, and appends channel=online_store", async () => {
    ok({
      cartCreate: {
        cart: {
          id: "gid://shopify/Cart/1",
          checkoutUrl: "https://test.myshopify.com/checkout/abc",
          totalQuantity: 2,
          cost: {
            totalAmount: { amount: "770.00", currencyCode: "BRL" },
            subtotalAmount: { amount: "770.00", currencyCode: "BRL" },
          },
          lines: {
            edges: [
              {
                node: {
                  id: "gid://shopify/CartLine/1",
                  quantity: 2,
                  cost: {
                    totalAmount: { amount: "770.00", currencyCode: "BRL" },
                  },
                  merchandise: {
                    id: rawVariant.id,
                    title: "Default Title",
                    price: { amount: "385.00", currencyCode: "BRL" },
                    product: {
                      handle: "quimono-sombra",
                      title: "Quimono Sombra",
                      images: {
                        edges: [
                          { node: { url: "https://img/1.jpg", altText: null } },
                        ],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        userErrors: [],
      },
    });

    const caller = appRouter.createCaller(makeCtx());
    const cart = await caller.commerce.cart.create({
      lines: [{ variantId: rawVariant.id, quantity: 2 }],
    });

    expect(cart.id).toBe("gid://shopify/Cart/1");
    expect(cart.itemCount).toBe(2);
    expect(cart.checkoutUrl).toMatch(/\?channel=online_store$/);
    expect(cart.items[0]).toMatchObject({
      lineId: "gid://shopify/CartLine/1",
      variantId: rawVariant.id,
      productHandle: "quimono-sombra",
      quantity: 2,
    });
  });

  it("treats quantity 0 as a line removal instead of a Shopify error", async () => {
    ok({
      cartLinesRemove: {
        cart: {
          id: "gid://shopify/Cart/1",
          checkoutUrl: "https://test.myshopify.com/checkout/abc",
          totalQuantity: 0,
          cost: {
            totalAmount: { amount: "0.00", currencyCode: "BRL" },
            subtotalAmount: { amount: "0.00", currencyCode: "BRL" },
          },
          lines: { edges: [] },
        },
        userErrors: [],
      },
    });

    const caller = appRouter.createCaller(makeCtx());
    const cart = await caller.commerce.cart.updateLines({
      cartId: "gid://shopify/Cart/1",
      lines: [{ lineId: "gid://shopify/CartLine/1", quantity: 0 }],
    });

    expect(cart?.itemCount).toBe(0);
    const body = JSON.parse(
      String((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body)
    );
    expect(body.query).toContain("cartLinesRemove");
  });

  it("maps Shopify userErrors onto a BAD_REQUEST TRPCError", async () => {
    ok({
      cartCreate: {
        cart: null,
        userErrors: [
          { message: "merchandise does not exist", field: ["lines"] },
        ],
      },
    });

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.commerce.cart.create({
        lines: [{ variantId: "gid://shopify/ProductVariant/999", quantity: 1 }],
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("merchandise does not exist"),
    });
  });

  it("propagates HTTP failures from catalog reads as INTERNAL_SERVER_ERROR", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({}),
      text: async () => "",
    } as Response);

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.commerce.products.list()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("refuses to fake a cart when the store is unconfigured", async () => {
    clearShopify();
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.commerce.cart.create({
        lines: [{ variantId: rawVariant.id, quantity: 1 }],
      })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("rejects oversized line quantities at the schema boundary", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.commerce.cart.create({
        lines: [{ variantId: rawVariant.id, quantity: 500 }],
      })
    ).rejects.toThrow();
  });
});
