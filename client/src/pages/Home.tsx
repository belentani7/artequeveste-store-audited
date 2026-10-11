import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/commerce/ProductCard";
import SiteHeader from "@/components/commerce/SiteHeader";
import SiteFooter from "@/components/commerce/SiteFooter";
import StorefrontLayout, {
  LaunchNotice,
} from "@/components/commerce/StorefrontLayout";
import { applyRouteMeta } from "@/lib/seo";
import { PRODUCT_SORT_LABELS, type ProductSort } from "@shared/commerce/types";
import {
  categoryMatches,
  STOREFRONT_CATEGORIES,
} from "@shared/storefrontRules";
import { formatMoney } from "@/lib/format";

const HERO_IMAGE = "/campaign/aqv-2026-campaign-hero.jpg";
const MATERIAL_IMAGE = "/campaign/aqv-2026-material-detail.jpg";
const PAGE_SIZE = 12;
/** Window requested from the backend for the Home grid (max accepted: 60). */
const FETCH_WINDOW = 48;

type SortKey = ProductSort;

/**
 * Home — storefront first, brand story second.
 *
 * The audit flagged the previous version for concentrating the whole store in
 * one unbraidable file and for showing empty controls. This page is now a
 * composition of named sections with a single data source (`commerce.products.list`)
 * and an honest launch state when the catalog is empty.
 */
