import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Brand-level error boundary.
 *
 * The previous version printed a raw stack trace into the middle of the page —
 * alarming for a shopper and useless to them. Now the shopper sees the store's
 * own surface with a retry, while the technical detail stays in the console for
 * whoever is debugging.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[ErrorBoundary]", error, info?.componentStack ?? "");
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--aqv-paper)] p-6 text-[var(--aqv-ink)]">
          <div className="w-full max-w-lg border border-[var(--aqv-line)] bg-[var(--aqv-surface)] p-8 text-center shadow-[10px_10px_0_var(--aqv-accent)]">
            <div className="mx-auto grid h-14 w-14 place-items-center border border-[var(--aqv-accent)] text-[var(--aqv-accent)]">
              <AlertTriangle size={24} aria-hidden="true" />
            </div>
            <p className="aqv-kicker mt-6 text-[var(--aqv-accent)]">
              Arte Que Veste
            </p>
            <h1 className="mt-3 font-display text-3xl tracking-[-0.05em]">
              Algo saiu do lugar na loja.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--aqv-muted)]">
              O catálogo e o carrinho continuam preservados. Recarregue a página
              para continuar a compra — se o erro repetir, o atendimento pode
              ajudar com o número do pedido.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 bg-[var(--aqv-ink)] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)]"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Recarregar a loja
            </button>
            <p className="mt-6 text-xs text-[var(--aqv-muted)]">
              <a href="/" className="underline underline-offset-4">
                Voltar para a página inicial
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
