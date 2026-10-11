import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/commerce/ProductCard";
import SiteHeader from "@/components/commerce/SiteHeader";
import SiteFooter from "@/components/commerce/SiteFooter";
import StorefrontLayout, {
  StorefrontMessage,
} from "@/components/commerce/StorefrontLayout";
import { applyRouteMeta } from "@/lib/seo";
import { PRODUCT_SORT_LABELS, type ProductSort } from "@shared/commerce/types";
import { STOREFRONT_CATEGORIES } from "@shared/storefrontRules";

const MAX_TERM = 80;

/**
 * Catalog search (`/busca?q=`).
 *
 * The previous Home had a search button that did nothing — the audit's own
 * checklist said "remove it or implement it". This is the implementation:
 * the term lives in the URL (shareable, back-button friendly), it is escaped
 * before reaching Shopify's query syntax, and the empty state offers the real
 * categories instead of a shrug.
 */
export default function SearchPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const queryParam = params.get("q") ?? "";
  const [term, setTerm] = useState(queryParam);
  const [submitted, setSubmitted] = useState(queryParam);
  const [sort, setSort] = useState<ProductSort>("relevance");

  useEffect(() => {
    setTerm(queryParam);
    setSubmitted(queryParam);
  }, [queryParam]);

  const trimmed = submitted.trim().slice(0, MAX_TERM);

  // With a term: Storefront search (relevance ordering by default).
  // Without a term: the full catalog, which is what a shopper expects from a
  // "browse everything" route — the previous version showed only a hint here.
  const searchQuery = trpc.commerce.products.search.useQuery(
    { term: trimmed, first: 24, sort },
    { retry: 1, enabled: trimmed.length > 0, staleTime: 30_000 }
  );
  const catalogQuery = trpc.commerce.products.list.useQuery(
    { first: 24, sort: sort === "relevance" ? "featured" : sort },
    { retry: 1, enabled: trimmed.length === 0, staleTime: 30_000 }
  );

  const hasTerm = trimmed.length > 0;
  const data = hasTerm ? searchQuery.data : catalogQuery.data;
  const isLoading = hasTerm ? searchQuery.isLoading : catalogQuery.isLoading;
  const isError = hasTerm ? searchQuery.isError : catalogQuery.isError;
  const refetch = hasTerm ? searchQuery.refetch : catalogQuery.refetch;

  useEffect(() => {
    applyRouteMeta({
      title: trimmed
        ? `Busca: ${trimmed} — Arte Que Veste`
        : "Buscar peças — Arte Que Veste",
      description:
        "Encontre camisetas, quimonos, bolsas e acessórios publicados no catálogo da Arte Que Veste.",
      canonical: trimmed ? `/busca?q=${encodeURIComponent(trimmed)}` : "/busca",
      noindex: Boolean(trimmed),
    });
  }, [trimmed]);

  const products = data?.products ?? [];
  const mode = data?.mode ?? "unconfigured";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = term.trim().slice(0, MAX_TERM);
    window.history.replaceState(
      null,
      "",
      value ? `/busca?q=${encodeURIComponent(value)}` : "/busca"
    );
    setSubmitted(value);
  };

  return (
    <StorefrontLayout>
      <SiteHeader variant="compact" />
      <main className="aqv-container py-10 md:py-14">
        <nav
          aria-label="Você está em"
          className="text-[10px] uppercase tracking-[0.13em] text-[var(--aqv-muted)]"
        >
          <Link href="/" className="hover:text-[var(--aqv-accent)]">
            Início
          </Link>
          <span aria-hidden="true"> / Busca</span>
        </nav>

        <header className="mt-6 border-b border-[var(--aqv-line)] pb-8">
          <p className="aqv-kicker">Busca no catálogo</p>
          <h1 className="mt-3 font-display text-5xl leading-[0.92] tracking-[-0.07em] md:text-6xl">
            {trimmed ? `Resultados para “${trimmed}”` : "Catálogo completo"}
          </h1>

          <form
            role="search"
            onSubmit={submit}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <label htmlFor="aqv-search-page" className="sr-only">
                Buscar peças no catálogo
              </label>
              <SearchIcon
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--aqv-muted)]"
              />
              <input
                id="aqv-search-page"
                type="search"
                value={term}
                maxLength={MAX_TERM}
                onChange={event => setTerm(event.target.value)}
                placeholder="camiseta, quimono, bolsa…"
                className="h-12 w-full border border-[var(--aqv-line)] bg-[var(--aqv-paper)] pl-11 pr-10 text-sm outline-none focus-visible:border-[var(--aqv-accent)]"
              />
              {term && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--aqv-muted)]"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-12 bg-[var(--aqv-ink)] px-6 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)]"
            >
              Buscar
            </button>
          </form>

          {products.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(PRODUCT_SORT_LABELS) as ProductSort[]).map(key => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={sort === key}
                  onClick={() => setSort(key)}
                  className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition ${
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
        </header>

        <div className="mt-10">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[4/5] animate-pulse bg-[var(--aqv-surface-2)]"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : isError ? (
            <StorefrontMessage
              kicker="Busca indisponível"
              title="Não foi possível consultar o catálogo agora."
              body="Tente novamente em instantes ou navegue pelas categorias publicadas."
              action={{ label: "Tentar novamente", onClick: () => refetch() }}
              tone="alert"
            />
          ) : products.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < 4}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <StorefrontMessage
                kicker={hasTerm ? "Nenhum resultado" : "Catálogo em preparação"}
                title={
                  hasTerm
                    ? `Não encontramos peças para “${trimmed}”.`
                    : "Ainda não há peças publicadas."
                }
                body={
                  mode === "unconfigured"
                    ? "A loja ainda não está conectada ao catálogo Shopify, então não há o que listar. As categorias continuam navegáveis e a estrutura está pronta para quando o titular publicar a primeira peça."
                    : hasTerm
                      ? "Tente uma palavra mais curta, o nome de uma categoria ou verifique a grafia. A busca percorre apenas as peças realmente publicadas."
                      : "Assim que o ateliê publicar uma peça no Shopify, ela aparece aqui automaticamente — com foto, preço, tamanhos e estoque reais."
                }
                action={
                  hasTerm
                    ? { label: "Ver tudo", href: "/busca" }
                    : { label: "Voltar para a loja", href: "/" }
                }
              />
              <ul className="flex flex-wrap gap-2">
                {STOREFRONT_CATEGORIES.map(category => (
                  <li key={category.slug}>
                    <Link
                      href={`/categoria/${category.slug}`}
                      className="inline-flex border border-[var(--aqv-line)] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.13em] transition hover:border-[var(--aqv-accent)] hover:text-[var(--aqv-accent)]"
                    >
                      {category.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </StorefrontLayout>
  );
}
