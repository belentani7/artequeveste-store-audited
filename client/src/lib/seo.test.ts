// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { applyRouteMeta, clearRouteMeta } from "./seo";

const JSON_LD_ID = "aqv-route-jsonld";

beforeEach(() => {
  document.head.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("applyRouteMeta", () => {
  it("sets title, description and canonical from scratch", () => {
    applyRouteMeta({
      title: "Camisetas — Arte Que Veste",
      description: "Malharia autoral.",
      canonical: "/categoria/camisetas",
    });

    expect(document.title).toBe("Camisetas — Arte Que Veste");
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
    ).toBe("Malharia autoral.");
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")
    ).toBe("http://localhost:3000/categoria/camisetas");
  });

  it("is idempotent across navigations (no duplicated tags)", () => {
    applyRouteMeta({ title: "A", description: "descrição A" });
    applyRouteMeta({ title: "B", description: "descrição B" });

    expect(
      document.head.querySelectorAll('meta[name="description"]')
    ).toHaveLength(1);
    expect(
      document.head.querySelectorAll('link[rel="canonical"]')
    ).toHaveLength(1);
    expect(document.title).toBe("B");
  });

  it("adds noindex only for the routes that ask for it", () => {
    applyRouteMeta({
      title: "Busca",
      description: "resultados",
      noindex: true,
    });
    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute("content")
    ).toBe("noindex,follow");

    applyRouteMeta({ title: "Home", description: "loja" });
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("replaces the JSON-LD block instead of stacking stale structured data", () => {
    applyRouteMeta({
      title: "Produto",
      description: "peça",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Quimono",
      },
    });
    applyRouteMeta({
      title: "Produto 2",
      description: "outra peça",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Camiseta",
      },
    });

    const blocks = document.querySelectorAll(`#${JSON_LD_ID}`);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].textContent).toContain("Camiseta");
    expect(blocks[0].textContent).not.toContain("Quimono");
  });

  it("removes the structured data when the next route has none", () => {
    applyRouteMeta({
      title: "Produto",
      description: "peça",
      jsonLd: { "@type": "Product" },
    });
    applyRouteMeta({ title: "Home", description: "loja" });
    expect(document.getElementById(JSON_LD_ID)).toBeNull();
  });

  it("uses the current path when no canonical is provided", () => {
    window.history.replaceState(null, "", "/busca?q=quimono");
    applyRouteMeta({ title: "Busca", description: "resultados" });
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")
    ).toBe("http://localhost:3000/busca?q=quimono");
  });
});

describe("clearRouteMeta", () => {
  it("drops the structured data block", () => {
    applyRouteMeta({
      title: "Produto",
      description: "peça",
      jsonLd: { "@type": "Product" },
    });
    clearRouteMeta();
    expect(document.getElementById(JSON_LD_ID)).toBeNull();
  });
});
