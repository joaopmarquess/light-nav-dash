import { useState } from "react";
import { Calculator, Network, Tags } from "lucide-react";
import BlocoRecolhido from "@/components/BlocoRecolhido";
import UberabaSimulacao from "@/components/UberabaSimulacao";
import UberabaTabelasComerciais, { ReferenciaButton } from "@/components/UberabaTabelasComerciais";
import UberabaRedeAssistencial from "@/components/UberabaRedeAssistencial";
import UberabaQuantidadeCredenciamentos from "@/components/UberabaQuantidadeCredenciamentos";
import EstudoSubNav from "@/components/EstudoSubNav";
import UberabaPropostaComercialButton from "@/components/UberabaPropostaComercialButton";
import UberabaPropostaTextosButton from "@/components/UberabaPropostaTextosButton";

type Aba = "gestaoRede" | "comercial";

const ABAS: { id: Aba; label: string; icon: typeof Calculator }[] = [
  { id: "comercial", label: "Resultados Comerciais", icon: Tags },
  { id: "gestaoRede", label: "Resultados Rede", icon: Network },
];

// Simulações do Estudo: mesmos sub-botões do Painel, reunindo as telas existentes sem alterá-las.
const UberabaEstudoSimulacoes = ({ subNavTarget }: { subNavTarget?: HTMLElement | null } = {}) => {
  const [aba, setAba] = useState<Aba>("comercial");
  const atual = ABAS.find((a) => a.id === aba)!;
  return (
    <div className="flex flex-col gap-3">
      <EstudoSubNav itens={ABAS} ativo={aba} onSelect={(id) => setAba(id as Aba)} label="Simulações do Estudo" target={subNavTarget} extra={aba === "comercial" ? <div className="flex items-center gap-2"><ReferenciaButton /><UberabaPropostaTextosButton /><UberabaPropostaComercialButton /></div> : undefined} />
      <section aria-label={atual.label} className="min-w-0">
        {/* Simulação de resultados fica recolhida abaixo dos Resultados Comerciais; Resultados Rede: Condições Rede e Credenciamento, recolhidas (Antecipação × Mensal excluída em 18/11/2026). */}
        {aba === "comercial" && <><UberabaTabelasComerciais /><BlocoRecolhido titulo="Simulação de resultados" className="mt-4"><div className="p-3"><UberabaSimulacao /></div></BlocoRecolhido></>}
        {aba === "gestaoRede" && <><BlocoRecolhido titulo="Condições Rede" className="mb-4"><div className="p-3"><UberabaRedeAssistencial /></div></BlocoRecolhido><BlocoRecolhido titulo="Credenciamento"><div className="p-3"><UberabaQuantidadeCredenciamentos /></div></BlocoRecolhido></>}
      </section>
    </div>
  );
};

export default UberabaEstudoSimulacoes;
