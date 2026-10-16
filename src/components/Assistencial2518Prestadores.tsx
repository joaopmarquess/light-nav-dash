import { useEffect, useMemo, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { buildPdfTabela } from "@/lib/pdfTabela";
import { groupRowStyles, totalRowStyles } from "@/lib/pdfTheme";
import PdfPreview from "@/components/PdfPreview";
import type { RowInput } from "jspdf-autotable";

type Prest = { cd: string; nome: string; endereco: string; telefones: string; valor: number };
type Grupo = { cidade: string; total: number; itens: Prest[] };

const split = (l: string) => l.split(";").map((s) => s.trim());
const num = (s: string) => Number(String(s || "0").replace(/\./g, "").replace(",", ".")) || 0;
const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clean = (s?: string) => { const t = (s ?? "").trim(); return t === "(vazio)" ? "" : t; };

export default function Assistencial2518Prestadores() {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, c] = await Promise.all([
          fetch("/data/2518_assistencial_processo.csv").then((r) => r.text()),
          fetch("/data/credenciados_2518.csv").then((r) => r.text()),
        ]);
        const cred = new Map<string, { nome: string; cidade: string; end: string; tel: string }>();
        const cl = c.split(/\r?\n/).filter(Boolean);
        for (const l of cl.slice(1)) {
          const [cd, ds, cid, end, fon, site] = split(l);
          const tel = [clean(fon), clean(site)].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(" / ");
          cred.set(cd, { nome: ds, cidade: cid, end: clean(end), tel });
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
            cd, nome: r[iDs] || info?.nome || "", endereco: info?.end ?? "", telefones: info?.tel ?? "",
            cidade: info?.cidade || "SEM CIDADE", valor: 0,
          };
          p.valor += num(r[iT]);
          acc.set(cd, p);
        }
        const gm = new Map<string, Grupo>();
        for (const p of acc.values()) {
          const g = gm.get(p.cidade) ?? { cidade: p.cidade, total: 0, itens: [] };
          g.itens.push(p); g.total += p.valor; gm.set(p.cidade, g);
        }
        const gs = [...gm.values()].sort((x, y) => y.total - x.total);
        gs.forEach((g) => g.itens.sort((x, y) => y.valor - x.valor));
        setGrupos(gs);
      } catch (e) { setErro(String(e)); }
    })();
  }, []);

  const total = useMemo(() => (grupos ?? []).reduce((s, g) => s + g.total, 0), [grupos]);

  const buildPdf = () => {
    const body: RowInput[] = [];
    for (const g of grupos ?? []) {
      body.push([
        { content: `${g.cidade} (${g.itens.length})`, colSpan: 4, styles: groupRowStyles },
        { content: fmt(g.total), styles: { ...groupRowStyles, halign: "right" } },
      ]);
      for (const p of g.itens) body.push([p.cd, p.nome, p.endereco, p.telefones, fmt(p.valor)]);
    }
    return buildPdfTabela({
      fileName: "2518_SSPMJR-Prestadores.pdf",
      title: "PRESTADORES POR CIDADE",
      plano: "SINDICATO DOS SERVIDORES PUBLICOS MUNICIPAIS DE JALES E REGIAO - SSPMJR",
      secao: "Valor total por credenciado executor",
      head: [["Código", "Credenciado", "Endereço", "Telefones", "Valor (R$)"]],
      body,
      foot: [[{ content: "TOTAL", colSpan: 4, styles: totalRowStyles }, { content: fmt(total), styles: { ...totalRowStyles, halign: "right" } }]],
      columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 52 }, 2: { cellWidth: 62 }, 3: { cellWidth: 34 }, 4: { cellWidth: 28, halign: "right" } },
      fontSize: 7,
    });
  };

  if (erro) return <div className="p-4 text-sm text-destructive">Erro: {erro}</div>;
  if (!grupos) return <div className="p-4 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">2518 Prestadores — total {fmt(total)}</h2>
        <button onClick={() => setPreview(true)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
          <FileDown className="h-4 w-4" /> Gerar PDF
        </button>
      </div>
      <div className="overflow-auto border border-border rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr><th className="p-2 text-left">Código</th><th className="p-2 text-left">Credenciado</th><th className="p-2 text-left">Endereço</th><th className="p-2 text-left">Telefones</th><th className="p-2 text-right">Valor (R$)</th></tr>
          </thead>
          <tbody>
            {grupos.map((g) => [
              <tr key={g.cidade} className="bg-accent font-semibold"><td colSpan={4} className="p-2">{g.cidade} ({g.itens.length})</td><td className="p-2 text-right">{fmt(g.total)}</td></tr>,
              ...g.itens.map((p) => (
                <tr key={g.cidade + p.cd} className="border-t border-border">
                  <td className="p-2">{p.cd}</td><td className="p-2">{p.nome}</td><td className="p-2">{p.endereco}</td><td className="p-2">{p.telefones}</td><td className="p-2 text-right">{fmt(p.valor)}</td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      {preview && <PdfPreview build={buildPdf} fileName="2518_SSPMJR-Prestadores.pdf" onClose={() => setPreview(false)} />}
    </div>
  );
}
