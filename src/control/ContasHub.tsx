import { useState } from "react";
import { FilePlus2, Wrench, ArrowLeft } from "lucide-react";
import ContasTrial from "@/control/ContasTrial";
import NovaConta from "@/control/NovaConta";

type Modo = null | "nova" | "manut";

const ContasHub = () => {
  const [modo, setModo] = useState<Modo>(null);

  if (!modo) {
    const opts = [
      { k: "nova" as const, icon: FilePlus2, t: "Nova", d: "Cadastrar uma nova conta" },
      { k: "manut" as const, icon: Wrench, t: "Manutenção", d: "Consultar e alterar contas e grupos" },
    ];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {opts.map((o) => (
          <button key={o.k} onClick={() => setModo(o.k)}
            className="group flex items-start gap-3 p-5 rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 hover:bg-accent/50 transition-colors text-left">
            <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <o.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">{o.t}</div>
              <div className="text-xs text-muted-foreground">{o.d}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <button onClick={() => setModo(null)} className="self-start flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <div className="flex-1 min-h-0">{modo === "nova" ? <NovaConta /> : <ContasTrial />}</div>
    </div>
  );
};

export default ContasHub;