export default function Home() {
  const [category, setCategory] = useState<string>("todos");
  const [sort, setSort] = useState<SortKey>("featured");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const {
    data: page,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = trpc.commerce.products.list.useQuery(
    { first: FETCH_WINDOW, sort },
    { retry: 1 }
  );

  const products = page?.products ?? [];
  const mode = page?.mode ?? "unconfigured";

  useEffect(() => {
    applyRouteMeta({
      title: "Arte Que Veste — roupas autorais brasileiras",
      description:
        "Camisetas, quimonos, bolsas e acessórios autorais. Coleção 2026 da Arte Que Veste com preço, tamanho e disponibilidade reais do catálogo.",
      canonical: "/",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ClothingStore",
        name: "Arte Que Veste",
        description: "Loja de roupas autorais brasileiras.",
        areaServed: "BR",
        image: HERO_IMAGE,
      },
    });
  }, []);

  // GSAP is loaded on demand and never on reduced-motion devices. The previous
  // implementation re-ran on every product-count change and left the grid
  // invisible when the import resolved after a re-render; this one runs once,
  // against elements that exist on first paint.
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanup = () => {};
    let cancelled = false;

    import("gsap").then(({ default: gsap }) => {
      if (cancelled) return;
      const context = gsap.context(() => {
        gsap.fromTo(
          ".aqv-hero-copy > *",
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.075,
            ease: "power4.out",
          }
        );
        gsap.fromTo(
          ".aqv-hero-media",
          { clipPath: "inset(0 0 100% 0)" },
          {
            clipPath: "inset(0 0 0% 0)",
            duration: 1.05,
            ease: "power4.inOut",
            delay: 0.12,
          }
        );
        const observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (!entry.isIntersecting) return;
              gsap.fromTo(
                entry.target,
                { y: 26, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }
              );
              observer.unobserve(entry.target);
            });
          },
          { threshold: 0.12 }
        );
        root
          .querySelectorAll<HTMLElement>("[data-reveal]")
          .forEach(element => observer.observe(element));
        context.add(() => observer.disconnect());
      }, root);
      cleanup = () => context.revert();
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const filtered = useMemo(() => {
    if (category === "todos") return products;
    return products.filter(product => categoryMatches(product, category));
  }, [category, products]);

  const shown = filtered.slice(0, visible);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const definition of STOREFRONT_CATEGORIES) {
      counts.set(
        definition.slug,
        products.filter(product => categoryMatches(product, definition.slug))
          .length
      );
    }
    return counts;
  }, [products]);
  const hasCatalog = products.length > 0;

  return (
    <StorefrontLayout>
      <div ref={pageRef}>
        <SiteHeader variant="home" />

        <main>
          {/* ---------------------------------------------------------------- */}
          {/* Hero                                                             */}
          {/* ---------------------------------------------------------------- */}
          <section className="aqv-hero border-b border-[var(--aqv-line)]">
            <div className="aqv-container grid min-h-[600px] gap-8 py-8 md:grid-cols-[0.82fr_1.18fr] md:items-center md:py-12">
              <div className="aqv-hero-copy order-2 md:order-1">
                <p className="aqv-kicker">Arte Que Veste · Coleção 2026</p>
                <h1 className="mt-5 max-w-[9ch] font-display text-[clamp(3.4rem,7.4vw,6.5rem)] leading-[0.86] tracking-[-0.08em]">
                  ARTE QUE VESTE
                </h1>
                <p className="mt-7 max-w-sm text-base leading-relaxed text-[var(--aqv-muted)]">
                  <span className="font-medium text-[var(--aqv-accent)]">
                    Traço vivo.
                  </span>{" "}
                  Roupas autorais para vestir presença, movimento e memória sem
                  pedir licença.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link
                    href="#catalogo"
                    className="inline-flex items-center gap-3 bg-[var(--aqv-ink)] px-6 py-4 text-[10px] font-medium uppercase tracking-[0.16em] text-white transition hover:bg-[var(--aqv-accent)]"
                  >
                    Explorar a coleção{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                  <Link
                    href="/busca"
                    className="inline-flex items-center gap-3 border border-[var(--aqv-ink)] px-6 py-4 text-[10px] font-medium uppercase tracking-[0.16em] transition hover:bg-[var(--aqv-ink)] hover:text-white"
                  >
                    Buscar por peça
                  </Link>
                </div>
                {hasCatalog && (
                  <p className="mt-6 text-xs uppercase tracking-[0.14em] text-[var(--aqv-muted)]">
                    {products.length}{" "}
                    {products.length === 1
                      ? "peça publicada"
                      : "peças publicadas"}{" "}
                    · a partir de{" "}
                    {formatMoney(
                      products.reduce(
                        (cheapest, product) =>
                          Number.parseFloat(product.priceRange.min.amount) <
                          Number.parseFloat(cheapest.amount)
                            ? product.priceRange.min
                            : cheapest,
                        products[0].priceRange.min
                      )
                    )}
                  </p>
                )}
              </div>

              <div className="aqv-hero-media relative order-1 min-h-[380px] overflow-hidden bg-[var(--aqv-surface-2)] md:order-2 md:min-h-[540px]">
                <img
                  src={HERO_IMAGE}
                  alt="Composição de tecidos e formas da campanha Arte Que Veste 2026"
                  width={768}
                  height={1152}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div
                  className="absolute inset-5 border border-white/60"
                  aria-hidden="true"
                />
                <div className="absolute bottom-5 left-5 text-white">
                  <p className="text-[10px] uppercase tracking-[0.2em]">
                    AQV / 026
                  </p>
                  <p className="mt-2 max-w-[10ch] font-display text-4xl leading-[0.9] tracking-[-0.06em]">
                    Feito para acontecer.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Novidades                                                        */}
          {/* ---------------------------------------------------------------- */}
          <section
            id="novidades"
            className="aqv-container py-16 md:py-24"
            data-reveal
          >
            <div className="flex items-end justify-between border-b border-[var(--aqv-line)] pb-6">
              <div>
                <p className="aqv-kicker">Agora na loja</p>
                <h2 className="mt-3 font-display text-5xl tracking-[-0.07em] md:text-6xl">
                  Novidades
                </h2>
              </div>
              <Link
                href="#catalogo"
                className="text-[10px] font-medium uppercase tracking-[0.15em] underline underline-offset-8"
              >
                Ver tudo
              </Link>
            </div>

            {isLoading ? (
              <div className="aqv-product-grid mt-9 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[4/5] animate-pulse bg-[var(--aqv-surface-2)]"
                    aria-hidden="true"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="mt-9">
                <ErrorState onRetry={() => refetch()} busy={isRefetching} />
              </div>
            ) : products.length ? (
              <div className="aqv-product-grid mt-9 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
                {products.slice(0, 4).map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={index < 2}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-9">
                <LaunchNotice mode={mode} />
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Categorias                                                       */}
          {/* ---------------------------------------------------------------- */}
          <section
            id="categorias"
            className="border-y border-[var(--aqv-line)] bg-[var(--aqv-ink)] text-white"
            data-reveal
          >
            <div className="aqv-container py-16 md:py-24">
              <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
                <div>
                  <p className="aqv-kicker text-[var(--aqv-accent-2)]">
                    Escolha por forma
                  </p>
                  <h2 className="mt-3 max-w-[8ch] font-display text-6xl leading-[0.88] tracking-[-0.08em]">
                    Vestir o gesto.
                  </h2>
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-white/65">
                  Cada categoria abre uma página de catálogo real. Se ainda não
                  houver peças publicadas nela, a loja diz isso em vez de
                  mostrar uma grade vazia.
                </p>
              </div>

              <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {STOREFRONT_CATEGORIES.map((definition, index) => {
                  const count = categoryCounts.get(definition.slug) ?? 0;
                  return (
                    <Link
                      key={definition.slug}
                      href={`/categoria/${definition.slug}`}
                      className="aqv-category-card block bg-white/10 p-6 text-left"
                    >
                      <span className="aqv-kicker text-white/60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <strong className="mt-16 block font-display text-4xl tracking-[-0.06em]">
                        {definition.label}
                      </strong>
                      <span className="mt-3 block text-[11px] uppercase tracking-[0.12em] text-white/55">
                        {hasCatalog
                          ? `${count} ${count === 1 ? "peça" : "peças"}`
                          : "catálogo em preparação"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Campanha / matéria                                               */}
          {/* ---------------------------------------------------------------- */}
          <section
            className="aqv-container grid gap-4 py-16 md:grid-cols-[1.15fr_.85fr] md:py-24"
            data-reveal
          >
            <div className="relative min-h-[360px] overflow-hidden bg-[var(--aqv-surface-2)]">
              <img
                src={HERO_IMAGE}
                alt="Tecidos sobrepostos da campanha Arte Que Veste 2026"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-[68%_42%]"
              />
              <div className="absolute bottom-5 left-5 text-white">
                <p className="aqv-kicker">Forma / movimento</p>
                <p className="mt-2 max-w-[12ch] font-display text-4xl leading-[.9]">
                  A roupa ocupa espaço.
                </p>
              </div>
            </div>
            <div className="relative min-h-[360px] overflow-hidden bg-[var(--aqv-surface-2)]">
              <img
                src={MATERIAL_IMAGE}
                alt="Detalhe macro de tecido com trama aparente"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div
                className="absolute inset-0 bg-[linear-gradient(160deg,rgba(23,23,23,.12),rgba(23,23,23,.62))]"
                aria-hidden="true"
              />
              <div className="absolute bottom-5 left-5 text-white">
                <p className="aqv-kicker">Detalhe de matéria</p>
                <p className="mt-2 max-w-[14ch] font-display text-4xl leading-[.9]">
                  O gesto mora no corte.
                </p>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Catálogo                                                         */}
          {/* ---------------------------------------------------------------- */}
          <section
            id="catalogo"
            className="aqv-container py-16 md:py-24"
            data-reveal
          >
            <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
              <div>
                <p className="aqv-kicker">Comprar</p>
                <h2 className="mt-3 font-display text-5xl tracking-[-0.07em] md:text-6xl">
                  Todas as peças
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {[
                  { slug: "todos", label: "Todos" },
                  ...STOREFRONT_CATEGORIES,
                ].map(item => (
                  <button
                    key={item.slug}
                    type="button"
                    aria-pressed={category === item.slug}
                    onClick={() => {
                      setCategory(item.slug);
                      setVisible(PAGE_SIZE);
                    }}
                    className={`text-[10px] font-medium uppercase tracking-[0.14em] ${
                      category === item.slug
                        ? "border-b-2 border-[var(--aqv-accent)] pb-1 text-[var(--aqv-accent)]"
                        : "text-[var(--aqv-muted)] hover:text-[var(--aqv-ink)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  aria-expanded={filtersOpen}
                  aria-controls="aqv-sort-panel"
                  onClick={() => setFiltersOpen(value => !value)}
                  className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--aqv-muted)] hover:text-[var(--aqv-ink)]"
                >
                  <SlidersHorizontal size={13} aria-hidden="true" /> Ordenar
                </button>
              </div>
            </div>

            {filtersOpen && (
              <div
                id="aqv-sort-panel"
                className="mt-6 flex flex-wrap gap-2 border border-[var(--aqv-line)] bg-[var(--aqv-surface)] p-4"
              >
                {(Object.keys(PRODUCT_SORT_LABELS) as SortKey[])
                  .filter(key => key !== "relevance")
                  .map(key => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={sort === key}
                      onClick={() => setSort(key)}
                      className={`border px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition ${
                        sort === key
                          ? "border-[var(--aqv-ink)] bg-[var(--aqv-ink)] text-white"
                          : "border-[var(--aqv-line)] hover:border-[var(--aqv-accent)]"
                      }`}
                    >
                      {PRODUCT_SORT_LABELS[key]}
                    </button>
                  ))}
              </div>
            )}

            <div className="mt-10">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-[4/5] animate-pulse bg-[var(--aqv-surface-2)]"
                      aria-hidden="true"
                    />
                  ))}
                </div>
              ) : isError ? (
                <ErrorState onRetry={() => refetch()} busy={isRefetching} />
              ) : !hasCatalog ? (
                <LaunchNotice mode={mode} />
              ) : filtered.length ? (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4">
                    {shown.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        priority={index < 4}
                      />
                    ))}
                  </div>
                  {filtered.length > shown.length && (
                    <div className="mt-12 text-center">
                      <button
                        type="button"
                        onClick={() => setVisible(value => value + PAGE_SIZE)}
                        className="border border-[var(--aqv-ink)] px-6 py-4 text-[10px] font-medium uppercase tracking-[0.15em] transition hover:bg-[var(--aqv-ink)] hover:text-white"
                      >
                        Ver mais peças ({filtered.length - shown.length}{" "}
                        restantes)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="border border-dashed border-[var(--aqv-line)] bg-[var(--aqv-surface)] p-8 text-sm text-[var(--aqv-muted)]">
                  Nenhuma peça publicada nesta categoria ainda.{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => setCategory("todos")}
                  >
                    Ver todas as peças
                  </button>
                  .
                </div>
              )}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Informações                                                      */}
          {/* ---------------------------------------------------------------- */}
          <section
            id="informacoes"
            className="border-t border-[var(--aqv-line)]"
          >
            <div className="aqv-container grid gap-10 py-12 text-sm md:grid-cols-3">
              <div>
                <p className="aqv-kicker">Pagamento</p>
                <p className="mt-3 text-[var(--aqv-muted)]">
                  Checkout protegido Shopify. PIX, cartão e parcelamento
                  dependem da configuração do titular.
                </p>
              </div>
              <div>
                <p className="aqv-kicker">Entrega e trocas</p>
                <p className="mt-3 text-[var(--aqv-muted)]">
                  Frete, prazo e políticas aparecem no checkout e nas
                  informações reais do produto. Veja também{" "}
                  <Link href="/trocas" className="underline underline-offset-4">
                    trocas e devoluções
                  </Link>
                  .
                </p>
              </div>
              <div>
                <p className="aqv-kicker">Atendimento</p>
                <p className="mt-3 text-[var(--aqv-muted)]">
                  Suporte antes e depois do pedido. Consulte a{" "}
                  <Link
                    href="/privacidade"
                    className="underline underline-offset-4"
                  >
                    política de privacidade
                  </Link>{" "}
                  para saber como seus dados são tratados.
                </p>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </StorefrontLayout>
  );
}

function ErrorState({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <div className="border border-[var(--aqv-accent)] bg-[var(--aqv-surface)] p-8">
      <p className="aqv-kicker text-[var(--aqv-accent)]">
        Catálogo temporariamente indisponível
      </p>
      <p className="mt-3 max-w-xl text-sm text-[var(--aqv-muted)]">
        Não foi possível consultar as peças agora. Tente novamente em instantes.
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="mt-5 border border-[var(--aqv-ink)] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] transition hover:bg-[var(--aqv-ink)] hover:text-white disabled:opacity-50"
      >
        {busy ? "Tentando…" : "Tentar novamente"}
      </button>
    </div>
  );
}
