import { Link } from "wouter";
import { STOREFRONT_CATEGORIES } from "@shared/storefrontRules";

/**
 * Storefront footer.
 *
 * Every link here resolves to a real route or a real section — the audit
 * flagged a decorative "Acessórios" link that led nowhere, so the category
 * column is generated from the same list the catalog pages use.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--aqv-line)] bg-[var(--aqv-ink)] text-white">
      <div className="aqv-container grid gap-10 py-14 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="aqv-wordmark text-white">ARTE QUE VESTE</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/65">
            Roupas autorais brasileiras. Peças publicadas no catálogo Shopify do
            titular, com preço, tamanho e disponibilidade reais.
          </p>
        </div>

        <nav aria-label="Categorias" className="text-sm">
          <p className="aqv-kicker text-white/50">Categorias</p>
          <ul className="mt-4 space-y-2 text-white/70">
            {STOREFRONT_CATEGORIES.map(category => (
              <li key={category.slug}>
                <Link
                  href={`/categoria/${category.slug}`}
                  className="hover:text-white"
                >
                  {category.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/busca" className="hover:text-white">
                Busca
              </Link>
            </li>
          </ul>
        </nav>

        <div className="text-sm">
          <p className="aqv-kicker text-white/50">Atendimento</p>
          <ul className="mt-4 space-y-2 text-white/70">
            <li>
              <Link href="/trocas" className="hover:text-white">
                Trocas e devoluções
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className="hover:text-white">
                Privacidade e LGPD
              </Link>
            </li>
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-white/50">
            Frete, prazo e formas de pagamento são exibidos no checkout,
            conforme a configuração do titular da loja.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="aqv-container flex flex-col gap-2 py-6 text-[10px] uppercase tracking-[0.13em] text-white/45 md:flex-row md:justify-between">
          <span>ARTE QUE VESTE / 2026</span>
          <span>Conceito e identidade digital por Pedro Belentani</span>
        </div>
      </div>
    </footer>
  );
}
