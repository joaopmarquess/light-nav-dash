import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp, Network, Stethoscope, Tags } from "lucide-react";
import UberabaSimulacao from "@/components/UberabaSimulacao";
import UberabaGestaoRede from "@/components/UberabaGestaoRede";
import UberabaTabelasComerciais, { ReferenciaButton } from "@/components/UberabaTabelasComerciais";
import UberabaRedeAssistencial from "@/components/UberabaRedeAssistencial";
import EstudoSubNav from "@/components/EstudoSubNav";
import UberabaPropostaComercialButton from "@/components/UberabaPropostaComercialButton";
import UberabaPropostaTextosButton from "@/components/UberabaPropostaTextosButton";

type Aba = "gestaoRede" | "comercial" | "rede";

const ABAS: { id: Aba; label: string; icon: typeof Calculator }[] = [
  { id: "comercial", label: "Resultados Comerciais", icon: Tags },
  { id: "rede", label: "Condições Rede", icon: Stethoscope },
  { id: "gestaoRede", label: "Resultados Rede", icon: Network },
];

// Condições Comerciais vive num contêiner recolhido abaixo das tabelas de Resultados Comerciais.
// O conteúdo fica montado (só oculto) para não perder as variáveis digitadas ao recolher.
const CondicoesComerciais = () => {
  const [aberto, setAberto] = useState(false);
  const Icone = aberto ? ChevronUp : ChevronDown;
  const rotulo = `${aberto ? "Recolher" : "Expandir"} Condições Comerciais`;
  return (
    <section aria-label="Condições Comerciais" className="mt-4 overflow-hidden rounded-md border border-border">
      <h3 className="flex items-center justify-center gap-1 bg-secondary px-3 py-1.5 text-sm font-semibold uppercase text-secondary-foreground">
        Condições Comerciais
        <button type="button" onClick={() => setAberto((v) => !v)} aria-label={rotulo} title={rotulo} aria-expanded={aberto}
          className="inline-flex h-5 w-5 items-center justify-center rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Icone className="h-4 w-4" />
        </button>
      </h3>
      <div hidden={!aberto} className="border-t border-border p-3">
        <UberabaSimulacao />
      </div>
    </section>
  );
};

// Simulações do Estudo: mesmos sub-botões do Painel, reunindo as telas existentes sem alterá-las.
const UberabaEstudoSimulacoes = ({ subNavTarget }: { subNavTarget?: HTMLElement | null } = {}) => {
  const [aba, setAba] = useState<Aba>("comercial");
  const atual = ABAS.find((a) => a.id === aba)!;
  return (
    <div className="flex flex-col gap-3">
      <EstudoSubNav itens={ABAS} ativo={aba} onSelect={(id) => setAba(id as Aba)} label="Simulações do Estudo" target={subNavTarget} extra={aba === "comercial" ? <div className="flex items-center gap-2"><ReferenciaButton /><UberabaPropostaTextosButton /><UberabaPropostaComercialButton /></div> : undefined} />
      <section aria-label={atual.label} className="min-w-0">
        {aba === "gestaoRede" && <UberabaGestaoRede />}
        {aba === "comercial" && <><UberabaTabelasComerciais /><CondicoesComerciais /></>}
        {aba === "rede" && <UberabaRedeAssistencial />}
      </section>
    </div>
  );
};

export default UberabaEstudoSimulacoes;
