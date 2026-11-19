import { useState } from "react";
import { Calculator, Network, Tags } from "lucide-react";
import BlocoRecolhido from "@/components/BlocoRecolhido";
import UberabaSimulacao from "@/components/UberabaSimulacao";
import UberabaTabelasComerciais, { ReferenciaButton } from "@/components/UberabaTabelasComerciais";
import UberabaRedeAssistencial from "@/components/UberabaRedeAssistencial";
import UberabaQuantidadeCredenciamentos from "@/components/UberabaQuantidadeCredenciamentos";
import UberabaParametrosRede from "@/components/UberabaParametrosRede";
import UberabaResultadoRede from "@/components/UberabaResultadoRede";
import EstudoSubNav from "@/components/EstudoSubNav";
import RestaurarPadraoButton from "@/components/RestaurarPadraoButton";
import { restaurarCredenciamento } from "@/lib/uberabaQuantidadeCredenciamentos";
import { restaurarParametrosRede } from "@/lib/uberabaParametrosRede";
import UberabaPropostaComercialButton from "@/components/UberabaPropostaComercialButton";
import UberabaPropostaRedeButton from "@/components/UberabaPropostaRedeButton";

type Aba = "gestaoRede" | "comercial";

const ABAS: { id: Aba; label: string; icon: typeof Calculator }[] = [
  { id: "comercial", label: "Resultados Comerciais", icon: Tags },
  { id: "gestaoRede", label: "Resultados Rede", icon: Network },
];

// Simulações do Estudo: mesmos sub-botões do Painel, reunindo as telas existentes sem alterá-las.
const UberabaEstudoSimulacoes = ({ subNavTarget }: { subNavTarget?: HTMLElement | null } = {}) => {
  const [aba, setAba] = useState<Aba>("comercial");
  const atual = ABAS.find((a) => a.id === aba)!;
  // "Restaurar padrão": apaga os valores digitados e remonta o bloco para mostrar os padrões.
  const [versaoCred, setVersaoCred] = useState(0);
  const [versaoParam, setVersaoParam] = useState(0);
  // Enquanto uma tabela é comparada, o restante do contêiner (Simulação de resultados) fica invisível.
  const [comparando, setComparando] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <EstudoSubNav itens={ABAS} ativo={aba} onSelect={(id) => setAba(id as Aba)} label="Simulações do Estudo" target={subNavTarget} extra={aba === "comercial" ? <div className="flex items-center gap-2"><ReferenciaButton /><UberabaPropostaComercialButton /></div> : <div className="flex items-center gap-2"><UberabaPropostaRedeButton /></div>} />
      <section aria-label={atual.label} className="min-w-0">
        {/* Simulação de resultados fica recolhida abaixo dos Resultados Comerciais; Resultados Rede: Condições Rede, Credenciamento, Parâmetros e Resultado, recolhidas (Antecipação × Mensal excluída em 18/11/2026). */}
        {aba === "comercial" && <><UberabaTabelasComerciais onComparar={setComparando} /><div hidden={comparando}><BlocoRecolhido titulo="Simulação de resultados" className="mt-4"><div className="p-3"><UberabaSimulacao /></div></BlocoRecolhido></div></>}
        {aba === "gestaoRede" && <><BlocoRecolhido titulo="Condições Rede" className="mb-4"><div className="p-3"><UberabaRedeAssistencial /></div></BlocoRecolhido><BlocoRecolhido titulo="Credenciamento" className="mb-4" acoes={<RestaurarPadraoButton alvo="Credenciamento (Qtde., Valor e quantidades dos itens)" onRestaurar={() => { restaurarCredenciamento(); setVersaoCred((v) => v + 1); }} />}><div className="p-3"><UberabaQuantidadeCredenciamentos key={versaoCred} /></div></BlocoRecolhido><BlocoRecolhido titulo="Parâmetros" className="mb-4" acoes={<RestaurarPadraoButton alvo="Parâmetros" onRestaurar={() => { restaurarParametrosRede(); setVersaoParam((v) => v + 1); }} />}><div className="p-3"><UberabaParametrosRede key={versaoParam} /></div></BlocoRecolhido><BlocoRecolhido titulo="Resultado"><div className="p-3"><UberabaResultadoRede /></div></BlocoRecolhido></>}
      </section>
    </div>
  );
};

export default UberabaEstudoSimulacoes;
