import { useMemo, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PdfPreview from "@/components/PdfPreview";
import { simBase, vendaSugerida, type SimBase, type SimParams } from "@/data/benevixSim";

type Aba = "adesao" | "pme";
type Params = SimParams & { dfe: number[]; venda: number[] };

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const int = (v: number) => Math.round(v).toLocaleString("pt-BR");

type Row = {
  faixa: string;
  dfe: number;
  vidas: number;
  venda: number;
  net: number;
  faturamento: number;
  receitaNet: number;
  copart: number;
  bensaude: number;
  despesas: number;
  resultado: number;
  adm: number;
};

type Calc = {
  rows: Row[];
  dfeTotal: number;
  vidas: number;
  faturamento: number;
  receitaNet: number;
  copart: number;
  bensaude: number;
  despesas: number;
  resultado: number;
  adm: number;
  sin: number;
  netPercaptaAtual: number;
  despesaPercapta: number;
};

function calcular(base: SimBase, p: Params): Calc {
  const despesaPercapta = p.netPercapta * p.sinRef;
  const despesaTotal = despesaPercapta * p.vidas;

  const pre = base.faixas.map((f, i) => {
    const dfe = p.dfe[i] ?? 0;
    const venda = p.venda[i] ?? f.venda;
    const vidas = p.vidas * dfe;
    const net = venda * (1 - p.spread);
    const receitaNet = vidas * net;
    const copart = receitaNet * p.copart;
    return {
      faixa: f.faixa,
      dfe,
      vidas,
      venda,
      net,
      faturamento: vidas * venda,
      receitaNet,
      copart,
      bensaude: receitaNet + copart,
      adm: vidas * (venda - net),
    };
  });

  const somaBensaude = pre.reduce((a, r) => a + r.bensaude, 0);
  const sin = somaBensaude ? despesaTotal / somaBensaude : 0;

  const rows: Row[] = pre.map((r) => {
    const despesas = r.bensaude * sin;
    return { ...r, despesas, resultado: r.receitaNet - despesas };
  });

  const sum = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
  const vidas = sum((r) => r.vidas);
  const receitaNet = sum((r) => r.receitaNet);
  return {
    rows,
    dfeTotal: sum((r) => r.dfe),
    vidas,
    faturamento: sum((r) => r.faturamento),
    receitaNet,
    copart: sum((r) => r.copart),
    bensaude: somaBensaude,
    despesas: sum((r) => r.despesas),
    resultado: sum((r) => r.resultado),
    adm: sum((r) => r.adm),
    sin,
    netPercaptaAtual: vidas ? receitaNet / vidas : 0,
    despesaPercapta,
  };
}

const Campo = ({
  label,
  value,
  step,
  onChange,
  sufixo,
  largura = "w-24",
}: {
  label: string;
  value: number;
  step: string;
  onChange: (v: number) => void;
  sufixo?: string;
  largura?: string;
}) => (
  <label className="flex items-center gap-2 text-xs text-muted-foreground">
    {label}
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`h-8 ${largura} rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400/50`}
    />
    {sufixo && <span>{sufixo}</span>}
  </label>
);

