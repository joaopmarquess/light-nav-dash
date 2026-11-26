import { GradeAjuste, BotaoReverterAjuste, useAlteracoesAjuste } from "@/control/SimuladorAjuste";
import { DRE_FULL_NAME } from "@/control/dreLabels";

/** Control › Orçamento 2027 no padrão de tela da DRE: mesma grade e mesmas alterações do Ajuste (slide 4), sem moldura de slide. */
export default function Orcamento2027Dre() {
  const { alteracoes, setAlteracoes, alterado, reverter } = useAlteracoesAjuste();
  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-9rem)] min-h-0">
      <section className="rounded-2xl border border-border bg-card shadow-sm px-3 py-2 flex-1 min-h-0 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-foreground">{DRE_FULL_NAME} · Orçamento 2027</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">% fat. editável · R$</span>
            <BotaoReverterAjuste alterado={alterado} reverter={reverter} />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <GradeAjuste alteracoes={alteracoes} setAlteracoes={setAlteracoes} sinistralidade />
        </div>
      </section>
    </div>
  );
}
