import { useState } from "react";
import { Calculator, Network, Stethoscope, Tags } from "lucide-react";
import UberabaSimulacao from "@/components/UberabaSimulacao";
import UberabaGestaoRede from "@/components/UberabaGestaoRede";
import UberabaTabelasComerciais, { ReferenciaButton } from "@/components/UberabaTabelasComerciais";
import UberabaRedeAssistencial from "@/components/UberabaRedeAssistencial";
import EstudoSubNav from "@/components/EstudoSubNav";

type Aba = "simulacao" | "gestaoRede" | "comercial" | "rede";

const ABAS: { id: Aba; label: string; icon: typeof Calculator }[] = [
  { id: "simulacao", label: "Condições Comerciais", icon: Calculator },
  { id: "comercial", label: "Resultados Comerciais", icon: Tags },
  { id: "rede", label: "Condições Rede", icon: Stethoscope },
  { id: "gestaoRede", label: "Resultados Rede", icon: Network },
];

// Simulações do Estudo: mesmos sub-botões do Painel, reunindo as telas existentes sem alterá-las.
const UberabaEstudoSimulacoes = ({ subNavTarget }: { subNavTarget?: HTMLElement | null } = {}) => {
  const [aba, setAba] = useState<Aba>("simulacao");
  const [acoes, setAcoes] = useState<HTMLDivElement | null>(null);
  const atual = ABAS.find((a) => a.id === aba)!;
  return (
    <div className="flex flex-col gap-3">
      <EstudoSubNav itens={ABAS} ativo={aba} onSelect={(id) => setAba(id as Aba)} label="Simulações do Estudo" target={subNavTarget} extra={aba === "comercial" ? <ReferenciaButton /> : aba === "simulacao" ? <div ref={setAcoes} /> : undefined} />
      <section aria-label={atual.label} className="min-w-0">
        {aba === "simulacao" && <UberabaSimulacao acoesTarget={acoes} />}
        {aba === "gestaoRede" && <UberabaGestaoRede />}
        {aba === "comercial" && <UberabaTabelasComerciais />}
        {aba === "rede" && <UberabaRedeAssistencial />}
      </section>
    </div>
  );
};

export default UberabaEstudoSimulacoes;