const Bloco = ({
  titulo,
  base,
  draft,
  setDraft,
  calc,
  onCalcular,
  onRestaurar,
  sugerida,
  onRelatorio,
}: {
  onRelatorio: () => void;
  sugerida: number[];
  titulo: string;
  base: SimBase;
  draft: Params;
  setDraft: (p: Params) => void;
  calc: Calc;
  onCalcular: () => void;
  onRestaurar: () => void;
}) => {
  const [aberto, setAberto] = useState(false);
  const draftTotalDfe = draft.dfe.reduce((a, b) => a + b, 0);
  return (
    <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-4">
        <button
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? "" : "-rotate-90"}`} />
          {titulo}
        </button>
        <Campo label="Vidas" step="1" value={draft.vidas} largura="w-28" onChange={(v) => setDraft({ ...draft, vidas: v })} />
        <Campo
          label="Spread"
          step="0.01"
          sufixo="%"
          value={Number((draft.spread * 100).toFixed(2))}
          onChange={(v) => setDraft({ ...draft, spread: v / 100 })}
        />
        <Campo
          label="Copart."
          step="0.01"
          sufixo="%"
          value={Number((draft.copart * 100).toFixed(2))}
          onChange={(v) => setDraft({ ...draft, copart: v / 100 })}
        />
        <Campo
          label="Sinistralidade ref."
          step="0.01"
          sufixo="%"
          value={Number((draft.sinRef * 100).toFixed(2))}
          onChange={(v) => setDraft({ ...draft, sinRef: v / 100 })}
        />
        <Campo
          label="Net percapta ref."
          step="0.01"
          value={draft.netPercapta}
          largura="w-28"
          onChange={(v) => setDraft({ ...draft, netPercapta: v })}
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          R$ Venda
          <select
            value={draft.venda.every((v, i) => v === sugerida[i]) ? "sug" : "bnx"}
            onChange={(e) =>
              setDraft({ ...draft, venda: e.target.value === "sug" ? [...sugerida] : base.faixas.map((f) => f.venda) })
            }
            className="h-8 rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 text-sm text-foreground"
          >
            <option value="bnx">Benevix</option>
            <option value="sug">Sugerida</option>
          </select>
        </label>
        <button
          onClick={onCalcular}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
        >
          Calcular
        </button>
        <button
          onClick={onRestaurar}
          className="h-8 px-4 rounded-md border border-border text-xs font-medium text-foreground hover:bg-accent"
        >
          Restaurar
        </button>
        <button
          onClick={onRelatorio}
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
        >
          <FileText className="h-3.5 w-3.5" /> Relatório
        </button>
        <span className="text-[11px] text-muted-foreground">Campos em amarelo são editáveis</span>
      </header>

      <div className="px-4 py-2 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground border-b border-border">
        <span>Sinistralidade medida: <strong className="text-foreground">{pct(calc.sin)}</strong></span>
        <span>Net percapta: <strong className="text-foreground">{brl(calc.netPercaptaAtual)}</strong></span>
        <span>Despesa percapta: <strong className="text-foreground">{brl(calc.despesaPercapta)}</strong></span>
        <span>
          Bensaúde mensal:{" "}
          <strong className={calc.resultado < 0 ? "text-destructive" : "text-foreground"}>{brl(calc.resultado)}</strong>
        </span>
        <span>
          Administradora mensal: <strong className="text-foreground">{brl(calc.adm)}</strong>
        </span>
        {Math.abs(draftTotalDfe - 1) > 0.0005 && (
          <span className="text-destructive">Soma das proporções: {pct(draftTotalDfe)} (ideal 100%)</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground text-xs">
              <th className="px-3 py-2 text-left font-medium">Faixa</th>
              <th className="px-3 py-2 text-right font-medium">% Vidas</th>
              <th className="px-3 py-2 text-right font-medium">Vidas</th>
              <th className="px-3 py-2 text-right font-medium">R$ Venda</th>
              <th className="px-3 py-2 text-right font-medium">R$ Net</th>
              <th className="px-3 py-2 text-right font-medium">Faturamento</th>
              <th className="px-3 py-2 text-right font-medium">Receita Net</th>
              <th className="px-3 py-2 text-right font-medium">Copart.</th>
              <th className="px-3 py-2 text-right font-medium">R$ Bensaúde</th>
              <th className="px-3 py-2 text-right font-medium">Despesas</th>
              <th className="px-3 py-2 text-right font-medium">Result. Bensaúde</th>
              <th className="px-3 py-2 text-right font-medium">Result. Adm.</th>
            </tr>
          </thead>
          <tbody>
            {aberto &&
              calc.rows.map((r, i) => (
                <tr key={r.faixa} className={i % 2 ? "bg-muted/20" : ""}>
                  <td className="px-3 py-1.5 text-foreground/80">{r.faixa}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={Number(((draft.dfe[i] ?? 0) * 100).toFixed(2))}
                      onChange={(e) => {
                        const dfe = [...draft.dfe];
                        dfe[i] = Number(e.target.value) / 100;
                        setDraft({ ...draft, dfe });
                      }}
                      className="h-7 w-20 rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 text-right text-xs text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      step="1"
                      value={Math.round((draft.dfe[i] ?? 0) * draft.vidas)}
                      onChange={(e) => {
                        const abs = draft.dfe.map((d) => d * draft.vidas);
                        abs[i] = Math.max(0, Number(e.target.value));
                        const total = abs.reduce((a, b) => a + b, 0);
                        setDraft({
                          ...draft,
                          vidas: Math.round(total),
                          dfe: total ? abs.map((v) => v / total) : abs.map(() => 0),
                        });
                      }}
                      className="h-7 w-24 rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 text-right text-xs text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={draft.venda[i] ?? 0}
                      onChange={(e) => {
                        const venda = [...draft.venda];
                        venda[i] = Number(e.target.value);
                        setDraft({ ...draft, venda });
                      }}
                      className="h-7 w-24 rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 text-right text-xs text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.net)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.faturamento)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.receitaNet)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.copart)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.bensaude)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-destructive">-{brl(r.despesas)}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${r.resultado < 0 ? "text-destructive" : ""}`}>
                    {brl(r.resultado)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.adm)}</td>
                </tr>
              ))}
            <tr className="font-semibold border-t border-border bg-primary/10">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{pct(calc.dfeTotal)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{int(calc.vidas)}</td>
              <td className="px-3 py-2 text-right tabular-nums">—</td>
              <td className="px-3 py-2 text-right tabular-nums">—</td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.faturamento)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.receitaNet)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.copart)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.bensaude)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-destructive">-{brl(calc.despesas)}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${calc.resultado < 0 ? "text-destructive" : ""}`}>
                {brl(calc.resultado)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.adm)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

