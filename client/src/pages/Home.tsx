import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Instagram, Menu, ShoppingBag, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/contexts/CartContext";
import { startLogin } from "@/const";
import type { Product } from "@shared/commerce/types";

const categories = ["Todos", "Camisetas", "Quimonos", "Bolsas", "Canecas", "Souvenires"];

function ProductCard({ product }: { product: Product }) {
  const { addItem, loading } = useCart();
  const variant = product.variants[0];
  const image = product.images[0];

  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-[#D9C7B2] bg-[#F8F0E5] shadow-[0_12px_40px_rgba(56,43,28,0.06)] transition-transform duration-200 hover:-translate-y-1">
      <a href={`/produto/${product.handle}`} className="block aspect-[4/5] overflow-hidden bg-[#E5D8C8]">
        {image ? (
          <img src={image.url} alt={image.altText ?? product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#7B6858]">Imagem em preparação</div>
        )}
      </a>
      <div className="space-y-4 p-5">
        <div>
          <p className="mb-2 text-[0.68rem] uppercase tracking-[0.22em] text-[#7B6858]">{product.productType || "Arte Que Veste"}</p>
          <h3 className="font-serif text-2xl leading-tight text-[#211A16]">{product.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#493D33]">{product.description}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold text-[#211A16]">{formatMoney(product.priceRange.min)}</span>
          <Button className="rounded-full bg-[#23867F] px-4 text-white hover:bg-[#176B66]" disabled={!variant?.availableForSale || loading} onClick={() => variant && addItem(variant.id)}>
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
    <div className="fixed inset-0 z-50 bg-[#211A16]/35" onClick={closeCart}>
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#F8F0E5] p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#D9C7B2] pb-5">
          <div><p className="text-xs uppercase tracking-[0.2em] text-[#7B6858]">Sua seleção</p><h2 className="font-serif text-3xl text-[#211A16]">Carrinho</h2></div>
          <button aria-label="Fechar carrinho" onClick={closeCart} className="rounded-full p-2 text-[#493D33] hover:bg-[#E7F0EB]"><X size={20} /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto py-6">
          {!cart?.items.length ? <div className="rounded-2xl bg-[#E7F0EB] p-5 text-sm leading-relaxed text-[#493D33]">Seu carrinho está vazio. Escolha uma peça para começar.</div> : cart.items.map(item => (
            <div key={item.lineId} className="flex gap-3 border-b border-[#D9C7B2] pb-4">
              {item.image ? <img src={item.image.url} alt={item.image.altText ?? item.productTitle} className="h-20 w-16 rounded-xl object-cover" /> : <div className="h-20 w-16 rounded-xl bg-[#E5D8C8]" />}
              <div className="min-w-0 flex-1"><h3 className="font-medium text-[#211A16]">{item.productTitle}</h3><p className="mt-1 text-sm text-[#493D33]">{formatMoney(item.unitPrice)}</p><div className="mt-3 flex items-center gap-2"><button className="h-7 w-7 rounded-full border border-[#B39B82]" onClick={() => updateQuantity(item.lineId, item.quantity - 1)} disabled={loading}>−</button><span className="w-5 text-center text-sm">{item.quantity}</span><button className="h-7 w-7 rounded-full border border-[#B39B82]" onClick={() => updateQuantity(item.lineId, item.quantity + 1)} disabled={loading}>+</button><button className="ml-2 text-xs text-[#9F4D3D]" onClick={() => removeItem(item.lineId)}>Remover</button></div></div>
            </div>
          ))}
        </div>
        <div className="space-y-4 border-t border-[#D9C7B2] pt-5"><div className="flex justify-between text-base"><span>Subtotal</span><strong>{cart ? formatMoney(cart.subtotal) : "R$ 0,00"}</strong></div><p className="text-xs leading-relaxed text-[#7B6858]">O frete e as opções de pagamento serão calculados no checkout.</p><Button className="w-full rounded-full bg-[#23867F] py-6 text-white hover:bg-[#176B66]" disabled={!cart?.itemCount || loading} onClick={proceedToCheckout}>Ir para o checkout <ArrowRight size={16} /></Button></div>
      </aside>
    </div>
  );
}

export default function Home() {
  const [category, setCategory] = useState("Todos");
  const [menuOpen, setMenuOpen] = useState(false);
  const [consentVisible, setConsentVisible] = useState(() => localStorage.getItem("artequeveste-consent") === null);
  const { itemCount, openCart } = useCart();
  const { data: products = [], isLoading } = trpc.commerce.products.list.useQuery({ first: 24 });
  const filtered = useMemo(() => category === "Todos" ? products : products.filter(product => (product.productType ?? "").toLowerCase().includes(category.toLowerCase().slice(0, -1))), [category, products]);

  return (
    <div className="aqv-shell min-h-screen bg-[#F6EFE4] text-[#211A16]">
      <div className="bg-[#211A16] px-4 py-2 text-center text-[0.68rem] uppercase tracking-[0.2em] text-[#F6EFE4]">Arte que carrega história · Enviamos para todo o Brasil</div>
      <header className="sticky top-0 z-30 border-b border-[#D9C7B2]/80 bg-[#F6EFE4]/95 backdrop-blur">
        <div className="container flex h-20 items-center justify-between gap-5">
          <a href="#inicio" className="aqv-wordmark font-serif text-2xl tracking-tight text-[#211A16]"><span>Arte</span> Que Veste<span className="text-[#C7654C]">.</span></a>
          <nav className={`${menuOpen ? "absolute left-0 right-0 top-20 flex bg-[#F6EFE4] p-5 shadow-xl" : "hidden"} flex-col gap-5 text-sm text-[#493D33] md:static md:flex md:flex-row md:bg-transparent md:p-0 md:shadow-none`}>
            <a href="#colecao" onClick={() => setMenuOpen(false)} className="hover:text-[#23867F]">Coleção</a><a href="#historia" onClick={() => setMenuOpen(false)} className="hover:text-[#23867F]">Nossa história</a><a href="#cuidados" onClick={() => setMenuOpen(false)} className="hover:text-[#23867F]">Envios e trocas</a>
          </nav>
          <div className="flex items-center gap-2"><button className="hidden rounded-full p-2 text-[#23867F] sm:block" aria-label="Instagram"><Instagram size={18} /></button><button className="hidden rounded-full px-3 py-2 text-xs font-semibold text-[#211A16] sm:block" onClick={() => startLogin()}>Entrar</button><button className="relative rounded-full p-2 text-[#23867F]" aria-label="Abrir carrinho" onClick={openCart}><ShoppingBag size={20} />{itemCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#C7654C] text-[0.65rem] font-bold text-white">{itemCount}</span>}</button><button className="rounded-full p-2 md:hidden" aria-label="Abrir menu" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
        </div>
      </header>

      <main>
        <section id="inicio" className="container grid gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div className="max-w-2xl"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#B39B82] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#493D33]"><Sparkles size={14} className="text-[#C7654C]" /> Arte para vestir e lembrar</div><h1 className="font-serif text-5xl leading-[0.98] tracking-tight text-[#211A16] md:text-7xl">A cultura que você veste, a história que você leva.</h1><p className="mt-7 max-w-xl text-lg leading-relaxed text-[#493D33]">Peças inspiradas na força gráfica da xilogravura nordestina, criadas para transformar o cotidiano em memória.</p><div className="mt-9 flex flex-wrap gap-3"><a href="#colecao"><Button className="rounded-full bg-[#23867F] px-6 py-6 text-white hover:bg-[#176B66]">Conheça a coleção <ArrowRight size={17} /></Button></a><a href="#historia"><Button variant="outline" className="rounded-full border-[#B99572] bg-transparent px-6 py-6 text-[#23867F] hover:bg-[#E7F0EB]">A nossa história</Button></a></div></div>
          <div className="aqv-print relative min-h-[390px] overflow-hidden rounded-[1.25rem] border-2 border-[#211A16] bg-[#23867F] p-8 text-[#F6EFE4] shadow-[10px_12px_0_0_#C7654C]"><div className="aqv-sun absolute -right-14 -top-16 h-56 w-56 rounded-full border-[28px] border-[#E4A83B]/80" /><div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full border-[30px] border-[#F6EFE4]/15" /><div className="relative flex min-h-[390px] flex-col justify-between"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.35em] text-[#F6EFE4]/80">ARTE QUE VESTE</p><p className="mt-4 font-serif text-5xl uppercase leading-[0.9] tracking-[0.06em]">Vestir<br /><span className="text-[#E4A83B]">memória</span></p></div><span className="aqv-stamp">01<br />SE</span></div><div><p className="max-w-[18rem] font-serif text-3xl leading-tight">Da mão, do território e da imaginação.</p><div className="mt-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[#F6EFE4]/80"><span className="h-px w-10 bg-[#E4A83B]" /> coleção de origem</div></div></div></div>
        </section>

        <section id="colecao" className="bg-[#E7F0EB] py-16 md:py-24"><div className="container"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs uppercase tracking-[0.22em] text-[#7B6858]">Escolhas com significado</p><h2 className="mt-3 font-serif text-4xl text-[#211A16] md:text-5xl">A coleção</h2></div><div className="flex flex-wrap gap-2">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-4 py-2 text-xs transition ${category === item ? "border-[#23867F] bg-[#23867F] text-white" : "border-[#B39B82] text-[#493D33] hover:border-[#23867F] hover:text-[#23867F]"}`}>{item}</button>)}</div></div><div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{isLoading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-[1.5rem] bg-[#DCC8B1]" />) : filtered.length ? filtered.map(product => <ProductCard key={product.id} product={product} />) : <div className="col-span-full rounded-[1.5rem] border border-dashed border-[#B39B82] bg-[#F6EFE4] p-10 text-center"><h3 className="font-serif text-3xl">A coleção está sendo preparada.</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#493D33]">Os produtos reais, imagens, preços e estoque serão publicados pelo proprietário após a configuração do catálogo.</p></div>}</div></div></section>

        <section id="historia" className="container grid gap-10 py-16 md:grid-cols-[0.8fr_1.2fr] md:py-24"><div><p className="text-xs uppercase tracking-[0.22em] text-[#7B6858]">Mais que um produto</p><h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">Uma imagem também pode ser uma memória.</h2></div><div className="space-y-5 text-lg leading-relaxed text-[#493D33]"><p>A Arte Que Veste aproxima a linguagem da xilogravura nordestina do cotidiano. A proposta é simples: fazer com que a arte circule, acompanhe pessoas e inicie novas conversas.</p><p>O projeto se relaciona ao trabalho do Mestre Nivaldo Oliveira, em São Cristóvão/SE. Cada referência deve ser apresentada com respeito, contexto e verdade, valorizando a mão, o lugar e a história por trás da imagem.</p><p className="border-l-2 border-[#C7654C] pl-5 font-serif text-2xl text-[#211A16]">Vestir uma imagem também é escolher uma memória.</p></div></section>

        <section id="cuidados" className="border-y border-[#D9C7B2] bg-[#F6EFE4] py-14"><div className="container grid gap-8 md:grid-cols-3"><div><p className="text-xs uppercase tracking-[0.2em] text-[#7B6858]">Compra simples</p><h3 className="mt-2 font-serif text-2xl">Pagamento seguro</h3><p className="mt-2 text-sm leading-relaxed text-[#493D33]">O checkout é finalizado em ambiente protegido do provedor de pagamento.</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-[#7B6858]">Brasil inteiro</p><h3 className="mt-2 font-serif text-2xl">Envio calculado</h3><p className="mt-2 text-sm leading-relaxed text-[#493D33]">O frete e o prazo aparecem conforme o CEP e a modalidade escolhida.</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-[#7B6858]">Com cuidado</p><h3 className="mt-2 font-serif text-2xl">Atendimento próximo</h3><p className="mt-2 text-sm leading-relaxed text-[#493D33]">Dúvidas, trocas e pedidos recebem orientação pelo canal oficial da marca.</p></div></div></section>
      </main>

      {consentVisible && <div role="dialog" aria-label="Preferências de privacidade" className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-[#B39B82] bg-[#F6EFE4] p-5 shadow-2xl md:left-auto md:max-w-md"><p className="text-sm font-semibold text-[#211A16]">Sua privacidade importa</p><p className="mt-2 text-xs leading-relaxed text-[#493D33]">Usamos apenas o necessário para a loja funcionar. Analytics e marketing permanecem desativados até sua escolha.</p><div className="mt-4 flex gap-2"><button className="rounded-full bg-[#23867F] px-4 py-2 text-xs font-semibold text-white" onClick={() => { localStorage.setItem("artequeveste-consent", "essential"); setConsentVisible(false); }}>Somente essenciais</button><button className="rounded-full border border-[#B39B82] px-4 py-2 text-xs text-[#211A16]" onClick={() => { localStorage.setItem("artequeveste-consent", "all"); setConsentVisible(false); }}>Aceitar tudo</button></div></div>}
      <footer className="bg-[#211A16] py-12 text-[#ffffff]"><div className="container flex flex-col gap-7 md:flex-row md:items-end md:justify-between"><div><p className="font-serif text-3xl">Arte Que Veste<span className="text-[#C7654C]">.</span></p><p className="mt-3 max-w-sm text-sm leading-relaxed text-[#B39B82]">Arte para vestir, usar e levar consigo.</p></div><div className="text-left text-xs leading-relaxed text-[#999999] md:text-right">© 2026 Arte Que Veste · Todos os direitos reservados<br />Conceito e identidade digital por Pedro Belentani</div></div></footer>
      <CartDrawer />
    </div>
  );
}
