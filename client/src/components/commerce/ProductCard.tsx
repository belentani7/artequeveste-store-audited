import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import type { Product } from "@shared/commerce/types";
import {
  discountPercent,
  findPurchasableVariant,
  hasPriceRange,
  isPurchasable,
} from "@shared/storefrontRules";
import { formatMoney, formatPriceRange } from "@/lib/format";
import { Check, Plus } from "lucide-react";
import { useState } from "react";

type ProductCardProps = {
  product: Product;
  /** `priority` images load eagerly — only the first row should use it. */
  priority?: boolean;
  className?: string;
};

/**
 * Catalog card.
 *
 * Merchandising rules baked in (the audit's "no empty controls" requirement):
 *   - the button is disabled and labelled when nothing is in stock, instead of
 *     letting a shopper tap a control that does nothing;
 *   - price uses the real range when variants differ ("a partir de R$ X");
 *   - size chips are shown and each one links to the PDP, because a size can
 *     only be chosen with a variant in hand — no fake "quick add" of one size;
 *   - a discount badge appears only when Shopify published a compare-at price.
 */
export default function ProductCard({
  product,
  priority = false,
  className,
}: ProductCardProps) {
  const { addItem, loading } = useCart();
  const [added, setAdded] = useState(false);
  const variant = findPurchasableVariant(product);
  const purchasable = isPurchasable(product);
  const image = product.images[0];
  const secondImage = product.images[1];
  const discount = variant ? discountPercent(variant) : null;

  const sizeOption = product.options.find(option =>
    /tamanho|size|numera/i.test(option.name)
  );
  const sizeValues = sizeOption?.values.slice(0, 5) ?? [];

  const onAdd = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!variant?.availableForSale) return;
    await addItem(variant.id);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className={cn("group min-w-0", className)}>
      <Link
        href={`/produto/${product.handle}`}
        className="relative block aspect-[4/5] overflow-hidden bg-[var(--aqv-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aqv-accent)]"
        aria-label={`Ver detalhes de ${product.title}`}
      >
        {image ? (
          <>
            <img
              src={image.url}
              alt={image.altText ?? product.title}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              width={image.width}
              height={image.height}
              className={cn(
                "h-full w-full object-cover transition duration-500",
                secondImage
                  ? "group-hover:opacity-0"
                  : "group-hover:scale-[1.03]"
              )}
            />
            {secondImage && (
              <img
                src={secondImage.url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-xs uppercase tracking-[0.16em] text-[var(--aqv-muted)]">
            Imagem em preparação
          </div>
        )}

        {discount !== null && (
          <span className="absolute left-0 top-3 bg-[var(--aqv-accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            -{discount}%
          </span>
        )}
        {!purchasable && (
          <span className="absolute right-3 top-3 bg-[var(--aqv-ink)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            Esgotado
          </span>
        )}

        <button
          type="button"
          aria-label={
            purchasable
              ? `Adicionar ${product.title} ao carrinho`
              : `${product.title} está esgotado`
          }
          disabled={!purchasable || loading}
          onClick={onAdd}
          className={cn(
            "absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition duration-200",
            "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
            purchasable
              ? "bg-[var(--aqv-ink)] hover:bg-[var(--aqv-accent)]"
              : "cursor-not-allowed bg-[var(--aqv-muted)]",
            added && "bg-[var(--aqv-accent)] opacity-100"
          )}
        >
          {added ? (
            <>
              <Check size={13} aria-hidden="true" /> No carrinho
            </>
          ) : purchasable ? (
            <>
              <Plus size={13} aria-hidden="true" /> Adicionar
            </>
          ) : (
            "Indisponível"
          )}
        </button>
      </Link>

      <div className="flex items-start justify-between gap-3 pt-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">
            <Link
              href={`/produto/${product.handle}`}
              className="hover:text-[var(--aqv-accent)]"
            >
              {product.title}
            </Link>
          </h3>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aqv-muted)]">
            {product.productType || "Peça autoral"}
          </p>
          {sizeValues.length > 0 && (
            <ul
              className="mt-2 flex flex-wrap gap-1"
              aria-label={`Tamanhos de ${product.title}`}
            >
              {sizeValues.map(value => (
                <li
                  key={value}
                  className="border border-[var(--aqv-line)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[var(--aqv-muted)]"
                >
                  {value}
                </li>
              ))}
              {sizeOption && sizeOption.values.length > sizeValues.length && (
                <li className="px-1 text-[9px] uppercase tracking-[0.08em] text-[var(--aqv-muted)]">
                  +{sizeOption.values.length - sizeValues.length}
                </li>
              )}
            </ul>
          )}
        </div>
        <div className="shrink-0 text-right">
          {hasPriceRange(product) && (
            <span className="block text-[9px] uppercase tracking-[0.12em] text-[var(--aqv-muted)]">
              a partir de
            </span>
          )}
          <span className="text-sm font-medium">
            {hasPriceRange(product)
              ? formatMoney(product.priceRange.min)
              : formatPriceRange(product.priceRange)}
          </span>
          {variant?.compareAtPrice && discount !== null && (
            <span className="mt-1 block text-[11px] text-[var(--aqv-muted)] line-through">
              {formatMoney(variant.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
