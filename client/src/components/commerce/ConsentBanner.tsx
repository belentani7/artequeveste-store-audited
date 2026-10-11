import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  CONSENT_QUERY_KEY,
  getConsent,
  loadAnalyticsWhenAllowed,
  saveConsent,
} from "@/lib/consent";

/**
 * Minimal LGPD consent bar.
 *
 * Behaviour that keeps it both legal and non-hostile:
 *   - it is not a blocking gate: catalog, cart and checkout work regardless;
 *   - "Somente essenciais" is a real choice, not a disguised accept;
 *   - analytics only ever loads from `loadAnalyticsWhenAllowed()`;
 *   - Escape and the close button both record "essential", so a shopper who
 *     dismisses the bar is never tracked by default.
 */
export default function ConsentBanner() {
  const queryClient = useQueryClient();
  const { data: consent } = useQuery({
    queryKey: CONSENT_QUERY_KEY,
    queryFn: () => getConsent(),
    staleTime: Infinity,
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  const decide = (level: "essential" | "analytics") => {
    saveConsent(level);
    if (level === "analytics") loadAnalyticsWhenAllowed();
    queryClient.setQueryData(CONSENT_QUERY_KEY, getConsent());
  };

  useEffect(() => {
    if (consent) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // A shopper pressing Escape inside the cart must only close the cart —
      // dismissing the privacy bar as a side effect would silently record a
      // choice they never made.
      const openDialog = document.querySelector(
        '[role="dialog"][aria-modal="true"]'
      );
      if (openDialog && openDialog !== dialogRef.current) return;
      saveConsent("essential");
      queryClient.setQueryData(CONSENT_QUERY_KEY, getConsent());
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [consent, queryClient]);

  // Returning visitor who already opted in: load the script without showing UI.
  useEffect(() => {
    if (consent?.level === "analytics") loadAnalyticsWhenAllowed();
  }, [consent]);

  if (consent) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="aqv-consent-title"
      aria-describedby="aqv-consent-copy"
      className="fixed inset-x-4 bottom-4 z-50 border border-[var(--aqv-line)] bg-[var(--aqv-paper)] p-5 shadow-2xl md:left-auto md:max-w-md"
    >
      <p id="aqv-consent-title" className="text-sm font-semibold">
        Privacidade sem complicação
      </p>
      <p
        id="aqv-consent-copy"
        className="mt-2 text-xs leading-relaxed text-[var(--aqv-muted)]"
      >
        Usamos o mínimo necessário para a loja funcionar. A escolha não
        interfere no catálogo, no carrinho nem no checkout e pode ser revista em{" "}
        <span className="font-medium">Privacidade e LGPD</span>.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="bg-[var(--aqv-ink)] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white transition hover:bg-[var(--aqv-accent)]"
          onClick={() => decide("essential")}
        >
          Somente essenciais
        </button>
        <button
          type="button"
          className="border border-[var(--aqv-line)] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.12em] transition hover:border-[var(--aqv-ink)]"
          onClick={() => decide("analytics")}
        >
          Aceitar analítica
        </button>
      </div>
    </div>
  );
}
