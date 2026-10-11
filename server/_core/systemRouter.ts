import { z } from "zod";
import { publicProcedure, router } from "./trpc";

/**
 * System router — deliberately tiny.
 *
 * The template shipped `notifyOwner` (an admin-only call into a proprietary
 * notification service) and a scheduled-heartbeat helper. Neither belongs in a
 * storefront: order notifications must come from Shopify's own webhooks, not
 * from a hand-rolled endpoint, and the heartbeat API was never registered.
 * What remains is a single health probe the UI/monitoring can call.
 */
export const systemRouter = router({
  health: publicProcedure
    .input(
      z
        .object({
          timestamp: z
            .number()
            .min(0, "timestamp cannot be negative")
            .optional(),
        })
        .optional()
    )
    .query(() => ({ ok: true, service: "artequeveste-store" }) as const),
});
