import { useEffect, useMemo, useState } from "react";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/commerce/ProductCard";
import SiteHeader from "@/components/commerce/SiteHeader";
import SiteFooter from "@/components/commerce/SiteFooter";
import StorefrontLayout, {
  LaunchNotice,
  StorefrontMessage,
} from "@/components/commerce/StorefrontLayout";
import { applyRouteMeta } from "@/lib/seo";
import {
  PRODUCT_SORT_LABELS,
  type Product,
  type ProductSort,
} from "@shared/commerce/types";
import {
  categoryMatches,
  findCategory,
  STOREFRONT_CATEGORIES,
} from "@shared/storefrontRules";

const PAGE_SIZE = 24;
/** Caps how many catalog pages a single "ver mais" click may scan in fallback mode. */
const FALLBACK_SCAN_LIMIT = 3;

/**
 * Category catalog page (`/categoria/:slug`).
 *
 * Why a dedicated route instead of an anchor on the Home:
 *   - a category is a real landing page (shareable, indexable, canonical);
 *   - when the titular published a Shopify collection with that handle, this
 *     is a straight collection listing with cursor pagination;
 *   - when they did not, it falls back to a catalog scan filtered by the same
 *     rules the Home uses, and says so instead of showing an empty grid.
 */
export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = (params?.slug ?? "").toLowerCase();
  const definition = findCategory(slug);

  if (!definition) return <UnknownCategory slug={slug} />;

  return (
    <CategoryCatalog
      slug={slug}
      label={definition.label}
      blurb={definition.blurb}
    />
  );
}

