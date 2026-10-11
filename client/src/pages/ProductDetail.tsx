import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Ruler,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import SiteHeader from "@/components/commerce/SiteHeader";
import SiteFooter from "@/components/commerce/SiteFooter";
import StorefrontLayout, {
  StorefrontMessage,
} from "@/components/commerce/StorefrontLayout";
import ProductCard from "@/components/commerce/ProductCard";
import { applyRouteMeta } from "@/lib/seo";
import { formatInstallmentHint, formatMoney } from "@/lib/format";
import type { ProductVariant } from "@shared/commerce/types";
import { discountPercent } from "@shared/storefrontRules";

function optionValue(variant: ProductVariant | undefined, name: string) {
  return variant?.selectedOptions.find(
    item => item.name.toLowerCase() === name.toLowerCase()
  )?.value;
}

/**
 * Product detail page — the page Baymard's apparel research says decides the
 * sale. Beyond the previous version it now has:
 *   - a gallery with keyboard-reachable thumbnails and real alt text;
 *   - an option picker that reflects *stock*, disabling sold-out values;
 *   - a size guide built from the titular's metafields, with an honest
 *     "not published yet" state instead of invented measurements;
 *   - real discounts only when Shopify publishes a compare-at price;
 *   - brand shell + cart on loading, error and 404 states.
 */
