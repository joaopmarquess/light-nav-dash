import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarRange, FileBarChart2, FileDown, Eye, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { carregarRelatorio, type ControladoriaReport } from "@/control/relatorio/controladoriaDados";
import { dataBR, periodoRelatorio } from "@/control/relatorio/controladoriaRegras";
import { comporPdfRelatorio, paginasRelatorio, type ReportPdf } from "@/control/relatorio/controladoriaPdf";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export default function RelatorioControladoria() {
  const now = new Date();
  const [ano, setAno] = useState(now.getUTCFullYear());
  const [mes, setMes] = useState(String(now.getUTCMonth() || 12));
  const [tri, setTri] = useState("0");
  const [report, setReport] = useState<ControladoriaReport | null>(null);
  const [pdf, setPdf] = useState<ReportPdf | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const generation = useRef(0);
  const viewer = useRef<HTMLDivElement>(null);
  useEffect(() => () => { generation.current += 1; }, []);
  const generate = async (refresh = false) => {
    let period;
    try { period = refresh && report ? report.period : periodoRelatorio(ano, Number(mes), Number(tri)); } catch (e) { setError(e instanceof Error ? e.message : "Período inválido."); return; }
    const current = ++generation.current;
    setBusy(true); setError(""); setPages([]); setPdf(null); setReport(null);
    try {
      const result = await carregarRelatorio(period, message => { if (current === generation.current) setStatus(message); });
      if (current !== generation.current) return;
      setReport(result); setStatus("PDF sendo preparado…");
      const document = await comporPdfRelatorio(result);
      if (current !== generation.current) return;
      setPdf(document);
      await paginasRelatorio(document, (src) => { if (current === generation.current) setPages(prev => [...prev, src]); });
      if (current === generation.current) setStatus("Relatório gerado");
    } catch (e) { if (current === generation.current) { setError(e instanceof Error ? e.message : "Não foi possível gerar o relatório."); setStatus(""); } }
    finally { if (current === generation.current) setBusy(false); }
  };
  const download = () => { if (pdf && report) pdf.doc.save(`Relatorio_Controladoria_${report.period.de}_${report.period.ate}.pdf`); };
  const gotoPage = (page: number) => {
    const container = viewer.current;
    const target = container?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    if (!container || !target) return;
    container.scrollTo({ top: target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 24, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return <div className={`control-report ${preview ? "control-report-preview" : ""}`}>
    <header className="control-report-header">
      <FileBarChart2 className="h-6 w-6 text-primary" />
      <h1 className="text-xl font-semibold text-foreground">Modelo Relatório de Controladoria</h1>
      {preview && <Button variant="outline" className="ml-auto" onClick={() => setPreview(false)}>Voltar ao relatório</Button>}
    </header>
    {!preview && <section className="control-report-config" aria-label="Configuração do relatório">
      <label>Ano<Input aria-label="Ano" type="number" min={1900} max={2200} value={ano} onChange={e => setAno(Number(e.target.value))} disabled={busy} /></label>
      <label>Mês<Select value={mes} onValueChange={setMes} disabled={busy}><SelectTrigger aria-label="Mês"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Todos</SelectItem>{months.map((name, i) => <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>)}</SelectContent></Select></label>
      <label>Trimestre<Select value={tri} onValueChange={setTri} disabled={busy}><SelectTrigger aria-label="Trimestre"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Todos</SelectItem>{[1, 2, 3, 4].map(t => <SelectItem key={t} value={String(t)}>{t}º trimestre</SelectItem>)}</SelectContent></Select></label>
      <Button onClick={() => void generate()} disabled={busy}><FileBarChart2 />Gerar Relatório</Button>
      <Button variant="outline" onClick={() => void generate(true)} disabled={busy || !report}><RefreshCw />Atualizar Dados</Button>
      <Button variant="outline" onClick={() => { setPreview(true); gotoPage(1); }} disabled={busy || !pdf || !pages.length}><Eye />Visualizar PDF</Button>
      <Button variant="outline" onClick={download} disabled={busy || !pdf || !pages.length}><FileDown />Gerar PDF</Button>
    </section>}
    {error && <p role="alert" className="border-b border-border px-6 py-3 text-sm text-destructive">{error}</p>}
    {busy && <p role="status" className="flex items-center gap-2 border-b border-border px-6 py-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />{status}</p>}
    {report && <div className="control-report-applied"><CalendarRange className="h-4 w-4" /><strong>{dataBR(report.period.de)} a {dataBR(report.period.ate)}</strong><span>{busy ? "" : status}</span></div>}
    <div className="control-report-body">
      {!preview && pdf && <nav className="control-report-toc" aria-label="Tópicos do relatório"><h2><BookOpen className="h-4 w-4" />Sumário</h2><Button variant="ghost" onClick={() => gotoPage(1)}>Capa</Button>{pdf.contents.map(item => <Button key={item.id} variant="ghost" onClick={() => gotoPage(item.page)}><span>{item.title}</span><span className="text-muted-foreground">{item.page}</span></Button>)}</nav>}
      <div ref={viewer} className="control-report-viewer" aria-label="Relatório de Controladoria">
        {!pages.length && !busy && <div className="control-report-empty"><FileBarChart2 className="h-12 w-12 text-primary" /><h2>Relatório de Controladoria</h2><span>AXIS / CONTROL</span></div>}
        {pages.map((src, i) => <figure key={`${report?.generatedAt}-${i}`} data-page={i + 1} className="control-report-page"><img src={src} alt={`Relatório de Controladoria — página ${i + 1} de ${pdf?.doc.getNumberOfPages() ?? pages.length}`} /></figure>)}
        {report && <div className="sr-only">{report.blocks.map(block => <section key={block.id}><h2>{block.title}</h2>{block.paragraphs.map(p => <p key={p}>{p}</p>)}{block.notice && <p>{block.notice}</p>}{block.cards.map(card => <p key={card.label}>{card.label}: {card.value}</p>)}</section>)}</div>}
      </div>
    </div>
  </div>;
}