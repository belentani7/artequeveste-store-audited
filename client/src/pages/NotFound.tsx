import { AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aqv-paper)] px-5 py-16 text-[var(--aqv-ink)]">
      <section className="relative w-full max-w-xl overflow-hidden border border-[var(--aqv-ink)] bg-[var(--aqv-surface)] p-8 text-center shadow-[10px_10px_0_var(--aqv-accent)] md:p-12">
        <div className="pointer-events-none absolute inset-4 border border-[var(--aqv-ink)]/15" />
        <div className="relative mx-auto mb-7 grid h-16 w-16 place-items-center border border-[var(--aqv-accent)] text-[var(--aqv-accent)]">
          <AlertCircle className="h-7 w-7" />
        </div>
        <p className="relative aqv-kicker text-[var(--aqv-accent)]">Arte Que Veste / rota ausente</p>
        <h1 className="relative mt-3 font-display text-8xl leading-none tracking-[-0.08em]">404</h1>
        <h2 className="relative mt-4 font-display text-3xl tracking-[-0.06em]">Esta página saiu do caminho.</h2>
        <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--aqv-muted)]">
          O endereço que você procurou não está disponível. Volte para a loja e continue sua caminhada pela coleção.
        </p>
        <button onClick={() => setLocation("/")} className="relative mt-8 inline-flex items-center gap-2 bg-[var(--aqv-ink)] px-6 py-4 text-[10px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[var(--aqv-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--aqv-accent)] focus-visible:outline-offset-4">
          <ArrowLeft className="h-4 w-4" /> Voltar para a loja
        </button>
      </section>
    </main>
  );
}
