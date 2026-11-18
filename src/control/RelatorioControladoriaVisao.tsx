import { useEffect, useRef, useState } from "react";
import { FileBarChart2, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PdfPreview from "@/components/PdfPreview";
import { AvisoErroDados } from "@/components/AvisoErroDados";
import { REPORT_FULL_NAME } from "@/control/dreLabels";
import { loadDreHostinger, loadMesesDemonstracoes } from "@/control/dreHostinger";
import type { DreVisao } from "@/control/dreTrimestres";
import type { ControladoriaReport } from "@/control/relatorio/controladoriaDados";
import { comporPdfRelatorio } from "@/control/relatorio/controladoriaPdf";
import { carregarVidasPeriodos, montarRelatorioPeriodos, periodosRelatorio } from "@/control/relatorio/controladoriaTrimestral";

// Control › Relatório de Controladoria (pedido de 18/11/2026): sem filtros de período; os meses seguem o critério das
// Demonstrações (janeiro até o último mês com contas 41 acima de R$ 20 milhões). Mensal = cada mês realizado; Trimestral =
// trimestres fechados, como o relatório da DRE Trimestral. Sem exibição na tela: Gerar PDF monta o relatório e abre direto a pré-visualização do PDF.
const ANO = 2026; // mesmo ano das Demonstrações

export default function RelatorioControladoriaVisao() {
  const [visao, setVisao] = useState<DreVisao | null>(null);
  const [relatorios, setRelatorios] = useState<Partial<Record<DreVisao, ControladoriaReport>>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const [pdf, setPdf] = useState(false);
  const geracao = useRef(0);
  useEffect(() => () => { geracao.current += 1; }, []);

  const gerar = async (v: DreVisao): Promise<boolean> => {
    const atual = ++geracao.current;
    setCarregando(true); setErro(null);
    try {
      const meses = await loadMesesDemonstracoes(ANO);
      const periodos = periodosRelatorio(v, ANO, meses);
      if (!periodos.periodos.length) throw new Error(`Ainda não há ${v === "Mensal" ? "mês realizado" : "trimestre fechado"} em ${ANO}.`);
      const [rows, { inicio, vidas }] = await Promise.all([loadDreHostinger(ANO, meses), carregarVidasPeriodos(periodos)]);
      const rel = montarRelatorioPeriodos({ ano: ANO, periodos, rows, vidasInicio: inicio, vidas });
      if (atual !== geracao.current) return false;
      setRelatorios((p) => ({ ...p, [v]: rel }));
      return true;
    } catch (e) { if (atual === geracao.current) setErro(e); return false; }
    finally { if (atual === geracao.current) setCarregando(false); }
  };
  const gerarPdf = async () => {
    if (!visao) return;
    if (relatorios[visao]) { setPdf(true); return; }
    if (await gerar(visao)) setPdf(true);
  };
  const rel = visao ? relatorios[visao] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Visão:</span>
        <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Visão do relatório">
          {(["Mensal", "Trimestral"] as const).map((v) => (
            <Button key={v} size="sm" variant={visao === v ? "default" : "ghost"} aria-pressed={visao === v} disabled={carregando} onClick={() => { setVisao(v); setErro(null); }}>{v}</Button>
          ))}
        </div>
        <Button size="sm" disabled={!visao || carregando} onClick={() => void gerarPdf()}>
          {carregando ? <Loader2 className="mr-1 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <FileDown className="mr-1 h-4 w-4" />}
          {carregando ? "Gerando…" : "Gerar PDF"}
        </Button>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileBarChart2 className="h-4 w-4 text-primary" />
        {visao ? <>O {REPORT_FULL_NAME} {visao.toLowerCase()} segue o critério das Demonstrações de {ANO}.</> : <>Selecione <strong className="text-foreground">Mensal</strong> ou <strong className="text-foreground">Trimestral</strong> e clique em Gerar PDF.</>}
      </p>
      {erro && visao && <AvisoErroDados erro={erro} onTentar={() => void gerarPdf()} />}
      {pdf && rel && visao && <PdfPreview build={async () => (await comporPdfRelatorio(rel)).doc}
        fileName={`Relatorio_Controladoria_${visao}_${rel.period.de}_${rel.period.ate}.pdf`} onClose={() => setPdf(false)} />}
    </div>
  );
}
