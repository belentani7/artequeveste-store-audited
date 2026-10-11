import { describe, expect, it } from "vitest";
import { formatInstallmentHint, formatMoney, formatPriceRange } from "./format";

describe("formatMoney", () => {
  it("formats BRL amounts in pt-BR with two decimals", () => {
    // Non-breaking space is what Intl emits between "R$" and the number.
    expect(formatMoney({ amount: "290", currencyCode: "BRL" })).toMatch(
      /^R\$\s290,00$/
    );
    expect(formatMoney({ amount: "1290.50", currencyCode: "BRL" })).toMatch(
      /^R\$\s1\.290,50$/
    );
  });

  it("accepts raw strings and numbers, defaulting to BRL", () => {
    expect(formatMoney("49.9")).toMatch(/^R\$\s49,90$/);
    expect(formatMoney(1500)).toMatch(/^R\$\s1\.500,00$/);
    expect(formatMoney(12.5, "USD")).toMatch(/\$/);
  });

  it("returns a dash instead of NaN when the amount is missing or broken", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney("não é número")).toBe("—");
    expect(formatMoney(Number.NaN)).toBe("—");
  });
});

describe("formatPriceRange", () => {
  it("collapses to a single price when every variant costs the same", () => {
    const price = { amount: "290.00", currencyCode: "BRL" };
    expect(formatPriceRange({ min: price, max: price })).toMatch(
      /^R\$\s290,00$/
    );
  });

  it("shows both ends when variants differ", () => {
    const range = {
      min: { amount: "290.00", currencyCode: "BRL" },
      max: { amount: "330.00", currencyCode: "BRL" },
    };
    expect(formatPriceRange(range)).toMatch(/^R\$\s290,00\s–\sR\$\s330,00$/);
  });
});

describe("formatInstallmentHint", () => {
  it("asks a question instead of promising interest-free installments", () => {
    const hint = formatInstallmentHint({
      amount: "300.00",
      currencyCode: "BRL",
    });
    expect(hint).toMatch(/^ou 3x de R\$\s100,00 no cartão$/);
    // Never claim "sem juros": the storefront does not know the merchant's rules.
    expect(hint).not.toContain("sem juros");
  });

  it("falls back to the checkout for unusable amounts", () => {
    expect(formatInstallmentHint("0")).toBe("Parcelamento no checkout");
    expect(formatInstallmentHint(Number.NaN)).toBe("Parcelamento no checkout");
  });
});