function CategoryCatalog({
  slug,
  label,
  blurb,
}: {
  slug: string;
  label: string;
  blurb: string;
}) {
  const utils = trpc.useUtils();
  const [sort, setSort] = useState<ProductSort>("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [extra, setExtra] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const collectionQuery = trpc.commerce.collections.page.useQuery(
    { handle: slug, first: PAGE_SIZE, sort },
    { retry: 1 }
  );
  const collectionResolved = collectionQuery.isSuccess;
  const needsFallback = collectionResolved && collectionQuery.data === null;

  const catalogQuery = trpc.commerce.products.list.useQuery(
    { first: 60, sort },
    { retry: 1, enabled: needsFallback }
  );

  // A new category, sort order or data source invalidates accumulated pages.
  useEffect(() => {
    setExtra([]);
    setCursor(null);
    setLoadingMore(false);
  }, [slug, sort, needsFallback]);

  const collectionHasNext = Boolean(collectionQuery.data?.pageInfo.hasNextPage);
  const catalogCursor = catalogQuery.data?.pageInfo.endCursor ?? null;

  const scanned = useMemo(() => {
    if (!needsFallback) return collectionQuery.data?.products ?? [];
    const all = catalogQuery.data?.products ?? [];
    return all.filter(product => categoryMatches(product, slug));
  }, [catalogQuery.data, collectionQuery.data, needsFallback, slug]);

  // Two pagination mechanisms on purpose:
  //   - collection mode appends into the react-query cache (setData), so the
  //     single source of truth stays the query;
  //   - fallback mode accumulates locally because each backend page has to be
  //     filtered by category before anything can be shown.
  const products = needsFallback ? [...scanned, ...extra] : scanned;

  const hasMore = needsFallback
    ? Boolean(catalogQuery.data?.pageInfo.hasNextPage && !loadingMore)
    : collectionHasNext;

  useEffect(() => {
    applyRouteMeta({
      title: `${label} — Arte Que Veste`,
      description: `${blurb} Veja preço, tamanhos e disponibilidade das peças publicadas no catálogo.`,
      canonical: `/categoria/${slug}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: label,
        description: blurb,
      },
    });
  }, [blurb, label, slug]);

  const isLoading =
    collectionQuery.isLoading || (needsFallback && catalogQuery.isLoading);
  const isError =
    collectionQuery.isError || (needsFallback && catalogQuery.isError);
  const mode = needsFallback
    ? (catalogQuery.data?.mode ?? "unconfigured")
    : (collectionQuery.data?.mode ?? "unconfigured");

  /**
   * "Ver mais" walks the real cursor.
   *
   * In collection mode one click = one page. In fallback mode a page can
   * contain zero matches (the catalog is filtered locally by product type and
   * tag), so the loop keeps pulling pages — bounded by FALLBACK_SCAN_LIMIT —
   * until it finds matches or the catalog ends. The button disappears exactly
   * when the backend says there is nothing left, never before.
   */
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      if (!needsFallback) {
        const next = collectionQuery.data?.pageInfo.endCursor ?? null;
        if (!next) return;
        const page = await utils.commerce.collections.page.fetch({
          handle: slug,
          first: PAGE_SIZE,
          sort,
          after: next,
        });
        setExtra(current => [...current, ...(page?.products ?? [])]);
        setCursor(next);
        // Refresh the underlying query data so `hasNextPage` moves forward.
        utils.commerce.collections.page.setData(
          { handle: slug, first: PAGE_SIZE, sort },
          current => {
            if (!current) return page ?? undefined;
            return {
              ...current,
              products: [...current.products, ...(page?.products ?? [])],
              pageInfo: page?.pageInfo ?? current.pageInfo,
            };
          }
        );
        return;
      }

      let after = catalogCursor;
      let found: Product[] = [];
      for (let attempt = 0; attempt < FALLBACK_SCAN_LIMIT; attempt++) {
        if (!after) break;
        const page = await utils.commerce.products.list.fetch({
          first: 60,
          after,
          sort,
        });
        const matches = page.products.filter(product =>
          categoryMatches(product, slug)
        );
        found = [...found, ...matches];
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
        if (matches.length) break;
      }
      // The catalog query owns `pageInfo`; push its cursor forward so `hasMore`
      // and the next click stay in sync with what was actually consumed.
      utils.commerce.products.list.setData({ first: 60, sort }, current =>
        current
          ? {
              ...current,
              pageInfo: { hasNextPage: Boolean(after), endCursor: after },
            }
          : current
      );
      setCursor(after);
      setExtra(current => [...current, ...found]);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <StorefrontLayout>
      <SiteHeader variant="compact" />
      <main className="aqv-container py-10 md:py-14">
        <nav
          aria-label="Você está em"
          className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.13em] text-[var(--aqv-muted)]"
        >
          <Link href="/" className="hover:text-[var(--aqv-accent)]">
            Início
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--aqv-ink)]">{label}</span>
        </nav>

        <header className="mt-6 border-b border-[var(--aqv-line)] pb-8">
          <p className="aqv-kicker">Categoria</p>
          <h1 className="mt-3 font-display text-6xl leading-[0.9] tracking-[-0.08em] md:text-7xl">
            {label}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--aqv-muted)]">
            {collectionQuery.data?.collection?.description?.trim() || blurb}
          </p>
        </header>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p
            className="text-[11px] uppercase tracking-[0.13em] text-[var(--aqv-muted)]"
            role="status"
            aria-live="polite"
          >
            {isLoading
              ? "Carregando peças…"
              : `${products.length} ${products.length === 1 ? "peça" : "peças"}`}
          </p>
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="aqv-category-sort"
            onClick={() => setFiltersOpen(value => !value)}
            className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--aqv-muted)] hover:text-[var(--aqv-ink)]"
          >
            <SlidersHorizontal size={13} aria-hidden="true" /> Ordenar
          </button>
        </div>

        {filtersOpen && (
          <div
            id="aqv-category-sort"
            className="mt-4 flex flex-wrap gap-2 border border-[var(--aqv-line)] bg-[var(--aqv-surface)] p-4"
          >
            {(Object.keys(PRODUCT_SORT_LABELS) as ProductSort[])
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
            <StorefrontMessage
              kicker="Catálogo indisponível"
              title="Não foi possível carregar esta categoria agora."
              body="A loja continua no ar. Tente novamente em instantes; se persistir, o catálogo Shopify pode estar temporariamente fora do ar."
              action={{
                label: "Tentar novamente",
                onClick: () => collectionQuery.refetch(),
              }}
              tone="alert"
            />
          ) : products.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={index < 4}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="border border-[var(--aqv-ink)] px-6 py-4 text-[10px] font-medium uppercase tracking-[0.15em] transition hover:bg-[var(--aqv-ink)] hover:text-white disabled:opacity-50"
                  >
                    {loadingMore ? "Carregando…" : "Ver mais peças"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-8">
              <StorefrontMessage
                kicker="Categoria publicada"
                title={`Ainda não há peças em ${label}.`}
                body="Quando o ateliê publicar uma peça com este tipo de produto ou a etiqueta aqv:categoria correspondente no Shopify, ela aparece aqui automaticamente. Nenhuma peça é inventada para preencher a grade."
                action={{ label: "Ver todas as peças", href: "/" }}
              />
              <LaunchNotice mode={mode} />
            </div>
          )}
        </div>

        <section
          aria-label="Outras categorias"
          className="mt-16 border-t border-[var(--aqv-line)] pt-8"
        >
          <p className="aqv-kicker text-[var(--aqv-muted)]">
            Continue navegando
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {STOREFRONT_CATEGORIES.filter(
              category => category.slug !== slug
            ).map(category => (
              <li key={category.slug}>
                <Link
                  href={`/categoria/${category.slug}`}
                  className="inline-flex items-center gap-2 border border-[var(--aqv-line)] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.13em] transition hover:border-[var(--aqv-accent)] hover:text-[var(--aqv-accent)]"
                >
                  {category.label} <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </StorefrontLayout>
  );
}

function UnknownCategory({ slug }: { slug: string }) {
  useEffect(() => {
    applyRouteMeta({
      title: "Categoria não encontrada — Arte Que Veste",
      description: "Esta categoria não existe no catálogo da Arte Que Veste.",
      noindex: true,
    });
  }, []);

  return (
    <StorefrontLayout>
      <SiteHeader variant="compact" />
      <main className="aqv-container py-16">
        <StorefrontMessage
          kicker="Categoria desconhecida"
          title={`Não temos uma categoria chamada “${slug || "—"}”.`}
          body="Estas são as categorias publicadas pela loja. Nenhuma peça é agrupada por adivinhação: o catálogo usa o tipo de produto e as etiquetas reais do Shopify."
          action={{ label: "Ver todas as peças", href: "/" }}
          tone="alert"
        />
        <ul className="mt-8 flex flex-wrap gap-2">
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
      </main>
      <SiteFooter />
    </StorefrontLayout>
  );
}
