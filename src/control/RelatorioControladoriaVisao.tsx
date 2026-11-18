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
import { dataBR } from "@/control/relatorio/controladoriaRegras";
import { carregarVidasPeriodos, montarRelatorioPeriodos, periodosRelatorio } from "@/control/relatorio/controladoriaTrimestral";

// Relatório › Relatório de Controladoria (pedido de 18/11/2026): sem filtros de período; os meses seguem o critério das
// Demonstrações (janeiro até o último mês com contas 41 acima de R$ 20 milhões). Mensal = cada mês realizado; Trimestral =
// trimestres fechados, como o relatório da DRE Trimestral. O relatório aparece na tela e o mesmo conteúdo vai para o PDF.
const ANO = 2026; // mesmo ano das Demonstrações

export default function RelatorioControladoriaVisao() {
  const [visao, setVisao] = useState<DreVisao | null>(null);
  const [relatorios, setRelatorios] = useState<Partial<Record<DreVisao, ControladoriaReport>>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const [pdf, setPdf] = useState(false);
  const geracao = useRef(0);
  useEffect(() => () => { geracao.current += 1; }, []);

  const gerar = async (v: DreVisao) => {
    const atual = ++geracao.current;
    setCarregando(true); setErro(null);
    try {
      const meses = await loadMesesDemonstracoes(ANO);
      const periodos = periodosRelatorio(v, ANO, meses);
      if (!periodos.periodos.length) throw new Error(`Ainda não há ${v === "Mensal" ? "mês realizado" : "trimestre fechado"} em ${ANO}.`);
      const [rows, { inicio, vidas }] = await Promise.all([loadDreHostinger(ANO, meses), carregarVidasPeriodos(periodos)]);
      const rel = montarRelatorioPeriodos({ ano: ANO, periodos, rows, vidasInicio: inicio, vidas });
      if (atual === geracao.current) setRelatorios((p) => ({ ...p, [v]: rel }));
    } catch (e) { if (atual === geracao.current) setErro(e); }
    finally { if (atual === geracao.current) setCarregando(false); }
  };
  const escolher = (v: DreVisao) => { setVisao(v); if (!relatorios[v]) void gerar(v); };
  const rel = visao ? relatorios[visao] : undefined;

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Visão:</span>
        <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Visão do relatório">
          {(["Mensal", "Trimestral"] as const).map((v) => (
            <Button key={v} size="sm" variant={visao === v ? "default" : "ghost"} aria-pressed={visao === v} disabled={carregando} onClick={() => escolher(v)}>{v}</Button>
          ))}
        </div>
        {rel && <span className="text-sm text-muted-foreground">Período: <strong className="text-foreground tabular-nums">{dataBR(rel.period.de)} a {dataBR(rel.period.ate)}</strong> · critério das Demonstrações</span>}
        <Button size="sm" className="ml-auto" disabled={!rel || carregando} onClick={() => setPdf(true)}><FileDown className="mr-1 h-4 w-4" />Gerar PDF</Button>
      </div>
      {erro && visao && <AvisoErroDados erro={erro} onTentar={() => void gerar(visao)} />}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card">
        {!visao ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <FileBarChart2 className="h-10 w-10 text-primary" />
            <p className="text-sm">Selecione <strong>Mensal</strong> ou <strong>Trimestral</strong> para gerar o {REPORT_FULL_NAME}.</p>
          </div>
        ) : carregando ? (
          <p role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Gerando o relatório {visao.toLowerCase()}…</p>
        ) : rel ? <RelatorioNaTela rel={rel} visao={visao} /> : null}
      </div>
      {pdf && rel && visao && <PdfPreview build={async () => (await comporPdfRelatorio(rel)).doc}
        fileName={`Relatorio_Controladoria_${visao}_${rel.period.de}_${rel.period.ate}.pdf`} onClose={() => setPdf(false)} />}
    </div>
  );
}

/** Mesmo conteúdo do PDF (blocos, quadros, textos e conclusão), em formato de documento na tela. */
function RelatorioNaTela({ rel, visao }: { rel: ControladoriaReport; visao: DreVisao }) {
  return (
    <article className="mx-auto max-w-6xl space-y-10 px-8 py-8">
      <header className="border-b-2 border-primary pb-4">
        <h2 className="text-2xl font-bold text-foreground">{REPORT_FULL_NAME}</h2>
        <p className="text-sm text-muted-foreground">Visão {visao.toLowerCase()} · Vidas e resultado · {dataBR(rel.period.de)} a {dataBR(rel.period.ate)}</p>
      </header>
      {rel.blocks.map((b) => (
        <section key={b.id} className="space-y-4" aria-labelledby={`rel-${b.id}`}>
          <h3 id={`rel-${b.id}`} className="border-b border-border pb-2 text-xl font-semibold text-foreground">{b.title}</h3>
          {b.introduction && <p className="text-sm text-muted-foreground">{b.introduction}</p>}
          {b.cards.length > 0 && (
            <dl className="grid gap-4 sm:grid-cols-3">
              {b.cards.map((c) => (
                <div key={c.label} className="border-l-4 border-primary pl-3">
                  <dt className="text-xs text-muted-foreground">{c.label}</dt>
                  <dd className="text-lg font-bold tabular-nums text-foreground">{c.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {b.table && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full border-collapse whitespace-nowrap text-sm">
                <thead><tr className="bg-primary text-primary-foreground">
                  {b.table.headers.map((h, i) => <th key={h} className={`px-3 py-2 font-semibold ${i > 0 && b.table!.numeric ? "text-right" : "text-left"}`}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {b.table.rows.map((r) => (
                    <tr key={r[0]} className={`border-b border-border last:border-b-0 even:bg-muted/40 ${/^(\(=\)|Total)/.test(r[0]) ? "font-bold" : ""}`}>
                      {r.map((c, i) => <td key={i} className={`px-3 py-1.5 ${i > 0 && b.table!.numeric ? "text-right tabular-nums" : "whitespace-pre"}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Fonte: {b.sourceModule}</p>
          {b.paragraphs.map((p) => <p key={p} className="text-sm leading-relaxed text-foreground">{p}</p>)}
          {b.considerations.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Considerações</h4>
              {b.considerations.map((p) => <p key={p} className="text-sm text-muted-foreground">{p}</p>)}
            </div>
          )}
        </section>
      ))}
      <section className="space-y-3">
        <h3 className="border-b border-border pb-2 text-xl font-semibold text-foreground">Conclusão Final</h3>
        {rel.conclusions.map((p) => <p key={p} className="text-sm leading-relaxed text-foreground">{p}</p>)}
        <p className="text-xs text-muted-foreground">As conclusões se limitam aos números recuperados e à cobertura identificada nas fontes; não atribuem causas nem substituem a análise institucional.</p>
      </section>
    </article>
  );
}
