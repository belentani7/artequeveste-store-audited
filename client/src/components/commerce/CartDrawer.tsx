import { useEffect, useRef } from "react";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/format";

export default function CartDrawer() {
  const { cart, isOpen, closeCart, updateQuantity, removeItem, proceedToCheckout, loading } = useCart();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeCart(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeCart, isOpen]);
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 bg-black/50" onClick={closeCart}>
    <aside role="dialog" aria-modal="true" aria-label="Carrinho de compras" className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-[var(--aqv-paper)] p-5 shadow-2xl md:p-7" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-[var(--aqv-line)] pb-5"><div><p className="aqv-kicker">Sua seleção</p><h2 className="mt-2 font-display text-4xl tracking-[-0.06em]">Carrinho</h2></div><button ref={closeButtonRef} aria-label="Fechar carrinho" onClick={closeCart} className="p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--aqv-accent)] focus-visible:outline-offset-3"><X size={20} /></button></div>
      <div className="flex-1 space-y-5 overflow-y-auto py-6">{!cart?.items.length ? <p className="border border-dashed border-[var(--aqv-line)] p-5 text-sm text-[var(--aqv-muted)]">Seu carrinho está vazio.</p> : cart.items.map((item) => <div key={item.lineId} className="flex gap-3 border-b border-[var(--aqv-line)] pb-5">{item.image ? <img src={item.image.url} alt={item.image.altText ?? item.productTitle} className="h-24 w-[76px] object-cover" /> : <div className="h-24 w-[76px] bg-[var(--aqv-surface-2)]" />}<div className="flex-1"><h3 className="text-sm font-medium">{item.productTitle}</h3><p className="mt-1 text-sm text-[var(--aqv-muted)]">{item.variantTitle}</p><p className="mt-1 text-sm">{formatMoney(item.unitPrice)}</p><div className="mt-4 flex items-center gap-2"><button aria-label="Diminuir quantidade" className="h-7 w-7 border border-[var(--aqv-line)]" onClick={() => updateQuantity(item.lineId, item.quantity - 1)} disabled={loading}><Minus size={12} className="mx-auto" /></button><span className="w-5 text-center text-sm">{item.quantity}</span><button aria-label="Aumentar quantidade" className="h-7 w-7 border border-[var(--aqv-line)]" onClick={() => updateQuantity(item.lineId, item.quantity + 1)} disabled={loading}><Plus size={12} className="mx-auto" /></button><button className="ml-2 text-[10px] uppercase tracking-[0.1em] text-[var(--aqv-muted)]" onClick={() => removeItem(item.lineId)}>Remover</button></div></div></div>)}</div>
      <div className="space-y-4 border-t border-[var(--aqv-line)] pt-5"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>{cart ? formatMoney(cart.subtotal) : "R$ 0,00"}</strong></div><p className="text-xs text-[var(--aqv-muted)]">Frete e pagamento são calculados no checkout.</p><button className="flex h-12 w-full items-center justify-center gap-3 bg-[var(--aqv-ink)] text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)] disabled:opacity-50" disabled={!cart?.itemCount || loading} onClick={proceedToCheckout}>Finalizar compra <ArrowRight size={15} /></button></div>
    </aside>
  </div>;
}
