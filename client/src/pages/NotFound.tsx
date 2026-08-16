import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <main className="aqv-shell flex min-h-screen items-center justify-center bg-[#F6EFE4] px-5 py-16 text-[#211A16]">
      <section className="w-full max-w-xl rounded-[1.5rem] border-2 border-[#211A16] bg-[#E7F0EB] p-8 text-center shadow-[10px_10px_0_0_#C7654C] md:p-12">
        <div className="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-full border border-[#C7654C] text-[#C7654C]">
          <AlertCircle className="h-7 w-7" />
        </div>
        <p className="text-xs uppercase tracking-[0.28em] text-[#7B6858]">Arte Que Veste</p>
        <h1 className="mt-3 font-serif text-7xl leading-none">404</h1>
        <h2 className="mt-4 font-serif text-3xl">Esta página saiu do caminho.</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#493D33]">
          O endereço que você procurou não está disponível. Volte para a loja e continue sua caminhada pela coleção.
        </p>
        <Button onClick={() => setLocation("/")} className="mt-8 rounded-full bg-[#23867F] px-6 py-6 text-white hover:bg-[#176B66]">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a loja
        </Button>
      </section>
    </main>
  );
}
