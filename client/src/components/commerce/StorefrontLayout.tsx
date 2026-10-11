import { useEffect } from "react";
import { ArrowRight, Package, ShieldCheck, Truck } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { applyRouteMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import CartDrawer from "./CartDrawer";
import ConsentBanner from "./ConsentBanner";

/**
 * Shared storefront shell.
 *
 * Home, PDP, 404 and every informational route render through this component,
 * which guarantees three things the audit asked for:
 *   1. the cart is reachable from any route (drawer lives here, once);
 *   2. the same brand surface (paper, ink, wordmark) wraps empty and error
 *      states — no unstyled "broken" screens;
 *   3. the consent bar is mounted exactly once, after real content.
 */
export default function StorefrontLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[var(--aqv-paper)] text-[var(--aqv-ink)]",
        className
      )}
    >
      <div className="aqv-topline">
        Envio para todo o Brasil · frete calculado no checkout
      </div>
      {children}
      <CartDrawer />
      <ConsentBanner />
    </div>
  );
}

/** Reusable branded block for "nothing here yet" and failure states. */
export function StorefrontMessage({
  kicker,
  title,
  body,
  action,
  tone = "neutral",
}: {
  kicker: string;
  title: string;
  body: string;
  action?:
    | { label: string; href: string }
    | { label: string; onClick: () => void };
  tone?: "neutral" | "alert";
}) {
  return (
    <div
      className={cn(
        "border bg-[var(--aqv-surface)] p-8 md:p-10",
        tone === "alert"
          ? "border-[var(--aqv-accent)]"
          : "border-dashed border-[var(--aqv-line)]"
      )}
    >
      <p
        className={cn(
          "aqv-kicker",
          tone === "alert"
            ? "text-[var(--aqv-accent)]"
            : "text-[var(--aqv-muted)]"
        )}
      >
        {kicker}
      </p>
      <h2 className="mt-3 max-w-2xl font-display text-4xl leading-[0.95] tracking-[-0.06em] md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--aqv-muted)]">
        {body}
      </p>
      {action &&
        ("href" in action ? (
          <Link
            href={action.href}
            className="mt-6 inline-flex items-center gap-3 bg-[var(--aqv-ink)] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)]"
          >
            {action.label} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-6 inline-flex items-center gap-3 bg-[var(--aqv-ink)] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)]"
          >
            {action.label} <ArrowRight size={14} aria-hidden="true" />
          </button>
        ))}
    </div>
  );
}

/**
 * Launch-state block shown while the Shopify catalog is empty.
 *
 * It is intentionally explicit about *why* there are no products — the audit
 * forbids inventing stock, so the honest message is the feature.
 */
export function LaunchNotice({ mode }: { mode: "live" | "unconfigured" }) {
  const { data: status } = trpc.commerce.status.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  const live = (status?.mode ?? mode) === "live";

  useEffect(() => {
    if (!live)
      applyRouteMeta({
        title: "Arte Que Veste — catálogo em preparação",
        description: "A loja está sendo preparada.",
        noindex: true,
      });
  }, [live]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        {
          icon: Package,
          title: "Catálogo real",
          body: live
            ? "As peças aparecem aqui no instante em que são publicadas no Shopify, com foto, preço, tamanhos e estoque."
            : "A loja ainda não recebeu as credenciais do Shopify. Assim que o titular conectar a loja, o catálogo aparece automaticamente.",
        },
        {
          icon: Truck,
          title: "Envio nacional",
          body: "Frete e prazo são calculados no checkout, com as regras configuradas pelo titular.",
        },
        {
          icon: ShieldCheck,
          title: "Checkout protegido",
          body: "PIX, cartão e parcelamento são exibidos no checkout seguro, conforme a configuração da loja.",
        },
      ].map(item => (
        <div
          key={item.title}
          className="border border-[var(--aqv-line)] bg-[var(--aqv-paper)] p-6"
        >
          <item.icon
            size={18}
            className="text-[var(--aqv-accent)]"
            aria-hidden="true"
          />
          <p className="mt-4 text-sm font-semibold">{item.title}</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--aqv-muted)]">
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}
