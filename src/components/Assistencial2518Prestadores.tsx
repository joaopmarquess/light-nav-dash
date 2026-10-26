import { useEffect, useMemo, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { buildPdfTabela } from "@/lib/pdfTabela";
import { groupRowStyles, totalRowStyles } from "@/lib/pdfTheme";
import PdfPreview from "@/components/PdfPreview";
import * as XLSX from "xlsx";
import type { RowInput } from "jspdf-autotable";

type Prest = { cd: string; nome: string; endereco: string; telefones: string; email: string; valor: number };
type Grupo = { cidade: string; total: number; itens: Prest[] };

const split = (l: string) => l.split(";").map((s) => s.trim());
const num = (s: string) => Number(String(s || "0").replace(/\./g, "").replace(",", ".")) || 0;
const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clean = (s?: string) => { const t = (s ?? "").trim(); return t === "(vazio)" ? "" : t; };

const normEnd = (e: string) =>
  e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
    .replace(/\b(RUA|R|AVENIDA|AV|ALAMEDA|AL|TRAVESSA|TV|PRACA|PC|ESTRADA|ROD|RODOVIA)\b\.?/g, "")
    .replace(/[^A-Z0-9]+/g, " ").trim();

/** Despesas: valor desc. Endereços: blocos de endereço semelhante, ordenados pelo maior valor do bloco. */
function ordenarItens(itens: Prest[], ordem: "despesas" | "enderecos"): (Prest & { topo?: boolean; fim?: boolean })[] {
  const byVal = [...itens].sort((x, y) => y.valor - x.valor);
  if (ordem === "despesas") return byVal;
  const blocos = new Map<string, Prest[]>();
  for (const p of byVal) {
    const k = normEnd(p.endereco) || `__${p.cd}`;
    (blocos.get(k) ?? blocos.set(k, []).get(k)!).push(p);
  }
  return [...blocos.values()].flatMap((b) => b.map((p, i) => ({ ...p, topo: i === 0 && b.length > 1, fim: i === b.length - 1 && b.length > 1 }))); // ordem de inserção = maior valor primeiro
}

/** "(DDD) 9XXXX-XXXX": DDD do primeiro telefone + primeiro número iniciado por 9. */
export function supostoCelular(tel: string): string {
  const ddd = tel.match(/\(\s*0?(\d{2})\s*\)/)?.[1];
  if (!ddd) return "";
  for (const parte of tel.split("/")) {
    const d = parte.replace(/\(\s*\d{2,3}\s*\)/, "").replace(/\D/g, "");
    if (d.startsWith("9") && d.length >= 9) return `(${ddd}) ${d.slice(0, 5)}-${d.slice(5, 9)}`;
  }
  return "";
}

export default function Assistencial2518Prestadores() {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [a, c] = await Promise.all([
          fetch("/data/2518_assistencial_processo.csv").then((r) => r.text()),
          fetch("/data/credenciados_2518.csv").then((r) => r.text()),
        ]);
        const cred = new Map<string, { nome: string; cidade: string; end: string; tel: string; email: string }>();
        const cl = c.split(/\r?\n/).filter(Boolean);
        for (const l of cl.slice(1)) {
          const [cd, ds, cid, end, fon, site, email] = split(l);
          const tel = [clean(fon), clean(site)].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(" / ");
          cred.set(cd, { nome: ds, cidade: cid, end: clean(end), tel, email: clean(email) });
        }
        const al = a.split(/\r?\n/).filter(Boolean);
        const h = split(al[0]);
        const iCd = h.indexOf("cdcrdexe"), iDs = h.indexOf("dscrdexe"), iT = h.indexOf("Total");
        const acc = new Map<string, Prest & { cidade: string }>();
        for (const l of al.slice(1)) {
          const r = split(l);
          const cd = r[iCd] ?? "";
          const info = cred.get(cd);
          const p = acc.get(cd) ?? {
            cd, nome: r[iDs] || info?.nome || "", endereco: info?.end ?? "", telefones: info?.tel ?? "", email: info?.email ?? "",
            cidade: clean(info?.cidade) || "SEM CIDADE", valor: 0,
          };
          p.valor += num(r[iT]);
          acc.set(cd, p);
        }
        const gm = new Map<string, Grupo>();
        for (const p of acc.values()) {
          const g = gm.get(p.cidade) ?? { cidade: p.cidade, total: 0, itens: [] };
          g.itens.push(p); g.total += p.valor; gm.set(p.cidade, g);
        }
        const gs = [...gm.values()].sort((x, y) => (x.cidade === "SEM CIDADE" ? -1 : y.cidade === "SEM CIDADE" ? 1 : y.total - x.total));
        gs.forEach((g) => g.itens.sort((x, y) => y.valor - x.valor));
        setGrupos(gs);
      } catch (e) { setErro(String(e)); }
    })();
  }, []);

  const total = useMemo(() => (grupos ?? []).reduce((s, g) => s + g.total, 0), [grupos]);

  const buildPdf = (ordem: "despesas" | "enderecos" = "despesas") => {
    const sections: RowInput[][] = [];
    for (const g of grupos ?? []) {
      const body: RowInput[] = [];
      sections.push(body);
      body.push([
        { content: `${g.cidade}  (${g.itens.length})`, colSpan: 5, styles: { ...groupRowStyles, fontSize: 11, fontStyle: "bold", cellPadding: 2 } },
        { content: fmt(g.total), styles: { ...groupRowStyles, fontSize: 11, fontStyle: "bold", halign: "right", cellPadding: 2 } },
      ]);
      for (const p of ordenarItens(g.itens, ordem)) {
        const st: Record<string, unknown> = p.topo ? { fontStyle: "bold" } : {};
        if (p.topo || p.fim) st.lineWidth = { top: p.topo ? 0.6 : 0.1, bottom: p.fim ? 0.6 : 0.1, left: 0.1, right: 0.1 }; if (p.topo || p.fim) st.lineColor = [0, 0, 0];
        body.push([p.cd, p.nome, p.endereco, p.telefones, p.email, { content: fmt(p.valor), styles: { halign: "right" as const } }].map((c) => (typeof c === "string" ? { content: c, styles: st } : { ...c, styles: { ...c.styles, ...st } })));
      }
    }
    return buildPdfTabela({
      fileName: ordem === "enderecos" ? "2518_prestadores_enderecos.pdf" : "2518_prestadores_geral.pdf",
      topTitle: "PRESTADORES",
      title: "Relatório Despesas Assistenciais",
      plano: "SINDICATO DOS SERVIDORES PUBLICOS MUNICIPAIS DE JALES E REGIAO - SSPMJR",
      secao: "Prestadores por cidade — valor total por credenciado executor",
      head: [["Código", "Credenciado", "Endereço", "Telefones", "E-mail", "Valor (R$)"]],
      body: [],
      sections,
      sectionLabels: (grupos ?? []).map((g) => g.cidade),
      foot: [[{ content: "TOTAL", colSpan: 5, styles: totalRowStyles }, { content: fmt(total), styles: { ...totalRowStyles, halign: "right" } }]],
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 42 }, 2: { cellWidth: 48 }, 3: { cellWidth: 30 }, 4: { cellWidth: 36 }, 5: { cellWidth: 24, halign: "right" } },
      fontSize: 7,
    });
  };

  const gerarXlsx = () => {
    const n = Math.max(3, ...(grupos ?? []).flatMap((g) => g.itens.map((p) => p.email.split(" / ").filter(Boolean).length)));
    const rows = (grupos ?? []).flatMap((g) => g.itens.map((p) => {
      const es = p.email.split(" / ").map((e) => e.trim()).filter(Boolean);
      const extra: Record<string, string> = {};
      for (let i = 0; i < n; i++) extra[`email${i + 1}`] = es[i] ?? "";
      return { "Código": p.cd, Credenciado: p.nome, "Endereço": p.endereco, Cidade: g.cidade, Telefones: p.telefones, "Suposto Celular": supostoCelular(p.telefones), "E-mail": p.email, ...extra, "Valor (R$)": p.valor };
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prestadores");
    XLSX.writeFile(wb, "2518_prestadores.xlsx");
  };

  const baixarDois = async () => {
    (await buildPdf("despesas")).save("2518_prestadores_geral.pdf");
    await new Promise((r) => setTimeout(r, 600));
    (await buildPdf("enderecos")).save("2518_prestadores_enderecos.pdf");
  };

  if (erro) return <div className="p-4 text-sm text-destructive">Erro: {erro}</div>;
  if (!grupos) return <div className="p-4 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">2518 Prestadores — total {fmt(total)}</h2>
        <div className="flex items-center gap-2">
        <button onClick={gerarXlsx} className="h-9 px-3 rounded-md border border-border text-sm inline-flex items-center gap-2">
          <FileDown className="h-4 w-4" /> Gerar XLSX
        </button>
        <button onClick={() => setPreview(true)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
          <FileDown className="h-4 w-4" /> Gerar PDF
        </button>
        </div>
      </div>
      <div className="overflow-auto border border-border rounded-md">
        <table className="w-full text-xs [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr><th className="p-2 text-left">Código</th><th className="p-2 text-left">Credenciado</th><th className="p-2 text-left">Endereço</th><th className="p-2 text-left">Telefones</th><th className="p-2 text-left">E-mail</th><th className="p-2 text-right">Valor (R$)</th></tr>
          </thead>
          <tbody>
            {grupos.map((g) => [
              <tr key={g.cidade} onClick={() => setAbertas((s) => { const n = new Set(s); n.has(g.cidade) ? n.delete(g.cidade) : n.add(g.cidade); return n; })} className="border-t border-border bg-background hover:bg-muted/50 font-medium cursor-pointer select-none"><td colSpan={5} className="p-2">{abertas.has(g.cidade) ? "▾" : "▸"} {g.cidade} ({g.itens.length})</td><td className="p-2 text-right">{fmt(g.total)}</td></tr>,
              ...(abertas.has(g.cidade) ? g.itens : []).map((p) => (
                <tr key={g.cidade + p.cd} className="border-t border-border bg-muted/20">
                  <td className="p-2">{p.cd}</td><td className="p-2">{p.nome}</td><td className="p-2">{p.endereco}</td><td className="p-2">{p.telefones}</td><td className="p-2 break-all">{p.email}</td><td className="p-2 text-right">{fmt(p.valor)}</td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      {preview && <PdfPreview build={() => buildPdf("despesas")} fileName="2518_prestadores_geral.pdf" onClose={() => setPreview(false)} onDownload={baixarDois} />}
    </div>
  );
}