export default function ProductDetail() {
  const [, params] = useRoute("/produto/:handle");
  const handle = params?.handle ?? "";
  const {
    data: product,
    isLoading,
    isError,
    refetch,
  } = trpc.commerce.products.byHandle.useQuery(
    { handle },
    { retry: 1, enabled: Boolean(handle) }
  );
  const { addItem, openCart, loading, itemCount } = useCart();

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [imageIndex, setImageIndex] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // A new handle is a new product: clear any picker state from the previous one.
  useEffect(() => {
    setSelected({});
    setImageIndex(0);
    setGuideOpen(false);
    setFeedback(null);
  }, [handle]);

  const selectedVariant = useMemo(() => {
    if (!product) return undefined;
    const keys = Object.keys(selected);
    if (keys.length) {
      const exact = product.variants.find(variant =>
        keys.every(key => optionValue(variant, key) === selected[key])
      );
      if (exact) return exact;
    }
    return (
      product.variants.find(variant => variant.availableForSale) ??
      product.variants[0]
    );
  }, [product, selected]);

  useEffect(() => {
    if (!product) return;
    const image = product.images[0];
    applyRouteMeta({
      title: `${product.title} — Arte Que Veste`,
      description:
        product.description?.trim().slice(0, 155) ||
        `${product.title} da coleção Arte Que Veste 2026. Consulte preço, tamanhos e disponibilidade.`,
      canonical: `/produto/${product.handle}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description || undefined,
        image: product.images.map(item => item.url),
        brand: { "@type": "Brand", name: "Arte Que Veste" },
        category: product.productType ?? undefined,
        offers: product.variants.map(variant => ({
          "@type": "Offer",
          sku: variant.id,
          name: variant.title,
          price: variant.price.amount,
          priceCurrency: variant.price.currencyCode,
          availability: variant.availableForSale
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: `/produto/${product.handle}`,
        })),
      },
    });
  }, [product]);

  const cartBadge = (
    <button
      type="button"
      aria-label={`Abrir carrinho${itemCount > 0 ? `, ${itemCount} ${itemCount === 1 ? "item" : "itens"}` : ""}`}
      onClick={openCart}
      className="relative p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--aqv-accent)] focus-visible:outline-offset-3"
    >
      <ShoppingBag size={19} aria-hidden="true" />
      {itemCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-[var(--aqv-accent)] px-1 text-[9px] text-white"
        >
          {itemCount}
        </span>
      )}
    </button>
  );

  const compactHeader = (
    <header className="sticky top-0 z-40 border-b border-[var(--aqv-line)] bg-[var(--aqv-paper)]/95 backdrop-blur">
      <div className="aqv-container flex h-[72px] items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.15em]"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Loja
        </Link>
        <Link href="/" className="aqv-wordmark">
          ARTE QUE VESTE
        </Link>
        {cartBadge}
      </div>
    </header>
  );

  if (isLoading) {
    return (
      <StorefrontLayout>
        {compactHeader}
        <main className="aqv-container py-16" aria-busy="true">
          <p className="aqv-kicker">Preparando a peça</p>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div
              className="min-h-[55vh] animate-pulse bg-[var(--aqv-surface-2)]"
              aria-hidden="true"
            />
            <div className="space-y-4">
              <div
                className="h-5 w-32 animate-pulse bg-[var(--aqv-surface-2)]"
                aria-hidden="true"
              />
              <div
                className="h-24 w-3/4 animate-pulse bg-[var(--aqv-surface-2)]"
                aria-hidden="true"
              />
              <div
                className="h-4 w-1/2 animate-pulse bg-[var(--aqv-surface-2)]"
                aria-hidden="true"
              />
            </div>
          </div>
        </main>
      </StorefrontLayout>
    );
  }

  if (isError || !product) {
    return (
      <StorefrontLayout>
        {compactHeader}
        <main className="aqv-container py-16">
          <StorefrontMessage
            kicker="Pausa de coleção"
            title="Esta peça ainda não está disponível."
            body="Ela pode ter saído do catálogo ou o endereço está incorreto. Volte à loja para ver as peças publicadas, ou tente novamente se a conexão oscilou."
            action={{ label: "Tentar novamente", onClick: () => refetch() }}
            tone="alert"
          />
          <div className="mt-6">
            <Link
              href="/"
              className="text-[10px] font-medium uppercase tracking-[0.15em] underline underline-offset-8"
            >
              Voltar à loja
            </Link>
          </div>
        </main>
        <SiteFooter />
      </StorefrontLayout>
    );
  }

  const image = product.images[imageIndex] ?? product.images[0];
  const available = product.variants.some(variant => variant.availableForSale);
  const discount = selectedVariant ? discountPercent(selectedVariant) : null;
  const sizeOption = product.options.find(option =>
    /tamanho|size|numera/i.test(option.name)
  );
  const sizeChart = product.metafields?.sizeChart;
  const details = [
    { label: "Composição", value: product.metafields?.composition },
    { label: "Cuidados", value: product.metafields?.careInstructions },
    { label: "Medidas da peça", value: product.metafields?.measurements },
    { label: "Ajuste", value: product.metafields?.fitNotes },
    { label: "Sobre a modelo", value: product.metafields?.modelInfo },
  ].filter(item => Boolean(item.value?.trim()));

  return (
    <StorefrontLayout>
      <SiteHeader variant="compact" />

      <main className="aqv-container py-8 md:py-14">
        <nav
          aria-label="Você está em"
          className="mb-6 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.13em] text-[var(--aqv-muted)]"
        >
          <Link href="/" className="hover:text-[var(--aqv-accent)]">
            Início
          </Link>
          <span aria-hidden="true">/</span>
          <span>{product.productType || "Peça autoral"}</span>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--aqv-ink)]">{product.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <section aria-label="Imagens do produto">
            <div className="relative aspect-[4/5] overflow-hidden bg-[var(--aqv-surface-2)]">
              {image ? (
                <img
                  src={image.url}
                  alt={
                    image.altText ??
                    `${product.title} — imagem ${imageIndex + 1}`
                  }
                  width={image.width}
                  height={image.height}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.15em] text-[var(--aqv-muted)]">
                  Imagem em preparação
                </div>
              )}
              {discount !== null && (
                <span className="absolute left-4 top-4 bg-[var(--aqv-accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                  -{discount}%
                </span>
              )}
              {product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Imagem anterior"
                    onClick={() =>
                      setImageIndex(
                        value =>
                          (value - 1 + product.images.length) %
                          product.images.length
                      )
                    }
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85"
                  >
                    <ArrowLeft size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próxima imagem"
                    onClick={() =>
                      setImageIndex(
                        value => (value + 1) % product.images.length
                      )
                    }
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85"
                  >
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {product.images.slice(0, 5).map((item, index) => (
                  <button
                    key={item.url}
                    type="button"
                    aria-label={`Ver imagem ${index + 1} de ${product.images.length} de ${product.title}`}
                    aria-current={index === imageIndex}
                    onClick={() => setImageIndex(index)}
                    className={`aspect-square overflow-hidden border-2 transition ${
                      index === imageIndex
                        ? "border-[var(--aqv-accent)]"
                        : "border-transparent hover:border-[var(--aqv-line)]"
                    }`}
                  >
                    <img
                      src={item.url}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Informações de compra" className="lg:pt-5">
            <p className="aqv-kicker">
              {product.productType || "Peça autoral"} · Arte Que Veste
            </p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[0.9] tracking-[-0.08em] md:text-7xl">
              {product.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <p className="text-lg font-medium">
                {formatMoney(selectedVariant?.price ?? product.priceRange.min)}
              </p>
              {selectedVariant?.compareAtPrice && discount !== null && (
                <p className="text-sm text-[var(--aqv-muted)] line-through">
                  {formatMoney(selectedVariant.compareAtPrice)}
                </p>
              )}
              <p className="text-xs text-[var(--aqv-muted)]">
                {formatInstallmentHint(
                  selectedVariant?.price ?? product.priceRange.min
                )}
              </p>
            </div>

            {product.description && (
              <p className="mt-7 max-w-xl text-sm leading-relaxed text-[var(--aqv-muted)]">
                {product.description}
              </p>
            )}

            <div className="mt-10 space-y-8">
              {product.options.map(option => {
                const isSize = /tamanho|size|numera/i.test(option.name);
                return (
                  <div key={option.name}>
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p
                        id={`opt-${option.name}`}
                        className="text-[10px] font-medium uppercase tracking-[0.15em]"
                      >
                        {option.name}
                        {selectedVariant && (
                          <span className="ml-2 font-normal normal-case tracking-normal text-[var(--aqv-muted)]">
                            {optionValue(selectedVariant, option.name)}
                          </span>
                        )}
                      </p>
                      {isSize && (
                        <button
                          type="button"
                          aria-expanded={guideOpen}
                          aria-controls="size-guide"
                          onClick={() => setGuideOpen(value => !value)}
                          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] underline underline-offset-4"
                        >
                          <Ruler size={13} aria-hidden="true" /> Guia de
                          tamanhos
                        </button>
                      )}
                    </div>

                    <div
                      role="group"
                      aria-labelledby={`opt-${option.name}`}
                      className="flex flex-wrap gap-2"
                    >
                      {option.values.map(value => {
                        const active =
                          optionValue(selectedVariant, option.name) === value;
                        const hasStock = product.variants.some(
                          variant =>
                            variant.availableForSale &&
                            optionValue(variant, option.name) === value
                        );
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={active}
                            disabled={!hasStock}
                            onClick={() =>
                              setSelected(current => ({
                                ...current,
                                [option.name]: value,
                              }))
                            }
                            className={`min-w-14 border px-4 py-3 text-xs transition ${
                              active
                                ? "border-[var(--aqv-ink)] bg-[var(--aqv-ink)] text-white"
                                : "border-[var(--aqv-line)]"
                            } ${!hasStock ? "cursor-not-allowed opacity-35 line-through" : "hover:border-[var(--aqv-accent)]"}`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>

                    {isSize && guideOpen && (
                      <div
                        id="size-guide"
                        role="region"
                        aria-label="Guia de tamanhos"
                        className="mt-4 border-l-2 border-[var(--aqv-accent)] bg-[var(--aqv-surface)] p-4 text-xs leading-relaxed text-[var(--aqv-muted)]"
                      >
                        {sizeChart?.length ? (
                          <>
                            <table className="w-full border-collapse text-left">
                              <caption className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aqv-ink)]">
                                Medidas publicadas pelo ateliê
                              </caption>
                              <thead>
                                <tr>
                                  {Object.keys(sizeChart[0]).map(header => (
                                    <th
                                      key={header}
                                      scope="col"
                                      className="border-b border-[var(--aqv-line)] py-2 pr-3 font-medium text-[var(--aqv-ink)]"
                                    >
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sizeChart.map((row, index) => (
                                  <tr key={index}>
                                    {Object.keys(sizeChart[0]).map(header => (
                                      <td
                                        key={header}
                                        className="border-b border-[var(--aqv-line)] py-2 pr-3"
                                      >
                                        {row[header] ?? "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p className="mt-3">
                              Medidas em centímetros, com variação de até 2 cm
                              por peça.
                            </p>
                          </>
                        ) : (
                          <p>
                            Os tamanhos disponíveis são exatamente as variantes
                            publicadas no catálogo. A tabela de medidas
                            detalhada aparece aqui assim que o ateliê cadastrar
                            o metafield{" "}
                            <code className="text-[10px]">aqv.size_chart</code>{" "}
                            da peça — nenhuma medida é estimada pela loja.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="border-y border-[var(--aqv-line)] py-5 text-sm">
                <div className="flex items-center gap-3">
                  <Check
                    size={16}
                    className="text-[var(--aqv-accent)]"
                    aria-hidden="true"
                  />
                  {available ? "Disponível para compra" : "Esgotado"}
                  {selectedVariant && available && (
                    <span className="text-xs text-[var(--aqv-muted)]">
                      · {selectedVariant.title}
                    </span>
                  )}
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs text-[var(--aqv-muted)]">
                  <Truck
                    size={14}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  Frete, prazo e meios de pagamento são calculados no checkout,
                  com as regras do titular.
                </p>
              </div>

              <button
                type="button"
                disabled={!selectedVariant?.availableForSale || loading}
                onClick={async () => {
                  if (!selectedVariant) return;
                  await addItem(selectedVariant.id);
                  setFeedback(
                    selectedVariant.availableForSale
                      ? "Peça adicionada ao carrinho."
                      : "Esta variante está esgotada."
                  );
                  if (selectedVariant.availableForSale) openCart();
                }}
                className="flex h-14 w-full items-center justify-center gap-3 bg-[var(--aqv-ink)] text-[10px] font-medium uppercase tracking-[0.16em] text-white transition hover:bg-[var(--aqv-accent)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {selectedVariant?.availableForSale
                  ? "Adicionar ao carrinho"
                  : "Indisponível"}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
              <p role="status" aria-live="polite" className="sr-only">
                {feedback ?? ""}
              </p>
              {feedback && (
                <p className="text-xs text-[var(--aqv-muted)]">{feedback}</p>
              )}

              {!available && (
                <p className="text-xs leading-relaxed text-[var(--aqv-muted)]">
                  Esta peça está esgotada no catálogo publicado. Novas unidades
                  aparecem nesta mesma página quando o ateliê repõe o estoque —
                  não trabalhamos com lista de espera inventada.
                </p>
              )}
            </div>

            {details.length > 0 && (
              <dl className="mt-10 border-t border-[var(--aqv-line)] pt-6 text-xs">
                {details.map(item => (
                  <div
                    key={item.label}
                    className="border-b border-[var(--aqv-line)] py-3 md:grid md:grid-cols-[140px_1fr] md:gap-4"
                  >
                    <dt className="font-semibold uppercase tracking-[0.12em]">
                      {item.label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-line leading-relaxed text-[var(--aqv-muted)] md:mt-0">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-10 flex flex-wrap gap-4 border-t border-[var(--aqv-line)] pt-6 text-xs text-[var(--aqv-muted)]">
              <Link href="/trocas" className="underline underline-offset-4">
                Trocas e devoluções
              </Link>
              <Link
                href="/privacidade"
                className="underline underline-offset-4"
              >
                Privacidade e LGPD
              </Link>
              <span>Pagamento processado no checkout Shopify.</span>
            </div>
          </section>
        </div>

        {product.tags.length > 0 && (
          <section
            aria-label="Etiquetas da peça"
            className="mt-14 border-t border-[var(--aqv-line)] pt-6"
          >
            <ul className="flex flex-wrap gap-2">
              {product.tags
                .filter(tag => !/^aqv:/i.test(tag))
                .map(tag => (
                  <li
                    key={tag}
                    className="border border-[var(--aqv-line)] px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--aqv-muted)]"
                  >
                    {tag}
                  </li>
                ))}
            </ul>
          </section>
        )}
      </main>

      <SiteFooter />
    </StorefrontLayout>
  );
}
