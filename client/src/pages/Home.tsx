import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Instagram, Menu, ShoppingBag, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@shared/commerce/types";

const categories = ["Todos", "Camisetas", "Quimonos", "Bolsas", "Canecas", "Souvenires"];

function ProductCard({ product }: { product: Product }) {
  const { addItem, loading } = useCart();
  const variant = product.variants[0];
  const image = product.images[0];

  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-[#e4d7c6] bg-[#fbf7f0] shadow-[0_12px_40px_rgba(56,43,28,0.06)] transition-transform duration-200 hover:-translate-y-1">
      <a href={`/produto/${product.handle}`} className="block aspect-[4/5] overflow-hidden bg-[#e7ded1]">
        {image ? (
          <img src={image.url} alt={image.altText ?? product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#786b5e]">Imagem em preparação</div>
        )}
      </a>
      <div className="space-y-4 p-5">
        <div>
          <p className="mb-2 text-[0.68rem] uppercase tracking-[0.22em] text-[#827466]">{product.productType || "Arte Que Veste"}</p>
          <h3 className="font-serif text-2xl leading-tight text-[#241f1a]">{product.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#6f6256]">{product.description}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold text-[#241f1a]">{formatMoney(product.priceRange.min)}</span>
          <Button className="rounded-full bg-[#155f65] px-4 text-white hover:bg-[#0e4d52]" disabled={!variant?.availableForSale || loading} onClick={() => variant && addItem(variant.id)}>
            {variant?.availableForSale ? "Adicionar" : "Indisponível"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function CartDrawer() {
  const { cart, isOpen, closeCart, updateQuantity, removeItem, proceedToCheckout, loading } = useCart();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#241f1a]/35" onClick={closeCart}>
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#fbf7f0] p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#e4d7c6] pb-5">
          <div><p className="text-xs uppercase tracking-[0.2em] text-[#827466]">Sua seleção</p><h2 className="font-serif text-3xl text-[#241f1a]">Carrinho</h2></div>
          <button aria-label="Fechar carrinho" onClick={closeCart} className="rounded-full p-2 text-[#5e5145] hover:bg-[#efe6da]"><X size={20} /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto py-6">
          {!cart?.items.length ? <div className="rounded-2xl bg-[#f0e8dc] p-5 text-sm leading-relaxed text-[#6f6256]">Seu carrinho está vazio. Escolha uma peça para começar.</div> : cart.items.map(item => (
            <div key={item.lineId} className="flex gap-3 border-b border-[#e4d7c6] pb-4">
              {item.image ? <img src={item.image.url} alt={item.image.altText ?? item.productTitle} className="h-20 w-16 rounded-xl object-cover" /> : <div className="h-20 w-16 rounded-xl bg-[#e7ded1]" />}
              <div className="min-w-0 flex-1"><h3 className="font-medium text-[#241f1a]">{item.productTitle}</h3><p className="mt-1 text-sm text-[#6f6256]">{formatMoney(item.unitPrice)}</p><div className="mt-3 flex items-center gap-2"><button className="h-7 w-7 rounded-full border border-[#cdbca7]" onClick={() => updateQuantity(item.lineId, item.quantity - 1)} disabled={loading}>−</button><span className="w-5 text-center text-sm">{item.quantity}</span><button className="h-7 w-7 rounded-full border border-[#cdbca7]" onClick={() => updateQuantity(item.lineId, item.quantity + 1)} disabled={loading}>+</button><button className="ml-2 text-xs text-[#8a3d32]" onClick={() => removeItem(item.lineId)}>Remover</button></div></div>
            </div>
          ))}
        </div>
        <div className="space-y-4 border-t border-[#e4d7c6] pt-5"><div className="flex justify-between text-base"><span>Subtotal</span><strong>{cart ? formatMoney(cart.subtotal) : "R$ 0,00"}</strong></div><p className="text-xs leading-relaxed text-[#827466]">O frete e as opções de pagamento serão calculados no checkout.</p><Button className="w-full rounded-full bg-[#155f65] py-6 text-white hover:bg-[#0e4d52]" disabled={!cart?.itemCount || loading} onClick={proceedToCheckout}>Ir para o checkout <ArrowRight size={16} /></Button></div>
      </aside>
    </div>
  );
}

export default function Home() {
  const [category, setCategory] = useState("Todos");
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const { data: products = [], isLoading } = trpc.commerce.products.list.useQuery({ first: 24 });
  const filtered = useMemo(() => category === "Todos" ? products : products.filter(product => (product.productType ?? "").toLowerCase().includes(category.toLowerCase().slice(0, -1))), [category, products]);

  return (
    <div className="min-h-screen bg-[#f7f1e8] text-[#241f1a]">
      <div className="bg-[#155f65] px-4 py-2 text-center text-[0.68rem] uppercase tracking-[0.2em] text-[#f8eee1]">Arte que carrega história · Enviamos para todo o Brasil</div>
      <header className="sticky top-0 z-30 border-b border-[#e4d7c6]/80 bg-[#f7f1e8]/95 backdrop-blur">
        <div className="container flex h-20 items-center justify-between gap-5">
          <a href="#inicio" className="font-serif text-2xl tracking-tight text-[#155f65]">Arte Que Veste<span className="text-[#c47a3d]">.</span></a>
          <nav className={`${menuOpen ? "absolute left-0 right-0 top-20 flex bg-[#f7f1e8] p-5 shadow-xl" : "hidden"} flex-col gap-5 text-sm text-[#5e5145] md:static md:flex md:flex-row md:bg-transparent md:p-0 md:shadow-none`}>
            <a href="#colecao" onClick={() => setMenuOpen(false)} className="hover:text-[#155f65]">Coleção</a><a href="#historia" onClick={() => setMenuOpen(false)} className="hover:text-[#155f65]">Nossa história</a><a href="#cuidados" onClick={() => setMenuOpen(false)} className="hover:text-[#155f65]">Envios e trocas</a>
          </nav>
          <div className="flex items-center gap-2"><button className="hidden rounded-full p-2 text-[#155f65] sm:block" aria-label="Instagram"><Instagram size={18} /></button><button className="relative rounded-full p-2 text-[#155f65]" aria-label="Abrir carrinho" onClick={openCart}><ShoppingBag size={20} />{itemCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#c47a3d] text-[0.65rem] font-bold text-white">{itemCount}</span>}</button><button className="rounded-full p-2 md:hidden" aria-label="Abrir menu" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
        </div>
      </header>

      <main>
        <section id="inicio" className="container grid gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div className="max-w-2xl"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cdbca7] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#6f6256]"><Sparkles size={14} className="text-[#c47a3d]" /> Arte para vestir e lembrar</div><h1 className="font-serif text-5xl leading-[0.98] tracking-tight text-[#241f1a] md:text-7xl">A cultura que você veste, a história que você leva.</h1><p className="mt-7 max-w-xl text-lg leading-relaxed text-[#6f6256]">Peças inspiradas na força gráfica da xilogravura nordestina, criadas para transformar o cotidiano em memória.</p><div className="mt-9 flex flex-wrap gap-3"><a href="#colecao"><Button className="rounded-full bg-[#155f65] px-6 py-6 text-white hover:bg-[#0e4d52]">Conheça a coleção <ArrowRight size={17} /></Button></a><a href="#historia"><Button variant="outline" className="rounded-full border-[#bba893] bg-transparent px-6 py-6 text-[#155f65] hover:bg-[#efe6da]">A nossa história</Button></a></div></div>
          <div className="relative min-h-[390px] overflow-hidden rounded-[2rem] bg-[#155f65] p-8 text-[#f8eee1] shadow-[0_22px_70px_rgba(21,95,101,0.2)]"><div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[34px] border-[#c47a3d]/50" /><div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full border-[45px] border-[#f0c79c]/15" /><div className="relative flex h-full flex-col justify-end"><p className="max-w-[18rem] font-serif text-4xl leading-tight">Da mão, do território e da imaginação.</p><p className="mt-5 max-w-sm text-sm leading-relaxed text-[#d7e3df]">Uma experiência digital criada para aproximar arte sergipana e cotidiano brasileiro.</p></div></div>
        </section>

        <section id="colecao" className="bg-[#efe6da] py-16 md:py-24"><div className="container"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs uppercase tracking-[0.22em] text-[#827466]">Escolhas com significado</p><h2 className="mt-3 font-serif text-4xl text-[#241f1a] md:text-5xl">A coleção</h2></div><div className="flex flex-wrap gap-2">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-4 py-2 text-xs transition ${category === item ? "border-[#155f65] bg-[#155f65] text-white" : "border-[#cdbca7] text-[#6f6256] hover:border-[#155f65] hover:text-[#155f65]"}`}>{item}</button>)}</div></div><div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{isLoading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-[1.5rem] bg-[#e1d4c4]" />) : filtered.length ? filtered.map(product => <ProductCard key={product.id} product={product} />) : <div className="col-span-full rounded-[1.5rem] border border-dashed border-[#cdbca7] bg-[#f7f1e8] p-10 text-center"><h3 className="font-serif text-3xl">A coleção está sendo preparada.</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#6f6256]">Os produtos reais, imagens, preços e estoque serão publicados pelo proprietário após a configuração do catálogo.</p></div>}</div></div></section>

        <section id="historia" className="container grid gap-10 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24"><div><p className="text-xs uppercase tracking-[0.22em] text-[#827466]">Mais que um produto</p><h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">Uma imagem também pode ser uma memória.</h2></div><div className="space-y-5 text-lg leading-relaxed text-[#6f6256]"><p>A Arte Que Veste aproxima a linguagem da xilogravura nordestina do cotidiano. A proposta é simples: fazer com que a arte circule, acompanhe pessoas e inicie novas conversas.</p><p>O projeto se relaciona ao trabalho do Mestre Nivaldo Oliveira, em São Cristóvão/SE. Cada referência deve ser apresentada com respeito, contexto e verdade, valorizando a mão, o lugar e a história por trás da imagem.</p><p className="border-l-2 border-[#c47a3d] pl-5 font-serif text-2xl text-[#241f1a]">Vestir uma imagem também é escolher uma memória.</p></div></section>

        <section id="cuidados" className="border-y border-[#e4d7c6] bg-[#f7f1e8] py-14"><div className="container grid gap-8 md:grid-cols-3"><div><p className="text-xs uppercase tracking-[0.2em] text-[#827466]">Compra simples</p><h3 className="mt-2 font-serif text-2xl">Pagamento seguro</h3><p className="mt-2 text-sm leading-relaxed text-[#6f6256]">O checkout é finalizado em ambiente protegido do provedor de pagamento.</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-[#827466]">Brasil inteiro</p><h3 className="mt-2 font-serif text-2xl">Envio calculado</h3><p className="mt-2 text-sm leading-relaxed text-[#6f6256]">O frete e o prazo aparecem conforme o CEP e a modalidade escolhida.</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-[#827466]">Com cuidado</p><h3 className="mt-2 font-serif text-2xl">Atendimento próximo</h3><p className="mt-2 text-sm leading-relaxed text-[#6f6256]">Dúvidas, trocas e pedidos recebem orientação pelo canal oficial da marca.</p></div></div></section>
      </main>

      <footer className="bg-[#241f1a] py-12 text-[#f8eee1]"><div className="container flex flex-col gap-7 md:flex-row md:items-end md:justify-between"><div><p className="font-serif text-3xl">Arte Que Veste<span className="text-[#c47a3d]">.</span></p><p className="mt-3 max-w-sm text-sm leading-relaxed text-[#c8bdb0]">Arte para vestir, usar e levar consigo.</p></div><div className="text-left text-xs leading-relaxed text-[#a99d8f] md:text-right">© 2026 Arte Que Veste · Todos os direitos reservados<br />Conceito e identidade digital por Pedro Belentani</div></div></footer>
      <CartDrawer />
    </div>
  );
}
