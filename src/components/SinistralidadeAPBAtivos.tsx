import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, FileDown, Printer, X, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { baseTableStyles, drawReportHeading, totalRowStyles } from "@/lib/pdfTheme";
import { attachTimbrado, loadTimbrado } from "@/lib/pdfTimbrado";

type Row = Record<string, string>;

const DEP_COLS = ["dep 1", "dep 2", "dep 3", "dep 4"];

const toNum = (v: string) => Number(String(v ?? "").replace(/\./g, "").replace(",", ".")) || 0;
const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const depsOf = (r: Row) => DEP_COLS.map((c) => String(r[c] ?? "").trim()).filter(Boolean);

const SinistralidadeAPBAtivos = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    fetch("/data/apb_ativos.json")
      .then((r) => r.json())
      .then((d: Row[]) => setRows(d))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    const cols = ["cdpln", "cpf", "Colaborador", ...DEP_COLS];
    return rows.filter((r) => cols.some((c) => String(r[c] ?? "").toLowerCase().includes(t)));
  }, [rows, q]);

  const total = useMemo(
    () => filtered.reduce((s, r) => s + toNum(r["Valor_Evento_1"]), 0),
    [filtered],
  );
  const totalDeps = useMemo(
    () => filtered.reduce((s, r) => s + depsOf(r).length, 0),
    [filtered],
  );

  const buildDoc = async () => {
    const timbradoDataUrl = await loadTimbrado();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    attachTimbrado(doc, timbradoDataUrl);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 10;
    const marginR = 10;
    const marginT = 56;
    const marginB = 16;
    const usableW = pageW - marginL - marginR;

    const header = () =>
      drawReportHeading(doc, {
        title: "APB · Beneficiários Ativos",
        plano: `${filtered.length.toLocaleString("pt-BR")} colaborador(es) · ${totalDeps.toLocaleString("pt-BR")} dependente(s)`,
        secao: q.trim() ? `Filtro: ${q.trim()}` : "Relação de colaboradores e dependentes",
        marginL,
        marginR,
      });

    const base = baseTableStyles(6.4);
    const colW = {
      plano: usableW * 0.06,
      colab: usableW * 0.4,
      cpf: usableW * 0.12,
      dep: usableW * 0.06,
      ade: usableW * 0.09,
      canc: usableW * 0.09,
      val: usableW * 0.1,
      nasc: usableW * 0.08,
    };

    const body = filtered.map((r) => {
      const deps = depsOf(r);
      const label = [r["Colaborador"], ...deps.map((d, i) => `   dep ${i + 1}: ${d}`)].join("\n");
      return [
        r["cdpln"],
        label,
        r["cpf"],
        String(deps.length),
        r["adesao"],
        r["cancelado"],
        fmt(toNum(r["Valor_Evento_1"])),
        r["nascimento"],
      ];
    });

    autoTable(doc, {
      ...base,
      styles: { ...base.styles, fontSize: 6.4, cellPadding: 0.7, minCellHeight: 0, overflow: "linebreak", valign: "top" },
      headStyles: { ...base.headStyles, fontSize: 6.4, cellPadding: 0.6, minCellHeight: 0, halign: "center" },
      margin: { left: marginL, right: marginR, top: marginT, bottom: marginB },
      didDrawPage: () => { header(); },
      startY: marginT,
      head: [[
        "Plano",
        "Colaborador / Dependentes",
        "CPF",
        { content: "Dep.", styles: { halign: "center" as const } },
        "Adesão",
        "Cancelado",
        { content: "Valor Evento 1", styles: { halign: "right" as const } },
        "Nascimento",
      ]],
      body,
      foot: [[
        { content: "TOTAL", colSpan: 3, styles: { ...totalRowStyles, halign: "left", fontSize: 7 } },
        { content: String(totalDeps), styles: { ...totalRowStyles, halign: "center" as const, fontSize: 7 } },
        { content: "", styles: { ...totalRowStyles } },
        { content: "", styles: { ...totalRowStyles } },
        { content: fmt(total), styles: { ...totalRowStyles, halign: "right" as const, fontSize: 7 } },
        { content: "", styles: { ...totalRowStyles } },
      ]],
      showFoot: "lastPage",
      columnStyles: {
        0: { cellWidth: colW.plano, halign: "center" },
        1: { cellWidth: colW.colab, overflow: "linebreak", fontSize: 5.8 },
        2: { cellWidth: colW.cpf },
        3: { cellWidth: colW.dep, halign: "center" },
        4: { cellWidth: colW.ade, halign: "center" },
        5: { cellWidth: colW.canc, halign: "center" },
        6: { cellWidth: colW.val, halign: "right" },
        7: { cellWidth: colW.nasc, halign: "center" },
      },
    });

    const pages = doc.getNumberOfPages();
    const footY = pageH - 14;
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`${i} de ${pages}`, pageW - marginR, footY, { align: "right" });
    }
    return doc;
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar (plano, cpf, colaborador, dependente...)"
          className="h-9 w-96 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-xs text-muted-foreground">
          {filtered.length.toLocaleString("pt-BR")} linhas
        </span>
        <button
          type="button"
          onClick={() => setPdfOpen(true)}
          disabled={loading || filtered.length === 0}
          className="ml-auto h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <FileText className="h-4 w-4" /> Gerar PDF
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-accent text-primary">
              <tr>
                <th className="px-2 py-1.5 font-semibold text-left whitespace-nowrap">cdpln</th>
                <th className="px-2 py-1.5 font-semibold text-left whitespace-nowrap">cpf</th>
                <th className="px-2 py-1.5 font-semibold text-left">Colaborador</th>
                <th className="px-2 py-1.5 font-semibold text-center whitespace-nowrap">Dependentes</th>
                <th className="px-2 py-1.5 font-semibold text-left whitespace-nowrap">adesao</th>
                <th className="px-2 py-1.5 font-semibold text-left whitespace-nowrap">cancelado</th>
                <th className="px-2 py-1.5 font-semibold text-right whitespace-nowrap">Valor_Evento_1</th>
                <th className="px-2 py-1.5 font-semibold text-left whitespace-nowrap">nascimento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const deps = depsOf(r);
                return (
                  <tr key={i} className="border-b border-border/60 hover:bg-accent/40 align-top">
                    <td className="px-2 py-1 whitespace-nowrap">{r["cdpln"]}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{r["cpf"]}</td>
                    <td className="px-2 py-1">
                      <div>{r["Colaborador"]}</div>
                      {deps.map((d, j) => (
                        <div key={j} className="text-[9.5px] text-muted-foreground pl-3">
                          dep {j + 1}: {d}
                        </div>
                      ))}
                    </td>
                    <td className="px-2 py-1 text-center tabular-nums">{deps.length}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{r["adesao"]}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{r["cancelado"]}</td>
                    <td className="px-2 py-1 text-right tabular-nums whitespace-nowrap">{fmt(toNum(r["Valor_Evento_1"]))}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{r["nascimento"]}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card border-t border-border">
              <tr className="font-semibold">
                <td className="px-2 py-1.5">TOTAL</td>
                <td />
                <td />
                <td className="px-2 py-1.5 text-center tabular-nums">{totalDeps}</td>
                <td />
                <td />
                <td className="px-2 py-1.5 text-right tabular-nums">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {pdfOpen && (
        <PdfPreview
          onClose={() => setPdfOpen(false)}
          build={buildDoc}
          fileName="apb-ativos.pdf"
          linhas={filtered.length}
        />
      )}
    </section>
  );
};

