import { useEffect, useRef } from "react";
import {
  AlertCircle,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/format";

/**
 * Cart drawer.
 *
 * Accessibility work that the previous version was missing:
 *   - focus is moved into the dialog on open and returned to the trigger on
 *     close (otherwise keyboard users lose their place in the page);
 *   - Tab is trapped inside the dialog, and Escape / backdrop click close it;
 *   - the background becomes `inert`, so screen readers and the tab order do
 *     not walk into the storefront behind an open modal;
 *   - failures are announced in a live region instead of silently reverting a
 *     quantity, which used to look like the click "did nothing".
 */
export default function CartDrawer() {
  const {
    cart,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    proceedToCheckout,
    loading,
    error,
    clearError,
  } = useCart();
  const asideRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const root = document.getElementById("root");
    const siblings = root ? Array.from(root.children) : [];
    siblings.forEach(node => {
      if (node !== containerRef.current && "inert" in node) {
        (node as HTMLElement & { inert: boolean }).inert = true;
      }
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeCart();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = asideRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      siblings.forEach(node => {
        if ("inert" in node)
          (node as HTMLElement & { inert: boolean }).inert = false;
      });
      previouslyFocused.current?.focus?.();
    };
  }, [closeCart, isOpen]);

  if (!isOpen) return null;

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/50"
      onClick={closeCart}
      // The backdrop is decorative: it must not become a tab stop of its own.
      aria-hidden="false"
    >
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
        aria-describedby="aqv-cart-status"
        className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-[var(--aqv-paper)] p-5 shadow-2xl md:p-7"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[var(--aqv-line)] pb-5">
          <div>
            <p className="aqv-kicker">Sua seleção</p>
            <h2 className="mt-2 font-display text-4xl tracking-[-0.06em]">
              Carrinho
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fechar carrinho"
            onClick={closeCart}
            className="p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--aqv-accent)] focus-visible:outline-offset-3"
          >
            <X size={20} />
          </button>
        </div>

        <p
          id="aqv-cart-status"
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {isEmpty
            ? "Carrinho vazio"
            : `${cart?.itemCount ?? 0} itens no carrinho`}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 border border-[var(--aqv-accent)] bg-[var(--aqv-surface)] p-3 text-xs"
          >
            <AlertCircle
              size={15}
              className="mt-0.5 shrink-0 text-[var(--aqv-accent)]"
              aria-hidden="true"
            />
            <p className="flex-1 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="text-[10px] uppercase underline underline-offset-2"
            >
              Fechar aviso
            </button>
          </div>
        )}

        <div className="flex-1 space-y-5 overflow-y-auto py-6">
          {isEmpty ? (
            <div className="border border-dashed border-[var(--aqv-line)] p-6 text-center">
              <ShoppingBag
                className="mx-auto text-[var(--aqv-muted)]"
                size={22}
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-[var(--aqv-muted)]">
                Seu carrinho está vazio.
              </p>
              <p className="mt-2 text-xs text-[var(--aqv-muted)]">
                Escolha uma peça do catálogo para começar — o tamanho é
                selecionado na página do produto.
              </p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.lineId}
                className="flex gap-3 border-b border-[var(--aqv-line)] pb-5"
              >
                {item.image ? (
                  <img
                    src={item.image.url}
                    alt={item.image.altText ?? item.productTitle}
                    className="h-24 w-[76px] object-cover"
                  />
                ) : (
                  <div
                    className="h-24 w-[76px] bg-[var(--aqv-surface-2)]"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">
                    {item.productTitle}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--aqv-muted)]">
                    {item.variantTitle}
                  </p>
                  <p className="mt-1 text-sm">
                    {formatMoney(item.unitPrice)}
                    {item.quantity > 1 && (
                      <span className="ml-2 text-xs text-[var(--aqv-muted)]">
                        total {formatMoney(item.lineTotal)}
                      </span>
                    )}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${item.productTitle}`}
                      className="h-7 w-7 border border-[var(--aqv-line)] disabled:opacity-40"
                      onClick={() =>
                        updateQuantity(item.lineId, item.quantity - 1)
                      }
                      disabled={loading}
                    >
                      <Minus size={12} className="mx-auto" aria-hidden="true" />
                    </button>
                    <span
                      className="w-5 text-center text-sm"
                      aria-hidden="true"
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Aumentar quantidade de ${item.productTitle}`}
                      className="h-7 w-7 border border-[var(--aqv-line)] disabled:opacity-40"
                      onClick={() =>
                        updateQuantity(item.lineId, item.quantity + 1)
                      }
                      disabled={loading || item.quantity >= 99}
                    >
                      <Plus size={12} className="mx-auto" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="ml-2 text-[10px] uppercase tracking-[0.1em] text-[var(--aqv-muted)] hover:text-[var(--aqv-accent)]"
                      onClick={() => removeItem(item.lineId)}
                      disabled={loading}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 border-t border-[var(--aqv-line)] pt-5">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <strong>
              {cart ? formatMoney(cart.subtotal) : formatMoney(0)}
            </strong>
          </div>
          <p className="text-xs text-[var(--aqv-muted)]">
            Frete, prazo e formas de pagamento são calculados no checkout. Nada
            de valor inventado aqui.
          </p>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-3 bg-[var(--aqv-ink)] text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)] disabled:opacity-50"
            disabled={isEmpty || loading}
            onClick={proceedToCheckout}
          >
            Finalizar compra <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </div>
  );
}
