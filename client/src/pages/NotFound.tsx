import { useEffect } from "react";
import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "wouter";
import StorefrontLayout from "@/components/commerce/StorefrontLayout";
import SiteHeader from "@/components/commerce/SiteHeader";
import SiteFooter from "@/components/commerce/SiteFooter";
import { applyRouteMeta } from "@/lib/seo";
import { STOREFRONT_CATEGORIES } from "@shared/storefrontRules";

/**
 * 404 — a storefront route, not a dead end.
 *
 * The previous version offered a single "back to the store" button. A shopper
 * who mistyped a product URL should be able to continue shopping: this page
 * restates the real categories, links to search and keeps the header (with the
 * working cart) intact.
 */
export default function NotFound() {
  useEffect(() => {
    applyRouteMeta({
      title: "Página não encontrada — Arte Que Veste",
      description:
        "O endereço procurado não existe nesta loja. Continue a partir do catálogo.",
      noindex: true,
    });
  }, []);

  const suggestions = [
    ...STOREFRONT_CATEGORIES.map(category => ({
      label: category.label,
      href: `/categoria/${category.slug}`,
    })),
    { label: "Buscar peça", href: "/busca" },
    { label: "Início", href: "/" },
  ];

  return (
    <StorefrontLayout>
      <SiteHeader variant="compact" />
      <main className="aqv-container flex min-h-[70vh] flex-col items-center justify-center py-16">
        <section
          aria-labelledby="not-found-title"
          className="relative w-full max-w-2xl overflow-hidden border border-[var(--aqv-ink)] bg-[var(--aqv-surface)] p-8 text-center shadow-[10px_10px_0_var(--aqv-accent)] md:p-12"
        >
          <div
            className="pointer-events-none absolute inset-4 border border-[var(--aqv-ink)]/15"
            aria-hidden="true"
          />
          <div className="relative mx-auto mb-7 grid h-16 w-16 place-items-center border border-[var(--aqv-accent)] text-[var(--aqv-accent)]">
            <Compass className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="relative aqv-kicker text-[var(--aqv-accent)]">
            Arte Que Veste / rota ausente
          </p>
          <h1
            id="not-found-title"
            className="relative mt-3 font-display text-8xl leading-none tracking-[-0.08em]"
          >
            404
          </h1>
          <h2 className="relative mt-4 font-display text-3xl tracking-[-0.06em]">
            Esta página saiu do caminho.
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--aqv-muted)]">
            O endereço que você procurou não está disponível. Escolha um caminho
            abaixo e continue pela coleção.
          </p>

          <nav aria-label="Sugestões de navegação" className="relative mt-8">
            <ul className="flex flex-wrap justify-center gap-2">
              {suggestions.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex border border-[var(--aqv-line)] bg-[var(--aqv-paper)] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.13em] transition hover:border-[var(--aqv-accent)] hover:text-[var(--aqv-accent)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Link
            href="/"
            className="relative mt-8 inline-flex items-center gap-2 bg-[var(--aqv-ink)] px-6 py-4 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--aqv-accent)] focus-visible:outline-offset-4"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para a
            loja
          </Link>
        </section>

        <p className="mt-8 text-center text-xs text-[var(--aqv-muted)]">
          Procurando uma peça específica?{" "}
          <Link href="/busca" className="underline underline-offset-4">
            Use a busca
          </Link>{" "}
          ou consulte as{" "}
          <Link href="/trocas" className="underline underline-offset-4">
            políticas de troca
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </StorefrontLayout>
  );
}
