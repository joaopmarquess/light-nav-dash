import { useState } from "react";
import { Calculator, Network, Tags } from "lucide-react";
import BlocoRecolhido from "@/components/BlocoRecolhido";
import UberabaSimulacao from "@/components/UberabaSimulacao";
import UberabaTabelasComerciais, { ReferenciaButton } from "@/components/UberabaTabelasComerciais";
import type { FrenteId } from "@/lib/uberabaTabelasComerciais";
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
// acoesTarget: canto de ações da barra da Timeline (Voltar às Tabelas, Referência e propostas sobem para lá).
const UberabaEstudoSimulacoes = ({ subNavTarget, acoesTarget }: { subNavTarget?: HTMLElement | null; acoesTarget?: HTMLElement | null } = {}) => {
  const [aba, setAba] = useState<Aba>("comercial");
  const atual = ABAS.find((a) => a.id === aba)!;
  // "Restaurar padrão": apaga os valores digitados e remonta o bloco para mostrar os padrões.
  const [versaoCred, setVersaoCred] = useState(0);
  const [versaoParam, setVersaoParam] = useState(0);
  // Enquanto uma tabela é comparada, o restante do contêiner (Simulação de resultados) fica invisível.
  const [comparada, setComparada] = useState<FrenteId | null>(null);
  const comparando = comparada !== null;
  return (
    <div className="flex flex-col gap-3">
      <EstudoSubNav itens={ABAS} ativo={aba} onSelect={(id) => setAba(id as Aba)} label="Simulações do Estudo" target={subNavTarget} extraTarget={acoesTarget} extra={aba === "comercial" ? <div className={`flex items-center gap-2 ${acoesTarget === undefined ? "w-full" : ""}`}><div className={`flex items-center gap-2 ${acoesTarget === undefined ? "ml-auto" : ""}`}><ReferenciaButton iconOnly={acoesTarget !== undefined} />{acoesTarget === undefined && <UberabaPropostaComercialButton />}</div></div> : <div className="flex items-center gap-2"><UberabaPropostaRedeButton /></div>} />
      <section aria-label={atual.label} className="min-w-0">
        {/* Simulação de resultados fica recolhida abaixo dos Resultados Comerciais; Resultados Rede: Condições Rede, Credenciamento, Parâmetros e Resultado, recolhidas (Antecipação × Mensal excluída em 18/11/2026). */}
        {/* Na barra da Timeline não cabem os três botões da Proposta Comercial: ficam numa linha própria acima das tabelas (fora da comparação). */}
        {aba === "comercial" && acoesTarget !== undefined && !comparando && <div className="mb-3 flex items-center justify-end gap-2" role="group" aria-label="Proposta Comercial"><span className="mr-1 text-sm text-muted-foreground">Proposta Comercial</span><UberabaPropostaComercialButton /></div>}
        {aba === "comercial" && <><UberabaTabelasComerciais comparada={comparada} onComparar={setComparada} /><div hidden={comparando}><BlocoRecolhido titulo="Simulação de resultados" className="mt-4"><div className="p-3"><UberabaSimulacao /></div></BlocoRecolhido></div></>}
        {aba === "gestaoRede" && <><BlocoRecolhido titulo="Condições Rede" className="mb-4"><div className="p-3"><UberabaRedeAssistencial /></div></BlocoRecolhido><BlocoRecolhido titulo="Credenciamento" className="mb-4" acoes={<RestaurarPadraoButton alvo="Credenciamento (Qtde., Valor e quantidades dos itens)" onRestaurar={() => { restaurarCredenciamento(); setVersaoCred((v) => v + 1); }} />}><div className="p-3"><UberabaQuantidadeCredenciamentos key={versaoCred} /></div></BlocoRecolhido><BlocoRecolhido titulo="Parâmetros" className="mb-4" acoes={<RestaurarPadraoButton alvo="Parâmetros" onRestaurar={() => { restaurarParametrosRede(); setVersaoParam((v) => v + 1); }} />}><div className="p-3"><UberabaParametrosRede key={versaoParam} /></div></BlocoRecolhido><BlocoRecolhido titulo="Resultado"><div className="p-3"><UberabaResultadoRede /></div></BlocoRecolhido></>}
      </section>
    </div>
  );
};

export default UberabaEstudoSimulacoes;