const padrao = (a: Aba): Params => {
  const { vidas, spread, copart, sinRef, netPercapta, faixas } = simBase[a];
  return { vidas, spread, copart, sinRef, netPercapta, dfe: faixas.map((f) => f.dfe), venda: faixas.map((f) => f.venda) };
};

const n2 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function somar(a: Calc, b: Calc): Calc {
  const vidas = a.vidas + b.vidas;
  const rows: Row[] = a.rows.map((r, i) => {
    const q = b.rows[i];
    const v = r.vidas + q.vidas;
    return {
      faixa: r.faixa,
      vidas: v,
      dfe: vidas ? v / vidas : 0,
      venda: v ? (r.faturamento + q.faturamento) / v : 0,
      net: v ? (r.receitaNet + q.receitaNet) / v : 0,
      faturamento: r.faturamento + q.faturamento,
      receitaNet: r.receitaNet + q.receitaNet,
      copart: r.copart + q.copart,
      bensaude: r.bensaude + q.bensaude,
      despesas: r.despesas + q.despesas,
      resultado: r.resultado + q.resultado,
      adm: r.adm + q.adm,
    };
  });
  const sum = (f: (r: Row) => number) => rows.reduce((x, r) => x + f(r), 0);
  const receitaNet = sum((r) => r.receitaNet);
  const bensaude = sum((r) => r.bensaude);
  const despesas = sum((r) => r.despesas);
  return {
    rows, vidas, receitaNet, bensaude, despesas,
    dfeTotal: sum((r) => r.dfe),
    faturamento: sum((r) => r.faturamento),
    copart: sum((r) => r.copart),
    resultado: sum((r) => r.resultado),
    adm: sum((r) => r.adm),
    sin: bensaude ? despesas / bensaude : 0,
    netPercaptaAtual: vidas ? receitaNet / vidas : 0,
    despesaPercapta: vidas ? despesas / vidas : 0,
  };
}

