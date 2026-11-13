import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Contêiner com título e setinha usado nas Simulações do Estudo (Resultados Comerciais e Resultados Rede).
// O conteúdo fica montado (só oculto) para não perder o que foi digitado ao recolher.
export default function BlocoRecolhido({ titulo, inicialAberto = false, recolhivel = true, className, children }: {
  titulo: string; inicialAberto?: boolean; recolhivel?: boolean; className?: string; children: ReactNode;
}) {
  const [aberto, setAberto] = useState(inicialAberto || !recolhivel);
  const Icone = aberto ? ChevronUp : ChevronDown;
  const rotulo = `${aberto ? "Recolher" : "Expandir"} ${titulo}`;
  return (
    <section aria-label={titulo} className={cn("overflow-hidden rounded-md border border-border", className)}>
      <h3 className="flex items-center justify-center gap-1 bg-secondary px-3 py-1.5 text-sm font-semibold uppercase text-secondary-foreground">
        {titulo}
        {recolhivel && (
          <button type="button" onClick={() => setAberto((v) => !v)} aria-label={rotulo} title={rotulo} aria-expanded={aberto}
            className="inline-flex h-5 w-5 items-center justify-center rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icone className="h-4 w-4" />
          </button>
        )}
      </h3>
      <div hidden={!aberto} className="border-t border-border">{children}</div>
    </section>
  );
}
