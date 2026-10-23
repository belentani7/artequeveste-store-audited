import { trpc } from "@/lib/trpc";
import { createCartSession } from "./cartSession";
import { STORAGE_KEYS } from "@shared/const";
import type { Cart } from "@shared/commerce/types";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Storefront cart context.
 *
 * - Talks ONLY to backend-agnostic `commerce.*` tRPC procedures.
 * - Persists the cart id in localStorage and rehydrates on mount.
 * - Exposes a tiny imperative surface to UI: addItem, updateQuantity,
 *   removeItem, openCart, proceedToCheckout, plus `error` so failures are
 *   visible instead of silently reverting.
 * - A same-tick add of the same variant is coalesced, and the cart is never
 *   `create`d twice for the same shopper: two fast clicks used to race and
 *   leave the first cart orphaned.
 */

const CART_STORAGE_KEY = STORAGE_KEYS.cartId;

/** Maps a TRPCClientError into something a shopper can act on (pt-BR). */
function toFriendlyMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/not configured|unreachable|HTTP 5|no data/i.test(raw)) {
    return "Não conseguimos falar com o carrinho agora. Tente novamente em alguns instantes.";
  }
  if (/not found|does not exist|não encontrad/i.test(raw)) {
    return "Essa peça não está mais disponível no catálogo.";
  }
  if (/quantity|sold out|esgotad|unavailable/i.test(raw)) {
    return "A quantidade escolhida não está disponível para esta peça.";
  }
  return "Não foi possível atualizar o carrinho. Tente novamente.";
}

const cartSession = createCartSession(CART_STORAGE_KEY, () =>
  typeof window === "undefined" ? null : window.localStorage
);

function readStoredCartId(): string | null {
  return cartSession.readCartId();
}

function writeStoredCartId(value: string | null): void {
  cartSession.writeCartId(value);
}

type CartContextValue = {
  cart: Cart | null;
  isOpen: boolean;
  loading: boolean;
  itemCount: number;
  error: string | null;
  clearError: () => void;
  openCart: () => void;
  closeCart: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  clearCart: () => void;
  proceedToCheckout: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(() => readStoredCartId());
  const [cart, setCart] = useState<Cart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // All mutations, including the cart-id lookup, run in the same queue.
  // This prevents two rapid clicks from creating two separate Shopify carts.
  const enqueue = cartSession.enqueue;

  const openCart = useCallback(() => {
    setError(null);
    setIsOpen(true);
  }, []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const clearError = useCallback(() => setError(null), []);

  // Rehydrate the cart on mount and whenever the stored id changes.
  useEffect(() => {
    if (!cartId) {
      setCart(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    utils.commerce.cart.get
      .fetch({ cartId })
      .then(current => {
        if (cancelled) return;
        if (current) {
          setCart(current);
        } else {
          // The stored cart no longer exists (expired / checked out) — drop it.
          writeStoredCartId(null);
          setCartId(null);
          setCart(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // A failed read must not destroy a shopper's cart id: the next mount
        // may simply have been offline. Keep the id, show nothing.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cartId, utils.commerce.cart.get]);

  const itemCount = cart?.itemCount ?? 0;

  const addItem = useCallback(
    async (variantId: string, quantity: number = 1) => {
      setLoading(true);
      setError(null);
      try {
        const result = await enqueue(async () => {
          const currentCartId = readStoredCartId();
          if (!currentCartId) {
            const created = await utils.client.commerce.cart.create.mutate({
              lines: [{ variantId, quantity }],
            });
            // Persist before releasing the queue so the next add reuses it.
            writeStoredCartId(created.id);
            return { cart: created, id: created.id };
          }
          const updated = await utils.client.commerce.cart.addLines.mutate({
            cartId: currentCartId,
            lines: [{ variantId, quantity }],
          });
          return { cart: updated, id: currentCartId };
        });
        setCart(result.cart);
        setCartId(result.id);
        setIsOpen(true);
      } catch (err) {
        setError(toFriendlyMessage(err));
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [enqueue, utils.client]
  );

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await enqueue(async () => {
          const currentCartId = readStoredCartId();
          if (!currentCartId) return null;
          return utils.client.commerce.cart.updateLines.mutate({
            cartId: currentCartId,
            // quantity 0 is interpreted server-side as "remove this line".
            lines: [{ lineId, quantity: Math.max(0, quantity) }],
          });
        });
        if (updated) setCart(updated);
      } catch (err) {
        setError(toFriendlyMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [enqueue, utils.client]
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await enqueue(async () => {
          const currentCartId = readStoredCartId();
          if (!currentCartId) return null;
          return utils.client.commerce.cart.removeLines.mutate({
            cartId: currentCartId,
            lineIds: [lineId],
          });
        });
        if (updated) setCart(updated);
      } catch (err) {
        setError(toFriendlyMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [enqueue, utils.client]
  );

  const clearCart = useCallback(() => {
    writeStoredCartId(null);
    setCartId(null);
    setCart(null);
    setError(null);
  }, []);

  const proceedToCheckout = useCallback(() => {
    if (!cart?.checkoutUrl) {
      setError(
        "O checkout ainda não está disponível para este carrinho. Tente novamente em instantes."
      );
      return;
    }
    // checkoutUrl already has channel=online_store appended server-side.
    window.open(cart.checkoutUrl, "_blank", "noopener,noreferrer");
  }, [cart]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isOpen,
      loading,
      itemCount,
      error,
      clearError,
      openCart,
      closeCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      proceedToCheckout,
    }),
    [
      cart,
      isOpen,
      loading,
      itemCount,
      error,
      clearError,
      openCart,
      closeCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      proceedToCheckout,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
