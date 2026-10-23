/**
 * Commerce router — backend-agnostic tRPC surface for the storefront.
 *
 * The router is intentionally thin: zod validates input, then delegates to the
 * named functions exported from `server/_core/shopify`. If we ever swap
 * commerce backends, only `_core/shopify.ts` + `_core/shopifyNormalize.ts`
 * change — this router stays put.
 *
 * Read endpoints degrade honestly when Shopify is not connected yet (empty
 * page + `mode: "unconfigured"`), while cart mutations keep failing loudly:
 * you can never fake a checkout.
 */

import { z } from "zod";
import { PRODUCT_SORTS } from "@shared/commerce/types";
import {
  addCartLines,
  createCart,
  getCart,
  getCollectionByHandle,
  getCollectionPage,
  getProductByHandle,
  getStorefrontStatus,
  listCollections,
  listProductPage,
  removeCartLines,
  updateCartLines,
} from "../_core/shopify";
import { publicProcedure, router } from "../_core/trpc";
import { sanitizeText } from "../../shared/pvcu";

const safeId = z.string().trim().min(1).max(220).transform(sanitizeText);
const safeHandle = z.string().trim().min(1).max(180).transform(sanitizeText);

/**
 * Search terms are user input that ends up inside a Shopify `query` string.
 * Shopify's search syntax has operators (`:` `-` `*` `(` `)`) and quoting, so
 * the terms are stripped of those characters instead of being passed through:
 * a shopper searching for "vestido:3XL" gets a literal search, never a query
 * injection into the merchant's catalog.
 */
export const safeSearchTerm = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform(value =>
    sanitizeText(value)
      .replace(/[\\:*()"'`~^[\]{}=!<>&|+,\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  )
  .refine(value => value.length > 0, { message: "Search term must contain searchable text" });

const cartLineInputSchema = z.object({
  variantId: safeId,
  quantity: z.number().int().min(1).max(99),
});

const cartLineUpdateSchema = z.object({
  lineId: safeId,
  /** 0 means "remove this line" — the route forwards to removeLines. */
  quantity: z.number().int().min(0).max(99),
});

const sortSchema = z.enum(PRODUCT_SORTS).optional();

const listingInputSchema = z
  .object({
    first: z.number().int().min(1).max(60).optional(),
    after: z.string().trim().max(512).optional(),
    query: safeSearchTerm.optional(),
    sort: sortSchema,
    collectionHandle: safeHandle.optional(),
  })
  .optional();

export const commerceRouter = router({
  /**
   * Connection state of the commerce backend. The UI uses it to separate
   * "catalog not published yet" (branded launch state) from "backend replied
   * with an error" (retry UI) without ever inventing products.
   */
  status: publicProcedure.query(() => getStorefrontStatus()),

  products: router({
    list: publicProcedure.input(listingInputSchema).query(async ({ input }) => {
      return listProductPage(input ?? {});
    }),
    byHandle: publicProcedure
      .input(z.object({ handle: safeHandle }))
      .query(async ({ input }) => {
        return getProductByHandle(input.handle);
      }),
    /**
     * Catalog search. With an empty term this is just a listing, which is
     * what the search page shows before the shopper types anything.
     */
    search: publicProcedure
      .input(
        z.object({
          term: safeSearchTerm,
          first: z.number().int().min(1).max(60).optional(),
          after: z.string().trim().max(512).optional(),
          sort: sortSchema,
        })
      )
      .query(async ({ input }) => {
        return listProductPage({
          query: input.term,
          first: input.first,
          after: input.after,
          sort: input.sort ?? "relevance",
        });
      }),
  }),
  collections: router({
    list: publicProcedure
      .input(
        z
          .object({ first: z.number().int().min(1).max(50).optional() })
          .optional()
      )
      .query(async ({ input }) => {
        return listCollections(input?.first);
      }),
    byHandle: publicProcedure
      .input(z.object({ handle: safeHandle }))
      .query(async ({ input }) => {
        return getCollectionByHandle(input.handle);
      }),
    /** Collection metadata + first product page in a single round trip. */
    page: publicProcedure
      .input(
        z.object({
          handle: safeHandle,
          first: z.number().int().min(1).max(60).optional(),
          after: z.string().trim().max(512).optional(),
          sort: sortSchema,
        })
      )
      .query(async ({ input }) => {
        const page = await getCollectionPage(input.handle, {
          first: input.first,
          after: input.after,
          sort: input.sort,
        });
        return page;
      }),
  }),
  cart: router({
    create: publicProcedure
      .input(z.object({ lines: z.array(cartLineInputSchema).min(1).max(50) }))
      .mutation(async ({ input }) => {
        return createCart(input.lines);
      }),
    get: publicProcedure
      .input(z.object({ cartId: z.string().min(1).max(512) }))
      .query(async ({ input }) => {
        return getCart(input.cartId);
      }),
    addLines: publicProcedure
      .input(
        z.object({
          cartId: z.string().min(1).max(512),
          lines: z.array(cartLineInputSchema).min(1).max(50),
        })
      )
      .mutation(async ({ input }) => {
        return addCartLines(input.cartId, input.lines);
      }),
    updateLines: publicProcedure
      .input(
        z.object({
          cartId: z.string().min(1).max(512),
          lines: z.array(cartLineUpdateSchema).min(1).max(50),
        })
      )
      .mutation(async ({ input }) => {
        // qty 0 means "remove this line" — split the request so the client
        // never has to call two procedures for a single user gesture.
        const toRemove = input.lines
          .filter(l => l.quantity === 0)
          .map(l => l.lineId);
        const toUpdate = input.lines.filter(l => l.quantity > 0);

        let cart = null;
        if (toUpdate.length) {
          cart = await updateCartLines(input.cartId, toUpdate);
        }
        if (toRemove.length) {
          cart = await removeCartLines(input.cartId, toRemove);
        }
        if (!cart) cart = await getCart(input.cartId);
        return cart;
      }),
    removeLines: publicProcedure
      .input(
        z.object({
          cartId: z.string().min(1).max(512),
          lineIds: z.array(safeId).min(1).max(50),
        })
      )
      .mutation(async ({ input }) => {
        return removeCartLines(input.cartId, input.lineIds);
      }),
  }),
});

export type CommerceRouter = typeof commerceRouter;
