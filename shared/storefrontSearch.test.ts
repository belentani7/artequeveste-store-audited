import { describe, expect, it } from "vitest";
import {
  MAX_STOREFRONT_SEARCH_LENGTH,
  normalizeStorefrontSearchTerm,
  resolveStorefrontSearch,
  storefrontSearchPath,
} from "./storefrontSearch";

describe("shared storefront search rules", () => {
  it("keeps product words while stripping Shopify query operators", () => {
    expect(normalizeStorefrontSearchTerm(" vestido:3XL ")).toBe("vestido 3XL");
    expect(normalizeStorefrontSearchTerm("  quimono azul ")).toBe("quimono azul");
  });

  it("distinguishes browsing from operator-only input", () => {
    expect(resolveStorefrontSearch("   ")).toEqual({
      kind: "browse",
      term: "",
    });
    expect(resolveStorefrontSearch(": * ( ) -")).toEqual({
      kind: "invalid",
      term: "",
    });
    expect(resolveStorefrontSearch("vestido:3XL")).toEqual({
      kind: "search",
      term: "vestido 3XL",
    });
  });

  it("rejects control characters and operator-only payloads", () => {
    expect(normalizeStorefrontSearchTerm("<>\u0000\n")).toBe("");
    expect(resolveStorefrontSearch("<<>>")).toEqual({
      kind: "invalid",
      term: "",
    });
  });

  it("enforces the same 80-character limit as the API", () => {
    expect(
      normalizeStorefrontSearchTerm("a".repeat(MAX_STOREFRONT_SEARCH_LENGTH + 10))
    ).toBe("a".repeat(MAX_STOREFRONT_SEARCH_LENGTH));
  });

  it("builds a shareable URL while preserving browser history", () => {
    expect(storefrontSearchPath(" quimono azul ")).toBe(
      "/busca?q=quimono%20azul"
    );
    expect(storefrontSearchPath(" ")).toBe("/busca");
  });
});
