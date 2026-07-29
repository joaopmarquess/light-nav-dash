import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronDown, FileDown, Printer, X, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import FunLoader from "@/components/FunLoader";
import bensaudeLogoAsset from "@/assets/bensaude-logo.svg.asset.json";

const bensaudeLogoUrl = bensaudeLogoAsset.url;

type Row = {
  bscmp: string;
  nmctr: string;
  cdcontrato: string;
  dp: string;
  beneficiario: string;
  dsevento: string;
  valor: number;
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseNum = (s: string) => {
  if (!s) return 0;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const fmtBscmp = (s: string) => {
  if (/^\d{6}$/.test(s)) return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
  return s;
};

const EVENT_MAP: Record<string, { order: number; label: string }> = {
  "CARTEIRINHA": { order: 3, label: "Cartão|Inscrição" },
  "COPARTICIPACAO - VARIAVEL": { order: 2, label: "Coparticipação" },
  "COPARTICIPACAO PROCEDIMENTOS": { order: 2, label: "Coparticipação" },
  "CPP - CONTRAPRESTACAO PECUNIARIA": { order: 1, label: "Mensalidade" },
  "NEGOCIAÇÃO EM TMM": { order: 1, label: "Mensalidade" },
  "TAXA DE INSCRICAO": { order: 3, label: "Cartão|Inscrição" },
};

const mapEvento = (raw: string): { order: number; label: string } => {
  const key = (raw || "").trim().toUpperCase();
  for (const k of Object.keys(EVENT_MAP)) {
    if (k.toUpperCase() === key) return EVENT_MAP[k];
  }
  return { order: 99, label: raw || "(sem evento)" };
};

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].split(";").map((h) => h.trim());
  const idx = (n: string) => header.indexOf(n);
  const iBs = idx("bscmp");
  const iEv = idx("dsevento");
  const iVl = idx("valor");
  const iNm = idx("nmctr");
  const iCd = idx("cdcontrato");
  const iDp = idx("dp");
  const iBn = idx("beneficiario");
  const out: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(";");
    out.push({
      bscmp: (c[iBs] || "").trim(),
      nmctr: (c[iNm] || "").trim(),
      cdcontrato: (c[iCd] || "").trim(),
      dp: (c[iDp] || "").trim(),
      beneficiario: (c[iBn] || "").trim(),
      dsevento: (c[iEv] || "").trim(),
      valor: parseNum(c[iVl] || "0"),
    });
  }
  return out;
}

async function loadLogoAsPng(url: string): Promise<{ dataUrl: string; aspect: number }> {
  const res = await fetch(url);
  const svgText = await res.text();
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const objUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = objUrl;
    });
    const w = img.naturalWidth || 300;
    const h = img.naturalHeight || 100;
    const scale = 600 / w;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/png"), aspect: w / h };
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}

