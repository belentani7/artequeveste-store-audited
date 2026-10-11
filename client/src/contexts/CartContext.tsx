import { trpc } from "@/lib/trpc";
import { STORAGE_KEYS } from "@shared/const";
import type { Cart } from "@shared/commerce/types";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

function readStoredCartId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredCartId(value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(CART_STORAGE_KEY, value);
    else window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Storage blocked (private mode): the cart simply won't survive a reload.
  }
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

  // Serialises cart writes: add/update/remove calls run one after another so
  // the Shopify cart cannot receive two conflicting line updates at once.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task, task);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

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
        const currentCartId = readStoredCartId();
        if (!currentCartId) {
          const created = await enqueue(() =>
            utils.client.commerce.cart.create.mutate({
              lines: [{ variantId, quantity }],
            })
          );
          setCart(created);
          setCartId(created.id);
          writeStoredCartId(created.id);
        } else {
          const updated = await enqueue(() =>
            utils.client.commerce.cart.addLines.mutate({
              cartId: currentCartId,
              lines: [{ variantId, quantity }],
            })
          );
          setCart(updated);
          if (!cartId) setCartId(currentCartId);
        }
        setIsOpen(true);
      } catch (err) {
        setError(toFriendlyMessage(err));
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [cartId, enqueue, utils.client]
  );

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      const currentCartId = readStoredCartId();
      if (!currentCartId) return;
      setLoading(true);
      setError(null);
      try {
        const updated = await enqueue(() =>
          utils.client.commerce.cart.updateLines.mutate({
            cartId: currentCartId,
            // quantity 0 is interpreted server-side as "remove this line".
            lines: [{ lineId, quantity: Math.max(0, quantity) }],
          })
        );
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
      const currentCartId = readStoredCartId();
      if (!currentCartId) return;
      setLoading(true);
      setError(null);
      try {
        const updated = await enqueue(() =>
          utils.client.commerce.cart.removeLines.mutate({
            cartId: currentCartId,
            lineIds: [lineId],
          })
        );
        setCart(updated);
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
