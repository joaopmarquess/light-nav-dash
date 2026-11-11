import { useState } from "react";
import { createPortal } from "react-dom";
import { Calculator, Network, Stethoscope, Tags } from "lucide-react";
import UberabaSimulacao from "@/components/UberabaSimulacao";
import UberabaGestaoRede from "@/components/UberabaGestaoRede";
import UberabaTabelasComerciais, { ReferenciaButton } from "@/components/UberabaTabelasComerciais";
import UberabaRedeAssistencial from "@/components/UberabaRedeAssistencial";

type Aba = "simulacao" | "gestaoRede" | "comercial" | "rede";

const ABAS: { id: Aba; label: string; icon: typeof Calculator }[] = [
  { id: "simulacao", label: "Simulação", icon: Calculator },
  { id: "gestaoRede", label: "Gestão Rede", icon: Network },
  { id: "comercial", label: "Comercial", icon: Tags },
  { id: "rede", label: "Rede Assistencial", icon: Stethoscope },
];

// Simulações do Estudo: mesmos sub-botões do Painel, reunindo as telas existentes sem alterá-las.
const UberabaEstudoSimulacoes = ({ toolbarTarget }: { toolbarTarget?: HTMLElement | null }) => {
  const [aba, setAba] = useState<Aba>("simulacao");
  const atual = ABAS.find((a) => a.id === aba)!;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Simulações do Estudo">
        {ABAS.map((a) => {
          const Icon = a.icon;
          const on = aba === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`}
            >
              <Icon className="h-4 w-4" />
              {a.label}
            </button>
          );
        })}
      </div>
      <section aria-label={atual.label} className="min-w-0">
        {aba === "simulacao" && <UberabaSimulacao />}
        {aba === "gestaoRede" && <UberabaGestaoRede />}
        {aba === "comercial" && <UberabaTabelasComerciais />}
        {aba === "rede" && <UberabaRedeAssistencial />}
      </section>
      {aba === "comercial" && toolbarTarget && createPortal(<ReferenciaButton />, toolbarTarget)}
    </div>
  );
};

export default UberabaEstudoSimulacoes;
