import { useEffect } from "react";
import { Link } from "wouter";
import SiteHeader from "@/components/commerce/SiteHeader";
import SiteFooter from "@/components/commerce/SiteFooter";
import StorefrontLayout from "@/components/commerce/StorefrontLayout";
import { applyRouteMeta } from "@/lib/seo";

/**
 * Policy pages.
 *
 * The storefront must describe *processes* without inventing the merchant's
 * legal commitments (deadlines, addresses, CNPJ). Every page states the real
 * mechanism and points to the checkout/atendimento for the titular's numbers —
 * which is what the audit asked for: no fabricated legal claims.
 */

type PolicyContent = {
  path: string;
  kicker: string;
  title: string;
  description: string;
  sections: Array<{ heading: string; body: string }>;
};

const POLICIES: Record<string, PolicyContent> = {
  trocas: {
    path: "/trocas",
    kicker: "Atendimento",
    title: "Trocas e devoluções",
    description:
      "Como funcionam trocas, devoluções e o direito de arrependimento na Arte Que Veste.",
    sections: [
      {
        heading: "Direito de arrependimento",
        body: "Compras feitas online podem ser desistidas em até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor (art. 49). A solicitação é feita pelo canal de atendimento informado no checkout e na confirmação do pedido.",
      },
      {
        heading: "Troca por tamanho ou modelo",
        body: "Solicite a troca pelo canal de atendimento antes de devolver a peça. A peça deve estar sem uso, com etiqueta e embalagem original. O prazo e o custo do frete de retorno seguem a política configurada pelo titular da loja no checkout — a loja não inventa prazos aqui.",
      },
      {
        heading: "Defeito de fabricação",
        body: "Peças com defeito de fabricação são analisadas pelo ateliê. Envie fotos e o número do pedido pelo canal de atendimento; a tratativa ocorre conforme o CDC.",
      },
      {
        heading: "Reembolso",
        body: "Quando aplicável, o reembolso é feito pelo mesmo meio de pagamento usado na compra, após a conferência da peça devolvida. O prazo de crédito depende da operadora do cartão ou do banco.",
      },
    ],
  },
  privacidade: {
    path: "/privacidade",
    kicker: "LGPD",
    title: "Privacidade e proteção de dados",
    description:
      "Quais dados a loja coleta, por quê e como você pode revogar o consentimento.",
    sections: [
      {
        heading: "Dados essenciais",
        body: "Para operar a loja usamos apenas o necessário: identificador de carrinho (guardado no seu navegador) e registros técnicos de acesso. Sem eles, o carrinho e o checkout não funcionam.",
      },
      {
        heading: "Analítica opcional",
        body: "A medição de audiência só é ativada se você escolher “Aceitar analítica” no aviso de privacidade. A escolha fica guardada neste navegador e pode ser revista limpando os dados do site — nada é carregado antes da sua decisão.",
      },
      {
        heading: "Pedido e pagamento",
        body: "Os dados de pedido, entrega e pagamento são coletados e processados no checkout do Shopify, conforme as políticas do titular da loja e dos meios de pagamento habilitados.",
      },
      {
        heading: "Seus direitos",
        body: "Você pode solicitar confirmação de tratamento, correção e exclusão de dados pelo canal de atendimento. A loja responde conforme a LGPD (Lei 13.709/2018).",
      },
    ],
  },
};

export function PolicyPage({
  policyKey,
}: {
  policyKey: keyof typeof POLICIES;
}) {
  const content = POLICIES[policyKey];

  useEffect(() => {
    if (!content) return;
    applyRouteMeta({
      title: `${content.title} — Arte Que Veste`,
      description: content.description,
      canonical: content.path,
    });
  }, [content]);

  if (!content) return null;

  return (
    <StorefrontLayout>
      <SiteHeader variant="compact" />
      <main className="aqv-container py-12 md:py-16">
        <nav
          aria-label="Você está em"
          className="text-[10px] uppercase tracking-[0.13em] text-[var(--aqv-muted)]"
        >
          <Link href="/" className="hover:text-[var(--aqv-accent)]">
            Início
          </Link>
          <span aria-hidden="true"> / {content.title}</span>
        </nav>

        <header className="mt-6 max-w-3xl border-b border-[var(--aqv-line)] pb-8">
          <p className="aqv-kicker">{content.kicker}</p>
          <h1 className="mt-3 font-display text-5xl leading-[0.92] tracking-[-0.07em] md:text-6xl">
            {content.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--aqv-muted)]">
            {content.description}
          </p>
        </header>

        <div className="mt-10 max-w-3xl space-y-8">
          {content.sections.map(section => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl tracking-[-0.04em]">
                {section.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--aqv-muted)]">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-12 max-w-3xl border-l-2 border-[var(--aqv-accent)] bg-[var(--aqv-surface)] p-5 text-xs leading-relaxed text-[var(--aqv-muted)]">
          Este texto descreve o funcionamento técnico e processual da loja.
          Prazos, endereço de devolução, CNPJ e demais dados legais do titular
          aparecem no checkout e na confirmação do pedido, onde têm validade.
        </p>

        <div className="mt-10">
          <Link
            href="/"
            className="inline-flex bg-[var(--aqv-ink)] px-6 py-4 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)]"
          >
            Voltar para a loja
          </Link>
        </div>
      </main>
      <SiteFooter />
    </StorefrontLayout>
  );
}

export default PolicyPage;