function buildPdf({
  rows,
  grouped,
  totalGeral,
  logoDataUrl,
  logoAspect,
}: {
  rows: Row[];
  grouped: { bscmp: string; total: number }[];
  totalGeral: number;
  logoDataUrl?: string;
  logoAspect?: number;
}): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 10;
  const marginR = 10;
  const marginT = 22;
  const marginB = 14;
  const usableW = pageW - marginL - marginR;

  const bsIni = grouped.length ? fmtBscmp(grouped[0].bscmp) : "";
  const bsFim = grouped.length ? fmtBscmp(grouped[grouped.length - 1].bscmp) : "";

  const header = () => {
    const line1Y = 10;
    if (logoDataUrl) {
      const h = 10;
      const w = h * (logoAspect ?? 3);
      try {
        doc.addImage(logoDataUrl, "PNG", marginL, line1Y - h / 2, w, h);
      } catch {
        // ignore
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    const titulo = `Relatório de Receitas 2518${bsIni ? ` | ${bsIni} a ${bsFim}` : ""}`;
    doc.text(titulo, pageW / 2, line1Y, { align: "center", baseline: "middle" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text("2518 Processo Rec.", marginL, 17);
    doc.setTextColor(0);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Seção 1 - Competência", marginL, marginT + 8);

  autoTable(doc, {
    styles: { font: "helvetica", fontSize: 8, cellPadding: 1.5, lineColor: [140, 140, 140], lineWidth: 0.1, textColor: 20 },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: "bold", lineColor: [140, 140, 140], lineWidth: 0.1 },
    footStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: "bold" },
    theme: "grid",
    margin: { left: marginL, right: marginR, top: marginT + 4, bottom: marginB },
    startY: marginT + 10,
    head: [[
      { content: "bscmp", styles: { halign: "center" } },
      { content: "Valor", styles: { halign: "right" } },
    ]],
    body: grouped.map((g) => [
      { content: fmtBscmp(g.bscmp), styles: { halign: "center" } },
      { content: fmtBRL(g.total), styles: { halign: "right" } },
    ]),
    foot: [[
      { content: "Total", styles: { halign: "left" } },
      { content: fmtBRL(totalGeral), styles: { halign: "right" } },
    ]],
    columnStyles: {
      0: { cellWidth: usableW * 0.5 },
      1: { cellWidth: usableW * 0.5 },
    },
    didDrawPage: () => header(),
  });

  // ============ Seção 2 ============
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text("Seção 2 - Detalhado por Contrato / Beneficiário", marginL, marginT + 8);

  // Build hierarchical body
  type Body = (string | { content: string; colSpan?: number; styles?: any })[];
  const body: Body[] = [];
  const subFill: [number, number, number] = [242, 242, 242];
  const contractFill: [number, number, number] = [225, 225, 225];
  const bscmpFill: [number, number, number] = [205, 215, 230];

  // Group rows
  const byBs = new Map<string, Map<string, { nmctr: string; cdcontrato: string; dps: Map<string, Map<string, Row[]>> }>>();
  for (const r of rows) {
    if (!byBs.has(r.bscmp)) byBs.set(r.bscmp, new Map());
    const bMap = byBs.get(r.bscmp)!;
    const key = `${r.cdcontrato}||${r.nmctr}`;
    if (!bMap.has(key)) bMap.set(key, { nmctr: r.nmctr, cdcontrato: r.cdcontrato, dps: new Map() });
    const c = bMap.get(key)!;
    if (!c.dps.has(r.dp)) c.dps.set(r.dp, new Map());
    const dpMap = c.dps.get(r.dp)!;
    if (!dpMap.has(r.beneficiario)) dpMap.set(r.beneficiario, []);
    dpMap.get(r.beneficiario)!.push(r);
  }

  const bscmpKeys = Array.from(byBs.keys()).sort();
  for (const bs of bscmpKeys) {
    const bMap = byBs.get(bs)!;
    let bsTotal = 0;
    const contracts = Array.from(bMap.entries()).sort((a, b) =>
      a[1].nmctr.localeCompare(b[1].nmctr, "pt-BR")
    );
    for (const [, c] of contracts) {
      let cTotal = 0;
      const dps = Array.from(c.dps.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      for (const [dp, benMap] of dps) {
        let dpTotal = 0;
        const bens = Array.from(benMap.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
        for (const [ben, rs] of bens) {
          const evMap = new Map<string, { order: number; valor: number }>();
          for (const r of rs) {
            const { order, label } = mapEvento(r.dsevento);
            const cur = evMap.get(label) ?? { order, valor: 0 };
            cur.valor += r.valor;
            evMap.set(label, cur);
          }
          const evs = Array.from(evMap.entries())
            .map(([label, v]) => ({ label, ...v }))
            .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
          for (const e of evs) {
            body.push([
              "", "", "", ben, e.label,
              { content: fmtBRL(e.valor), styles: { halign: "right" } },
            ]);
            dpTotal += e.valor;
          }
        }
        body.push([
          "", "",
          { content: `${dp} Total`, colSpan: 3, styles: { halign: "left", fontStyle: "bold", fillColor: subFill } },
          { content: fmtBRL(dpTotal), styles: { halign: "right", fontStyle: "bold", fillColor: subFill } },
        ]);
        cTotal += dpTotal;
      }
      body.push([
        "",
        { content: `${c.nmctr} (${c.cdcontrato}) Total`, colSpan: 4, styles: { halign: "left", fontStyle: "bold", fillColor: contractFill } },
        { content: fmtBRL(cTotal), styles: { halign: "right", fontStyle: "bold", fillColor: contractFill } },
      ]);
      bsTotal += cTotal;
    }
    body.push([
      { content: `${fmtBscmp(bs)} Total`, colSpan: 5, styles: { halign: "left", fontStyle: "bold", fillColor: bscmpFill } },
      { content: fmtBRL(bsTotal), styles: { halign: "right", fontStyle: "bold", fillColor: bscmpFill } },
    ]);
  }

  autoTable(doc, {
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1.2, lineColor: [180, 180, 180], lineWidth: 0.1, textColor: 20, overflow: "linebreak" },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: "bold", lineColor: [140, 140, 140], lineWidth: 0.1 },
    footStyles: { fillColor: [180, 200, 220], textColor: 20, fontStyle: "bold" },
    theme: "grid",
    margin: { left: marginL, right: marginR, top: marginT + 4, bottom: marginB },
    startY: marginT + 10,
    head: [[
      { content: "bscmp", styles: { halign: "center" } },
      { content: "nmctr", styles: { halign: "left" } },
      { content: "dp", styles: { halign: "center" } },
      { content: "beneficiário", styles: { halign: "left" } },
      { content: "dsevento", styles: { halign: "left" } },
      { content: "Total", styles: { halign: "right" } },
    ]],
    body: body as any,
    foot: [[
      { content: "Total Geral", colSpan: 5, styles: { halign: "left" } },
      { content: fmtBRL(totalGeral), styles: { halign: "right" } },
    ]],
    columnStyles: {
      0: { cellWidth: usableW * 0.10, halign: "center" },
      1: { cellWidth: usableW * 0.28 },
      2: { cellWidth: usableW * 0.06, halign: "center" },
      3: { cellWidth: usableW * 0.28 },
      4: { cellWidth: usableW * 0.16 },
      5: { cellWidth: usableW * 0.12, halign: "right" },
    },
    didDrawPage: () => header(),
  });

  // Numeração de páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`${i} de ${totalPages}`, pageW - marginR, doc.internal.pageSize.getHeight() - 6, { align: "right" });
  }

  return doc;
}

function ReportPreview({
  rows,
  grouped,
  totalGeral,
  onClose,
}: {
  rows: Row[];
  grouped: { bscmp: string; total: number }[];
  totalGeral: number;
  onClose: () => void;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<jsPDF | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const logo = await loadLogoAsPng(bensaudeLogoUrl).catch(() => null);
      const doc = buildPdf({
        rows,
        grouped,
        totalGeral,
        logoDataUrl: logo?.dataUrl,
        logoAspect: logo?.aspect,
      });
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
      console.error("[ReceitasReport] falha:", err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doDownload = () => {
    docRef.current?.save("receitas_2518.pdf");
  };
  const doPrint = () => {
    if (!pages.length) return;
    const w = window.open("", "_blank");
    if (!w) { doDownload(); return; }
    const imgsHtml = pages
      .map((src) => `<img src="${src}" style="display:block;width:100%;page-break-after:always;" />`)
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title>
<style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff}img{max-width:100%}@media print{img{page-break-after:always}}</style>
</head><body>${imgsHtml}<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250);};</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="bg-card border-b border-border p-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          Pré-visualização do Relatório (PDF) {pages.length > 0 && `— ${pages.length} página(s)`}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={doDownload} disabled={loading} className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2">
            <FileDown className="h-4 w-4" /> Baixar PDF
          </button>
          <button onClick={doPrint} disabled={loading || !pages.length} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent inline-flex items-center gap-2">
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-neutral-800 p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando PDF...
          </div>
        ) : !pages.length ? (
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

export default function AssistencialReceitas2518() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/2518_receitas.csv");
        if (!res.ok) throw new Error("Falha ao ler CSV");
        const buf = await res.arrayBuffer();
        let text = new TextDecoder("utf-8").decode(buf);
        if (text.includes("\uFFFD")) text = new TextDecoder("iso-8859-1").decode(buf);
        setRows(parseCsv(text));
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    if (!rows) return [];
    const byBs = new Map<string, Map<string, { order: number; valor: number }>>();
    for (const r of rows) {
      const { order, label } = mapEvento(r.dsevento);
      if (!byBs.has(r.bscmp)) byBs.set(r.bscmp, new Map());
      const m = byBs.get(r.bscmp)!;
      const cur = m.get(label) ?? { order, valor: 0 };
      cur.valor += r.valor;
      m.set(label, cur);
    }
    const arr = Array.from(byBs.entries())
      .map(([bscmp, m]) => {
        const eventos = Array.from(m.entries())
          .map(([dsevento, v]) => ({ dsevento, valor: v.valor, order: v.order }))
          .sort((a, b) => a.order - b.order || a.dsevento.localeCompare(b.dsevento));
        const total = eventos.reduce((s, e) => s + e.valor, 0);
        return { bscmp, total, eventos };
      })
      .sort((a, b) => a.bscmp.localeCompare(b.bscmp));
    return arr;
  }, [rows]);

  const totalGeral = useMemo(
    () => grouped.reduce((s, g) => s + g.total, 0),
    [grouped]
  );

  const s1 = useMemo(
    () => grouped.map(({ bscmp, total }) => ({ bscmp, total })),
    [grouped]
  );

  if (error)
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-destructive">
        Erro: {error}
      </section>
    );
  if (!rows)
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center">
        <FunLoader />
      </section>
    );

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">2518 Processo Rec.</h2>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            Total Geral: <span className="font-semibold text-foreground tabular-nums">{fmtBRL(totalGeral)}</span>
          </div>
          <button
            onClick={() => setShowPdf(true)}
            disabled={!grouped.length}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            Gerar PDF
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/70 backdrop-blur">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Competência / Evento</th>
              <th className="px-3 py-2 font-medium text-right w-56">Valor</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => {
              const isOpen = !!open[g.bscmp];
              return (
                <>
                  <tr
                    key={g.bscmp}
                    className="border-t border-border hover:bg-accent/40 cursor-pointer"
                    onClick={() => setOpen((p) => ({ ...p, [g.bscmp]: !p[g.bscmp] }))}
                  >
                    <td className="px-3 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {g.bscmp}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtBRL(g.total)}</td>
                  </tr>
                  {isOpen &&
                    g.eventos.map((e) => (
                      <tr key={g.bscmp + "|" + e.dsevento} className="border-t border-border/60 bg-muted/20">
                        <td className="px-3 py-1.5 pl-10 text-foreground/80">{e.dsevento}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtBRL(e.valor)}</td>
                      </tr>
                    ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPdf && (
        <ReportPreview
          rows={rows}
          grouped={s1}
          totalGeral={totalGeral}
          onClose={() => setShowPdf(false)}
        />
      )}
    </section>
  );
}
