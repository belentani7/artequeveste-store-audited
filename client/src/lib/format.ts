import type { Money } from "@shared/commerce/types";

/**
 * Format a Money or raw amount string into a localized currency string.
 * Falls back to `$X` rounding if Intl rejects the currency code.
 */
export function formatMoney(
  value: Money | string | number | null | undefined,
  currencyCode?: string
): string {
  if (value === null || value === undefined) return "—";

  let amountNum: number;
  let code: string;

  if (typeof value === "object") {
    amountNum = Number.parseFloat(value.amount);
    code = value.currencyCode;
  } else {
    amountNum = typeof value === "string" ? Number.parseFloat(value) : value;
    code = currencyCode ?? "BRL";
  }

  if (!Number.isFinite(amountNum)) return "—";

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: code,
      // Brazilian retail habit: whole reais read as "R$ 290", cents only when
      // the price actually has them. Both cases keep 2 decimals in the
      // currency style so "R$ 290,00" never becomes "R$ 290" mid-cart.
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountNum);
  } catch {
    return `R$ ${amountNum.toFixed(2).replace(".", ",")}`;
  }
}

/** "R$ 190,00 – R$ 240,00" or a single price when min equals max. */
export function formatPriceRange(range: { min: Money; max: Money }): string {
  if (
    range.min.amount === range.max.amount &&
    range.min.currencyCode === range.max.currencyCode
  ) {
    return formatMoney(range.min);
  }
  return `${formatMoney(range.min)} – ${formatMoney(range.max)}`;
}

/**
 * Installment hint in the Brazilian "3x sem juros" style.
 *
 * IMPORTANT: the storefront does not know the merchant's real installment
 * rules, so this stays a *question*, never a promise. A fake "sem juros"
 * claim would be a consumer-law problem, not a marketing win.
 */
export function formatInstallmentHint(
  amount: Money | string | number,
  installments = 3
): string {
  const value =
    typeof amount === "object"
      ? Number.parseFloat(amount.amount)
      : Number(amount);
  if (!Number.isFinite(value) || value <= 0) return "Parcelamento no checkout";
  const each = value / installments;
  return `ou ${installments}x de ${formatMoney(each)} no cartão`;
}