function PdfPreview({
  onClose,
  build,
  fileName,
  linhas,
}: {
  onClose: () => void;
  build: () => Promise<jsPDF>;
  fileName: string;
  linhas: number;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<jsPDF | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = await build();
      docRef.current = doc;
      const pdfjs = await import("pdfjs-dist");
      const workerMod: { default: string } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;
      const data = doc.output("arraybuffer");
      const pdf = await pdfjs.getDocument({ data }).promise;
      const imgs: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        imgs.push(canvas.toDataURL("image/png"));
        if (cancelled) return;
      }
      if (!cancelled) {
        setPages(imgs);
        setLoading(false);
      }
    })().catch((err) => {
      console.error("[APB Ativos PDF] falha ao renderizar:", err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doDownload = () => docRef.current?.save(fileName);

  const doPrint = () => {
    if (pages.length === 0) return;
    const w = window.open("", "_blank");
    if (!w) { doDownload(); return; }
    const imgsHtml = pages
      .map((src) => `<img src="${src}" style="display:block;width:100%;page-break-after:always;" />`)
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>APB Ativos</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { max-width: 100%; }
  @media print { img { page-break-after: always; } }
</style>
</head><body>${imgsHtml}<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250);};</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="bg-card border-b border-border p-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          Gerar PDF · {linhas} linha(s){pages.length > 0 ? ` — ${pages.length} página(s)` : ""}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={doDownload}
            disabled={loading}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" /> Exportar PDF
          </button>
          <button
            onClick={doPrint}
            disabled={loading || pages.length === 0}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent inline-flex items-center gap-2"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-neutral-800 p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando PDF...
          </div>
        ) : pages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            Não foi possível gerar a pré-visualização.
          </div>
        ) : (
          <div className="mx-auto max-w-4xl flex flex-col gap-4">
            {pages.map((src, i) => (
              <img key={i} src={src} alt={`Página ${i + 1}`} className="w-full bg-white shadow-lg" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SinistralidadeAPBAtivos;
