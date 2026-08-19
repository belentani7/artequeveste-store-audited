import { AlertCircle, ArrowLeft, ShoppingBag } from "lucide-react";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import CartDrawer from "@/components/commerce/CartDrawer";

export default function NotFound() {
  const { itemCount, openCart } = useCart();
  return (
    <div className="min-h-screen bg-[var(--aqv-paper)] text-[var(--aqv-ink)]">
      <div className="aqv-topline">Envio para todo o Brasil · frete calculado no checkout</div>
      <header className="border-b border-[var(--aqv-line)] bg-[var(--aqv-paper)]">
        <div className="aqv-container flex h-[72px] items-center justify-between">
          <Link href="/" className="aqv-wordmark">ARTE QUE VESTE</Link>
          <nav className="hidden gap-7 text-[10px] uppercase tracking-[0.16em] md:flex" aria-label="Navegação principal">
            <a href="/#catalogo">Roupas</a><a href="/#categorias">Categorias</a><a href="/#informacoes">Ajuda</a>
          </nav>
          <button aria-label={`Abrir carrinho${itemCount ? `, ${itemCount} itens` : ""}`} onClick={openCart} className="relative p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--aqv-accent)] focus-visible:outline-offset-3">
            <ShoppingBag size={19} />{itemCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-[var(--aqv-accent)] px-1 text-[9px] text-white">{itemCount}</span>}
          </button>
        </div>
      </header>
      <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
        <section className="relative w-full max-w-xl overflow-hidden border border-[var(--aqv-ink)] bg-[var(--aqv-surface)] p-8 text-center shadow-[10px_10px_0_var(--aqv-accent)] md:p-12" aria-labelledby="not-found-title">
          <div className="pointer-events-none absolute inset-4 border border-[var(--aqv-ink)]/15" />
          <div className="relative mx-auto mb-7 grid h-16 w-16 place-items-center border border-[var(--aqv-accent)] text-[var(--aqv-accent)]"><AlertCircle className="h-7 w-7" /></div>
          <p className="relative aqv-kicker text-[var(--aqv-accent)]">Arte Que Veste / rota ausente</p>
          <h1 id="not-found-title" className="relative mt-3 font-display text-8xl leading-none tracking-[-0.08em]">404</h1>
          <h2 className="relative mt-4 font-display text-3xl tracking-[-0.06em]">Esta página saiu do caminho.</h2>
          <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--aqv-muted)]">O endereço que você procurou não está disponível. Volte para a loja e continue sua caminhada pela coleção.</p>
          <Link href="/" className="relative mt-8 inline-flex items-center gap-2 bg-[var(--aqv-ink)] px-6 py-4 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--aqv-accent)] focus-visible:outline-offset-4"><ArrowLeft className="h-4 w-4" /> Voltar para a loja</Link>
        </section>
      </main>
      <footer className="bg-[var(--aqv-ink)] py-8 text-white"><div className="aqv-container text-[10px] uppercase tracking-[0.13em] text-white/55">ARTE QUE VESTE / 2026</div></footer>
      <CartDrawer />
    </div>
  );
}