async function buildRelatorio(itens: { titulo: string; p: Params | null; c: Calc }[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  itens.forEach(({ titulo, p, c }, idx) => {
    if (idx) doc.addPage();
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold").setFontSize(16);
    doc.text(`Simulação Administradoras — ${titulo}`, 12, 16);
    doc.setFont("helvetica", "normal").setFontSize(9.5);
    if (!p) doc.text(`Vidas: ${int(c.vidas)}`, 12, 23);
    if (p) doc.text(
      `Vidas: ${int(p.vidas)}   Spread: ${pct(p.spread)}   Copart.: ${pct(p.copart)}   Sinistralidade ref.: ${pct(p.sinRef)}   Net percapta ref.: ${brl(p.netPercapta)}`,
      12, 23,
    );
    doc.text(
      `Sinistralidade medida: ${pct(c.sin)}   Net percapta: ${brl(c.netPercaptaAtual)}   Despesa percapta: ${brl(c.despesaPercapta)}`,
      12, 28.5,
    );
    autoTable(doc, {
      startY: 34,
      margin: { left: 12, right: 12 },
      tableWidth: W - 24,
      theme: "grid",
      head: [["Faixa", "% Vidas", "Vidas", "R$ Venda", "R$ Net", "Faturamento", "Receita Net", "Copart.", "R$ Bensaúde", "Despesas", "Result. Bensaúde", "Result. Adm."]],
      body: c.rows.map((r) => [r.faixa, pct(r.dfe), int(r.vidas), n2(r.venda), n2(r.net), n2(r.faturamento), n2(r.receitaNet), n2(r.copart), n2(r.bensaude), `-${n2(r.despesas)}`, n2(r.resultado), n2(r.adm)]),
      foot: [["Total", pct(c.dfeTotal), int(c.vidas), "—", "—", n2(c.faturamento), n2(c.receitaNet), n2(c.copart), n2(c.bensaude), `-${n2(c.despesas)}`, n2(c.resultado), n2(c.adm)]],
      styles: { font: "helvetica", fontSize: 9.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.25, cellPadding: 2, halign: "right" },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", lineWidth: 0.4 },
      footStyles: { fillColor: [225, 225, 225], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.4 },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    });
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(
      `Bensaúde: mensal ${brl(c.resultado)} | anual ${brl(c.resultado * 12)}      Administradora: mensal ${brl(c.adm)} | anual ${brl(c.adm * 12)}`,
      12, ((doc as any).lastAutoTable.finalY as number) + 8,
    );
  });
  const n = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(0, 0, 0);
    doc.text(`${i}/${n}`, W - 12, H - 8, { align: "right" });
  }
  return doc;
}

const AdministradorasSim = () => {
  const [pdf, setPdf] = useState(false);
  const [draft, setDraft] = useState<Record<Aba, Params>>({ adesao: padrao("adesao"), pme: padrao("pme") });
  const [aplicado, setAplicado] = useState<Record<Aba, Params>>({
    adesao: padrao("adesao"),
    pme: padrao("pme"),
  });

  const calcAdesao = useMemo(() => calcular(simBase.adesao, aplicado.adesao), [aplicado.adesao]);
  const calcPme = useMemo(() => calcular(simBase.pme, aplicado.pme), [aplicado.pme]);

  const vidas = calcAdesao.vidas + calcPme.vidas;
  const mensal = calcAdesao.resultado + calcPme.resultado;
  const mensalAdm = calcAdesao.adm + calcPme.adm;

  const cards = [
    { t: "Vidas", v: int(vidas) },
    { t: "Bensaúde — mensal", v: brl(mensal), neg: mensal < 0 },
    { t: "Bensaúde — anual", v: brl(mensal * 12), neg: mensal < 0 },
    { t: "Administradora — mensal", v: brl(mensalAdm), neg: mensalAdm < 0 },
    { t: "Administradora — anual", v: brl(mensalAdm * 12), neg: mensalAdm < 0 },
  ];

  return (
    <div className="h-full overflow-auto pr-1 space-y-5">
      {pdf && (
        <PdfPreview
          fileName="Administradoras.pdf"
          onClose={() => setPdf(false)}
          build={() =>
            buildRelatorio([
              { titulo: "Adesão", p: aplicado.adesao, c: calcAdesao },
              { titulo: "PME", p: aplicado.pme, c: calcPme },
              { titulo: "Geral", p: null, c: somar(calcAdesao, calcPme) },
            ])
          }
        />
      )}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.t} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground">{c.t}</p>
            <p className={`text-xl font-semibold tabular-nums ${c.neg ? "text-destructive" : "text-foreground"}`}>{c.v}</p>
          </div>
        ))}
      </div>

      {(["adesao", "pme"] as Aba[]).map((a) => (
        <Bloco
          key={a}
          titulo={a === "adesao" ? "Adesão" : "PME"}
          base={simBase[a]}
          sugerida={vendaSugerida[a]}
          onRelatorio={() => setPdf(true)}
          draft={draft[a]}
          setDraft={(p) => setDraft((prev) => ({ ...prev, [a]: p }))}
          calc={a === "adesao" ? calcAdesao : calcPme}
          onCalcular={() => setAplicado((prev) => ({ ...prev, [a]: { ...draft[a], dfe: [...draft[a].dfe], venda: [...draft[a].venda] } }))}
          onRestaurar={() => {
            setDraft((prev) => ({ ...prev, [a]: padrao(a) }));
            setAplicado((prev) => ({ ...prev, [a]: padrao(a) }));
          }}
        />
      ))}
    </div>
  );
};

export default AdministradorasSim;
