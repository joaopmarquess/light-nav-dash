import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type EstudoSubNavItem = { id: string; label: string; icon?: LucideIcon; title?: string };

// Sub-botões do Estudo (Painel, Simulações) no mesmo formato da barra de navegação de Demonstrações (Control).
// target: quando informado, a barra (3º nível) vai para a mesma linha dos botões do Estudo (2º nível).
export default function EstudoSubNav({ itens, ativo, onSelect, label, extra, target }: { itens: EstudoSubNavItem[]; ativo: string; onSelect: (id: string) => void; label: string; extra?: ReactNode; target?: HTMLElement | null }) {
  if (target === null) return null;
  const barra = (
    <div className={`flex flex-wrap items-center gap-3 ${target ? "min-w-0 flex-1" : ""}`}>
      <div role="group" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-full border border-border bg-card/90 p-1.5 shadow-[0_0_16px_2px_hsl(var(--foreground)/0.18)] backdrop-blur">
        {itens.map((t) => {
          const Icon = t.icon;
          const on = t.id === ativo;
          return (
            <Button key={t.id} variant="ghost" title={t.title} aria-pressed={on} onClick={() => onSelect(t.id)}
              className={`h-auto gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-all duration-200 ${on ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary hover:text-primary-foreground" : "text-foreground/70 hover:-translate-y-0.5 hover:bg-card hover:text-primary hover:shadow-sm"}`}>
              {Icon && <Icon className="h-3.5 w-3.5" />}{t.label}
            </Button>
          );
        })}
      </div>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
  return target ? createPortal(barra, target) : barra;
}
