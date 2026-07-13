import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { odo, type OdoFornecedor } from "@/lib/odoClient";
import { readAnexo, type OdoAnexo } from "@/lib/odoAnexo";
import { Loader2, Printer } from "lucide-react";

const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const diaOf = (iso: string | null) => (iso ? iso.split("-")[2] : "-");

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const nomeMes = (mes: string) => {
  if (!mes) return "";
  const [y, m] = mes.split("-").map(Number);
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${nomes[(m ?? 1) - 1]}/${y}`;
};

export type OdoRelatorioTipo = "lista" | "global" | "folha";

interface Props {
  tipo: OdoRelatorioTipo;
  protocolo?: string;
  mes: string;
  showPrintBar?: boolean;
  autoPrint?: boolean;
}

export default function OdoRelatorioView({ tipo, protocolo = "", mes, showPrintBar = true, autoPrint = false }: Props) {
  const [pagamentos, setPagamentos] = useState<OdoFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const anexo: OdoAnexo | null = useMemo(
    () => (tipo === "lista" && protocolo ? readAnexo(protocolo) : null),
    [tipo, protocolo],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = odo.from("odo_fornecedor").select("*").order("vencimento");
      if ((tipo === "lista" || tipo === "global") && protocolo) {
        const parts = protocolo.split("-");
        const id = Number(parts[2] ?? 0);
        q = q.eq("id", id);
      }
      const { data } = await q;
      if (cancelled) return;
      setPagamentos((data as OdoFornecedor[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tipo, protocolo, mes]);

  const total = useMemo(
    () => pagamentos.reduce((s, r) => s + (Number(r.vl_bruto) || 0), 0),
    [pagamentos],
  );

  const hoje = new Date().toLocaleDateString("pt-BR");

  const printUrl = useMemo(() => {
    const params = new URLSearchParams({ tipo, mes });
    if (protocolo) params.set("protocolo", protocolo);
    params.set("print", "1");
    return `/odo-relatorio?${params.toString()}`;
  }, [tipo, protocolo, mes]);

  const exportPdf = useCallback(async () => {
    const element = reportRef.current;
    if (!element || loading || exportingPdf) return;
    setExportingPdf(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const marginMm = 14;
      const contentWidthMm = pageWidthMm - marginMm * 2;
      const contentHeightMm = pageHeightMm - marginMm * 2;
      const sections = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-section]"));

      for (let i = 0; i < sections.length; i += 1) {
        const section = sections[i];
        const canvas = await html2canvas(section, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          windowWidth: section.scrollWidth,
          windowHeight: section.scrollHeight,
        });
        const imgData = canvas.toDataURL("image/png");
        const sectionHeightMm = Math.min(contentHeightMm, (canvas.height * contentWidthMm) / canvas.width);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", marginMm, marginMm, contentWidthMm, sectionHeightMm, undefined, "FAST");
      }

      const safeName = protocolo || `${mes}-${tipo}`;
      pdf.save(`odo-${safeName}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }, [exportingPdf, loading, mes, protocolo, tipo]);

  const handlePrint = () => {
    if (window.location.pathname === "/odo-relatorio") {
      exportPdf();
      return;
    }
    window.open(printUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!autoPrint || loading) return;
    const timeout = window.setTimeout(() => exportPdf(), 500);
    return () => window.clearTimeout(timeout);
  }, [autoPrint, exportPdf, loading]);

  const printBar = showPrintBar ? (
    <div className="no-print bg-slate-100 border-b border-slate-300 px-6 py-3 pr-16 flex items-center justify-between gap-4">
      <span className="text-sm text-slate-600">
        Pré-visualização —{" "}
        {tipo === "folha"
          ? `Folha ODO-NRPS ${nomeMes(mes)}`
          : tipo === "global"
          ? "Relatório Global (por fornecedor)"
          : "Relatório por Lista (por fornecedor)"}
      </span>
      <button
        onClick={handlePrint}
        disabled={loading || exportingPdf}
        className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium flex items-center gap-2"
      >
        {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        {exportingPdf ? "Gerando PDF…" : "Gerar PDF"}
      </button>
    </div>
  ) : null;

  const styleBlock = (
    <style>{`
      @media print {
        .no-print { display: none !important; }
        body { background: white; }
        #root { min-height: auto !important; }
        table { break-inside: auto; page-break-inside: auto; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        .break-before-page { break-before: page; page-break-before: always; }
      }
      @page { size: A4; margin: 18mm; }
    `}</style>
  );

  if (tipo === "folha") {
    return (
      <div className="bg-white text-black">
        {styleBlock}
        {printBar}
        <div ref={reportRef} className="max-w-[210mm] mx-auto px-10 py-10">
          <section data-pdf-section className="bg-white p-6">
          <header className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">ODO-NRPS</p>
                <h1 className="text-3xl font-black tracking-tight mt-1">FOLHA DE PAGAMENTO</h1>
                <p className="text-sm text-slate-600 mt-1">
                  Competência <span className="font-semibold text-slate-800">{nomeMes(mes)}</span>
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-600 leading-relaxed">
                <p>Emitido em</p>
                <p className="font-semibold text-slate-800">{hoje}</p>
                <p className="font-mono mt-1">{`${mes}-FOLHA`}</p>
              </div>
            </div>
            <div className="mt-4 h-1 bg-slate-900 rounded" />
          </header>

          {loading ? (
            <p className="text-slate-500">Carregando…</p>
          ) : (
            <>
              <section className="grid grid-cols-3 gap-3 mb-8">
                <div className="border border-slate-300 rounded-md p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Fornecedores</p>
                  <p className="text-2xl font-bold mt-1">{pagamentos.length}</p>
                </div>
                <div className="border border-slate-300 rounded-md p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Total bruto</p>
                  <p className="text-2xl font-bold mt-1">{brl(total)}</p>
                </div>
                <div className="border border-slate-300 rounded-md p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Competência</p>
                  <p className="text-2xl font-bold mt-1">{nomeMes(mes) || "-"}</p>
                </div>
              </section>

              <section className="mb-4 text-xs leading-relaxed text-slate-700">
                <p>{LOREM}</p>
              </section>

              <section>
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="text-left px-2 py-2">#</th>
                      <th className="text-left px-2 py-2">Cód.</th>
                      <th className="text-left px-2 py-2">Fornecedor</th>
                      <th className="text-left px-2 py-2">Objeto</th>
                      <th className="text-center px-2 py-2">Dia venc.</th>
                      <th className="text-left px-2 py-2">Tipo rel.</th>
                      <th className="text-right px-2 py-2">Valor bruto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentos.map((r, i) => (
                      <tr key={r.id} className={i % 2 ? "bg-slate-50" : ""}>
                        <td className="px-2 py-1.5 border-b border-slate-200">{i + 1}</td>
                        <td className="px-2 py-1.5 border-b border-slate-200 font-mono">
                          {r.cd_fornecedor ?? "-"}
                        </td>
                        <td className="px-2 py-1.5 border-b border-slate-200 font-medium">
                          {r.fornecedor}
                        </td>
                        <td className="px-2 py-1.5 border-b border-slate-200">{r.objeto ?? "-"}</td>
                        <td className="px-2 py-1.5 border-b border-slate-200 text-center font-mono">
                          {diaOf(r.vencimento)}
                        </td>
                        <td className="px-2 py-1.5 border-b border-slate-200 text-[10px] uppercase tracking-wider">
                          {r.tp_relatorio ?? "-"}
                        </td>
                        <td className="px-2 py-1.5 border-b border-slate-200 text-right">
                          {brl(r.vl_bruto)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan={6} className="px-2 py-2 text-right">TOTAL DA FOLHA</td>
                      <td className="px-2 py-2 text-right">{brl(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <footer className="mt-16 grid grid-cols-3 gap-6 text-[11px]">
                <div className="border-t border-slate-800 pt-2 text-center">Elaborado por</div>
                <div className="border-t border-slate-800 pt-2 text-center">Conferido por</div>
                <div className="border-t border-slate-800 pt-2 text-center">Autorizado por</div>
              </footer>
            </>
          )}
          </section>
        </div>
      </div>
    );
  }

  const titulo =
    tipo === "global" ? "Relatório Global (por fornecedor)" : "Relatório por Lista";

  return (
    <div className="bg-white text-black">
      {styleBlock}
      {printBar}
      <div ref={reportRef} className="max-w-[210mm] mx-auto px-10 py-10">
        {loading ? (
          <p className="text-slate-500">Carregando…</p>
        ) : (
          <>
            <section data-pdf-section className="bg-white p-6">
              <header className="border-b-2 border-slate-800 pb-4 mb-6">
                <p className="text-xs uppercase tracking-wider text-slate-500">ODO-NRPS</p>
                <h1 className="text-2xl font-bold">{titulo}</h1>
                <div className="mt-2 flex justify-between text-xs text-slate-600">
                  <span>Emitido em {hoje}</span>
                  {protocolo && <span className="font-mono">Protocolo: {protocolo}</span>}
                </div>
              </header>

            <section className="mb-6 text-sm leading-relaxed text-slate-700">
              <p>{LOREM}</p>
            </section>

            {pagamentos[0] ? (
              <section className="mb-6 border border-slate-300 rounded-md p-4 text-sm">
                <h2 className="font-semibold mb-3">Dados do lançamento</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Fornecedor</p>
                    <p className="font-medium">{pagamentos[0].fornecedor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Código</p>
                    <p className="font-medium">{pagamentos[0].cd_fornecedor ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Dia do vencimento</p>
                    <p className="font-medium">{diaOf(pagamentos[0].vencimento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Valor bruto</p>
                    <p className="font-medium">{brl(pagamentos[0].vl_bruto)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Competência</p>
                    <p className="font-medium">{nomeMes(mes) || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tipo de relatório</p>
                    <p className="font-medium">{pagamentos[0].tp_relatorio ?? "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Objeto</p>
                    <p>{pagamentos[0].objeto ?? "-"}</p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="mt-8 text-xs leading-relaxed text-slate-700">
              <p>{LOREM}</p>
            </section>

            <footer className="mt-16 grid grid-cols-2 gap-8 text-xs">
              <div className="border-t border-slate-400 pt-2 text-center">Elaborado por</div>
              <div className="border-t border-slate-400 pt-2 text-center">Aprovado por</div>
            </footer>
            </section>

            {tipo === "lista" && anexo && (
              <section data-pdf-section className="mt-16 pt-10 border-t-2 border-dashed border-slate-400 break-before-page bg-white p-6">
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Anexo I</p>
                  <h2 className="text-xl font-bold mt-1">Lista de itens</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Origem: <span className="font-mono">{anexo.filename}</span> · aba{" "}
                    <span className="font-mono">{anexo.sheet}</span> ·{" "}
                    {anexo.rows.length} linha(s)
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-slate-700 mb-4">{LOREM}</p>

                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      {anexo.headers.map((h, i) => (
                        <th key={i} className="text-left px-2 py-2 border border-slate-700">
                          {h || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {anexo.rows.map((r, i) => (
                      <tr key={i} className={i % 2 ? "bg-slate-50" : ""}>
                        {anexo.headers.map((_, ci) => (
                          <td key={ci} className="px-2 py-1.5 border border-slate-200 align-top">
                            {r[ci] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
