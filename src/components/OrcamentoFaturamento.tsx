import { useEffect, useState } from "react";
import { RotateCcw, ChevronLeft, ChevronDown, ChevronRight } from "lucide-react";

const parseBR = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

const NumInput = ({ value, dec, className, onChange }: { value: number; dec: number; className: string; onChange: (v: number) => void }) => {
  const [edit, setEdit] = useState<string | null>(null);
  const shown = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(value);
  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={edit ?? shown}
      onFocus={() => setEdit(shown)}
      onChange={(e) => { setEdit(e.target.value); onChange(parseBR(e.target.value)); }}
      onBlur={() => setEdit(null)}
    />
  );
};

type Linha = { id: string; vidas: number; ticket: number; entradas: number; saidas: number };
type Campo = "vidas" | "ticket" | "entradas" | "saidas";
const BASE: Linha[] = [
  { id: "PIF", vidas: 36025, ticket: 595.89, entradas: 50, saidas: 450 },
  { id: "PCA", vidas: 25351, ticket: 323.27, entradas: 1000, saidas: 50 },
  { id: "PCE", vidas: 9881, ticket: 277.68, entradas: 500, saidas: 50 },
];

const n0 = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);
const n2 = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const ABAS = ["Faturamento", "Coparticipação", "Despesas Assistenciais", "Demais Operacionais", "Despesas Administrativas", "Financeiro", "DRE"];

const usePersist = <T,>(k: string, d: T) => {
  const [v, setV] = useState<T>(() => { try { const x = localStorage.getItem("orc27:" + k); return x ? JSON.parse(x) : d; } catch { return d; } });
  useEffect(() => { localStorage.setItem("orc27:" + k, JSON.stringify(v)); }, [k, v]);
  return [v, setV] as const;
};

const OrcamentoFaturamento = ({ home = false, onSimulacao, onPainel }: { home?: boolean; onSimulacao?: () => void; onPainel?: () => void }) => {
  const [rows, setRows] = usePersist("rows", BASE);
  const [aba, setAba] = useState(() => { const x = sessionStorage.getItem("orc27:aba"); sessionStorage.removeItem("orc27:aba"); return x || "Faturamento"; });
  const [reaj, setReaj] = usePersist("reaj", 1.01);
  const [rec, setRec] = usePersist("rec", 16);
  const [sinLiq, setSinLiq] = usePersist("sinLiq", 87);
  const [rede, setRede] = usePersist("rede", 55);
  const [demaisOp, setDemaisOp] = usePersist("demaisOp", [2, 1, 0.5, 0.2]);
  const [admPc, setAdmPc] = usePersist("admPc", [4, 2, 0.8, 1.2]);
  const [admTot, setAdmTot] = usePersist("admTot", 8);
  const [finPc, setFinPc] = usePersist("finPc", 4);
  const [planosAbertos, setPlanosAbertos] = useState(false);
  const [dreAbertos, setDreAbertos] = useState<Record<string, boolean>>({});
  const tk = (r: Linha, k: number) => r.ticket * Math.pow(1 + reaj / 100, k - 1);
  const set = (i: number, k: Campo, v: number) =>
    setRows((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const mensal26 = (r: Linha) => r.vidas * r.ticket;
  const cresc = (r: Linha) => (r.entradas - r.saidas) * 12;
  const vidas27 = (r: Linha) => r.vidas + cresc(r);
  // média de jan/27 a dez/27 (vidas crescem mês a mês)
  const mensal27 = (r: Linha) => { let t = 0; for (let k = 1; k <= 12; k++) t += (r.vidas + k * (r.entradas - r.saidas)) * tk(r, k); return t / 12; };
  const sum = (f: (r: Linha) => number) => rows.reduce((s, r) => s + f(r), 0);

  const tV26 = sum((r) => r.vidas), tM26 = sum(mensal26);
  const tV27 = sum(vidas27), tM27 = sum(mensal27);

  if (home) {
    const fM = Array.from({ length: 12 }, (_, k) => sum((r) => (r.vidas + (k + 1) * (r.entradas - r.saidas)) * tk(r, k + 1)));
    const pcOp = demaisOp.reduce((a, b) => a + b, 0);
    let fat = 0, prim = 0, sec = 0, adm = 0, fin = 0, rai = 0, imp = 0;
    fM.forEach((f) => {
      const ent = f * (1 + rec / 100), p = ent - ent * sinLiq / 100, s = -f * pcOp / 100, a = f * admTot / 100, fi = f * finPc / 100;
      const r = p + s - a + fi;
      fat += f; prim += p; sec += s; adm += a; fin += fi; rai += r; imp += r > 0 ? r * 0.34 : 0;
    });
    const tot = prim + sec, ebitda = tot - adm, liq = rai - imp;
    const mi = (v: number) => `R$ ${n2(v)}`;
    const pf = (v: number) => (fat ? `${n2((v / fat) * 100)}%` : "-");
    const cards: [string, number, string][] = [
      ["Operacionais Primários", prim, "Entradas Operacionais − Despesas Assistenciais"],
      ["Operacionais Secundários", sec, "− Demais Operacionais"],
      ["Operacionais Totais", tot, "Primários + Secundários"],
      ["EBITDA", ebitda, "Operacionais Totais − Despesas Administrativas"],
      ["Financeiro", fin, "Faturamento × % Financeiro"],
      ["Resultado antes dos Impostos", rai, "EBITDA + Financeiro"],
      ["Impostos Federais", -imp, "34% do resultado mensal, quando positivo"],
    ];
    return (
      <div className="flex flex-col gap-3 h-[calc(100vh-9rem)] min-h-[560px]">
        <div className="rounded-xl bg-primary text-primary-foreground shadow-md px-4 py-1.5 flex flex-wrap items-center justify-between gap-4" title="Antes dos Impostos − Impostos Federais">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Resultado Líquido 2027</div>
            <div className="text-xl font-bold tabular-nums leading-tight">{mi(liq)}</div>
          </div>
          <div className="text-right text-xs leading-tight">
            <div><span className="opacity-80">Margem líquida </span><span className="text-base font-semibold tabular-nums">{pf(liq)}</span></div>
            <div className="opacity-80">Faturamento {mi(fat)}</div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {cards.map(([t, v, h]) => (
            <div key={t} title={h} className="rounded-xl border border-border bg-card overflow-hidden cursor-help hover:shadow-md transition-shadow">
              <div className={`h-1 ${v < 0 ? "bg-destructive" : "bg-primary"}`} />
              <div className="px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight min-h-[1.6rem]">{t}</div>
                <div className={`text-base font-bold tabular-nums ${v < 0 ? "text-destructive" : "text-foreground"}`}>{mi(v)}</div>
                <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${v < 0 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, fat ? Math.abs(v / fat) * 100 : 0)}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground">{pf(v)} do faturamento</div>
              </div>
            </div>
          ))}
        </div>
        {(() => {
          const entT = fat * (1 + rec / 100), despT = entT * sinLiq / 100;
          const linhas: [string, number, 0 | 1 | 2][] = [
            ["Entradas Operacionais", entT, 0],
            ["(−) Despesas Assistenciais", -despT, 0],
            ["(−) Demais Operacionais", sec, 0],
            ["(=) Operacionais Totais", tot, 1],
            ["(−) Despesas Administrativas", -adm, 0],
            ["(=) EBITDA", ebitda, 1],
            ["(+) Financeiro", fin, 0],
            ["(=) Resultado antes dos Impostos", rai, 1],
            ["(−) Impostos Federais", -imp, 0],
            ["(=) Resultado Líquido", liq, 2],
          ];
          return (
            <section className="rounded-2xl border border-border bg-card shadow-sm px-3 py-2 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-foreground">DRE simplificado 2027</h3>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">R$ · % fat.</span>
              </div>
              <div className="flex-1 flex flex-col justify-between gap-0.5">
                {linhas.map(([t, v, k]) => (
                  <div key={t} className={`flex items-center justify-between rounded-md px-3 py-1 text-sm ${k === 2 ? "bg-primary text-primary-foreground font-bold" : k === 1 ? "bg-primary/10 font-semibold text-foreground" : "text-foreground"}`}>
                    <span>{t}</span>
                    <span className="flex gap-6 tabular-nums">
                      <span className={k !== 2 && v < 0 ? "text-destructive" : ""}>{n2(v)}</span>
                      <span className={`w-16 text-right ${k === 2 ? "" : "text-muted-foreground"}`}>{pf(v)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}
        {onSimulacao && (
          <div className="mt-auto flex flex-wrap justify-start gap-2 border-t border-border pt-3">
            <button className="rounded-md border px-3 py-1.5 text-sm bg-primary text-primary-foreground border-primary">Painel</button>
            {ABAS.map((a) => (
              <button key={a} onClick={() => { sessionStorage.setItem("orc27:aba", a); onSimulacao(); }} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">{a}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const inp = "w-24 rounded border border-border px-2 py-1 text-right tabular-nums font-semibold bg-yellow-100/60";
  const td = "px-2 py-0.5 text-right tabular-nums whitespace-nowrap";
  const tot = (v: string) => <span className="inline-block w-24 px-2 text-right">{v}</span>;

  const MESES = ["2026", ...["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"].map((m) => `${m}/27`)];
  const mesVal = (r: Linha, k: number) => (r.vidas + k * (r.entradas - r.saidas)) * (k === 0 ? r.ticket : tk(r, k));
  const totLinha = (r: Linha) => MESES.slice(1).reduce((s, _, j) => s + mesVal(r, j + 1), 0);

  return (
    <div className="flex flex-col gap-3 min-h-[calc(100vh-9rem)]">
    {<div className="order-last mt-auto flex flex-wrap justify-start gap-2 border-t border-border pt-3">
      {onPainel && <button onClick={onPainel} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Painel</button>}
      {ABAS.map((a) => (
        <button
          key={a}
          onClick={() => setAba(a)}
          className={`rounded-md border px-3 py-1.5 text-sm ${aba === a ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
        >
          {a}
        </button>
      ))}
    </div>}
    {aba !== "DRE" && (<section className="bg-card rounded-xl border border-border shadow-sm p-2 space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold cursor-help" title="Mensal 2026 = Vidas × Ticket; Anual = Mensal × 12. Mensal 2027 = média mensal de jan/27 a dez/27; Anual 2027 = Total 2027. Crescimento = (Entradas − Saídas) × 12. Vidas 2027 = Vidas 2026 + Crescimento. Ticket 2027 = Ticket 2026. Ticket total = Mensal total ÷ Vidas totais.">Orçamento — Faturamento 2026 × 2027</h3>
        <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Reajuste mensal (%)</label>
        <NumInput dec={2} className="w-20 rounded border border-border px-2 py-0 h-6 text-right tabular-nums font-semibold bg-yellow-100/60" value={reaj} onChange={setReaj} />
        <button
          onClick={() => { setRows(BASE); setReaj(1.01); }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-0 text-sm hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" /> Restaurar
        </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th />
              <th colSpan={4} className="text-center px-2 py-0 border-l border-border">2026</th>
              <th colSpan={7} className="text-center px-2 py-0 border-l border-border">2027</th>
            </tr>
            <tr>
              <th className="text-left px-2 py-0.5">Planos</th>
              <th className="text-center px-2 py-0.5 border-l border-border">Vidas</th>
              <th className="text-center px-2 py-0.5">Ticket Méd.</th>
              <th className="text-right px-2 py-0.5">Mensal</th>
              <th className="text-right px-2 py-0.5">Anual</th>
              <th className="text-center px-2 py-0.5 border-l border-border">Entradas</th>
              <th className="text-center px-2 py-0.5">Saídas</th>
              <th className="text-right px-2 py-0.5">Crescimento</th>
              <th className="text-right px-2 py-0.5">Vidas</th>
              <th className="text-right px-2 py-0.5">Ticket Méd.</th>
              <th className="text-right px-2 py-0.5">Mensal</th>
              <th className="text-right px-2 py-0.5">Anual</th>
            </tr>
          </thead>
          <tbody>
            {(aba === "Faturamento" || planosAbertos) && rows.map((r, i) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-0 font-medium">{r.id}</td>
                <td className="px-2 py-0 text-center border-l border-border"><NumInput dec={0} className={inp} value={r.vidas} onChange={(v) => set(i, "vidas", v)} /></td>
                <td className="px-2 py-0 text-center"><NumInput dec={2} className={inp} value={r.ticket} onChange={(v) => set(i, "ticket", v)} /></td>
                <td className={td}>{n2(mensal26(r))}</td>
                <td className={td}>{n2(mensal26(r) * 12)}</td>
                <td className="px-2 py-0 text-center border-l border-border"><NumInput dec={0} className={inp} value={r.entradas} onChange={(v) => set(i, "entradas", v)} /></td>
                <td className="px-2 py-0 text-center"><NumInput dec={0} className={inp} value={r.saidas} onChange={(v) => set(i, "saidas", v)} /></td>
                <td className={td}>{n0(cresc(r))}</td>
                <td className={td}>{n0(vidas27(r))}</td>
                <td className={td}>{n2(r.ticket)}</td>
                <td className={td}>{n2(mensal27(r))}</td>
                <td className={td}>{n2(mensal27(r) * 12)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-muted/60 font-semibold">
              <td className="px-2 py-0.5">{aba === "Faturamento" ? "FATURAMENTO" : (
                <button onClick={() => setPlanosAbertos((v) => !v)} className="inline-flex items-center gap-1 hover:text-primary">
                  {planosAbertos ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}FATURAMENTO
                </button>
              )}</td>
              <td className="px-2 py-0.5 text-center tabular-nums border-l border-border">{tot(n0(tV26))}</td>
              <td className="px-2 py-0.5 text-center tabular-nums">{tot(n2(tV26 ? tM26 / tV26 : 0))}</td>
              <td className={td}>{n2(tM26)}</td>
              <td className={td}>{n2(tM26 * 12)}</td>
              <td className="px-2 py-0.5 text-center tabular-nums border-l border-border">{tot(n0(sum((r) => r.entradas)))}</td>
              <td className="px-2 py-0.5 text-center tabular-nums">{tot(n0(sum((r) => r.saidas)))}</td>
              <td className={td}>{n0(sum(cresc))}</td>
              <td className={td}>{n0(tV27)}</td>
              <td className={td}>{n2(tV27 ? tM27 / tV27 : 0)}</td>
              <td className={td}>{n2(tM27)}</td>
              <td className={td}>{n2(tM27 * 12)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>)}
    {aba === "Coparticipação" ? (() => {
      const M = MESES.slice(1);
      const fat = M.map((_, k) => sum((r) => mesVal(r, k + 1)));
      const cop = fat.map((v) => v * rec / 100);
      const tF = fat.reduce((a, b) => a + b, 0), tC = tF * rec / 100;
      const linha = (nome: string, vs: number[], t: number, bold = false) => (
        <tr className={`border-t border-border ${bold ? "bg-muted/60 font-semibold" : ""}`}>
          <td className="px-2 py-0.5 font-medium">{nome}</td>
          {vs.map((v, k) => <td key={k} className={td}>{n2(v)}</td>)}
          <td className={`${td} border-l border-border font-semibold`}>{n2(t)}</td>
        </tr>
      );
      return (
        <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold cursor-help" title="Coparticipação = Faturamento × % Recuperação. Total = Faturamento + Coparticipação.">Coparticipação — jan/27 a dez/27</h3>
            <label className="ml-4 text-sm text-muted-foreground">% Recuperação</label>
            <NumInput dec={2} className="w-20 rounded border border-border px-2 py-0 h-6 text-right tabular-nums font-semibold bg-yellow-100/60" value={rec} onChange={setRec} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-y-px">
              <thead className="text-[11px] uppercase tracking-wider text-foreground/80">
                <tr>
                  <th className="sticky left-0 bg-card" />
                  {M.map((m) => <th key={m} className="text-right px-2 py-0.5 font-medium whitespace-nowrap">{m}</th>)}
                  <th className="text-right px-3 py-0.5 font-semibold text-foreground">Total 2027</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:border-y [&>tr>td]:border-border/50 [&>tr>td:first-child]:border-l [&>tr>td:last-child]:border-r [&>tr>td:first-child]:rounded-l-lg [&>tr>td:last-child]:rounded-r-lg">
                {linha("FATURAMENTO", fat, tF)}
                {linha("COPARTICIPAÇÃO", cop, tC)}
                {linha("ENTRADAS OPERACIONAIS", fat.map((v, k) => v + cop[k]), tF + tC, true)}
              </tbody>
            </table>
          </div>
        </section>
      );
    })() : aba === "Despesas Assistenciais" ? (() => {
      const M = MESES.slice(1);
      const fatM = M.map((_, k) => sum((r) => mesVal(r, k + 1)));
      const ent = fatM.map((v) => v * (1 + rec / 100));
      const desp = ent.map((v) => v * sinLiq / 100);
      const rd = desp.map((v) => v * rede / 100);
      const bn = desp.map((v, k) => v - rd[k]);
      const t = (vs: number[]) => vs.reduce((a, b) => a + b, 0);
      const linha = (nome: string, vs: number[], bold = false, sep = false) => (
        <tr className={`${sep ? "border-t-2" : "border-t"} border-border ${bold ? "bg-muted/60 font-semibold" : ""}`}>
          <td className="px-2 py-0.5 font-medium whitespace-nowrap">{nome}</td>
          {vs.map((v, k) => <td key={k} className={td}>{n2(v)}</td>)}
          <td className={`${td} border-l border-border font-semibold`}>{n2(t(vs))}</td>
        </tr>
      );
      const campo = "w-20 rounded border border-border px-2 py-0 h-6 text-right tabular-nums font-semibold bg-yellow-100/60";
      return (
        <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold cursor-help" title="Despesas Assistenciais = Entradas Operacionais × % Sinistralidade Líq. Rede = Despesas × % Rede. Benê = Despesas − Rede.">Despesas Assistenciais — jan/27 a dez/27</h3>
            <label className="ml-4 text-sm text-muted-foreground">% Sinistralidade Líq.</label>
            <NumInput dec={2} className={campo} value={sinLiq} onChange={setSinLiq} />
            <label className="ml-4 text-sm text-muted-foreground">% Rede</label>
            <NumInput dec={2} className={campo} value={rede} onChange={setRede} />
            <span className="ml-auto rounded-md border border-border bg-muted/60 px-2 py-0.5 text-sm cursor-help" title="Total das Despesas Assistenciais ÷ Total do Faturamento">Sinistralidade Bruta: <b className="tabular-nums">{t(fatM) ? `${n2((t(desp) / t(fatM)) * 100)}%` : "-"}</b></span>
            <button onClick={() => { setSinLiq(87); setRede(55); }} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-sm border border-border bg-card hover:bg-accent transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-y-0.5">
              <thead className="text-[11px] uppercase tracking-wider text-foreground/80">
                <tr>
                  <th className="sticky left-0 bg-card" />
                  {M.map((m) => <th key={m} className="text-right px-2 py-1.5 font-medium whitespace-nowrap">{m}</th>)}
                  <th className="text-right px-3 py-0.5 font-semibold text-foreground">Total 2027</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:border-y [&>tr>td]:border-border/50 [&>tr>td:first-child]:border-l [&>tr>td:last-child]:border-r [&>tr>td:first-child]:rounded-l-lg [&>tr>td:last-child]:rounded-r-lg">
                {linha("FATURAMENTO", fatM)}
                {linha("COPARTICIPAÇÃO", fatM.map((v) => v * rec / 100))}
                {linha("ENTRADAS OPERACIONAIS", ent, true)}
                {linha("REDE", rd, false, true)}
                {linha("BENÊ", bn)}
                {linha("DESPESAS ASSISTENCIAIS", desp, true)}
              </tbody>
            </table>
          </div>
        </section>
      );
    })() : aba === "DRE" ? (() => {
      const M = MESES.slice(1);
      const fatM = M.map((_, k) => sum((r) => mesVal(r, k + 1)));
      const cop = fatM.map((v) => v * rec / 100);
      const ent = fatM.map((v, k) => v + cop[k]);
      const desp = ent.map((v) => v * sinLiq / 100);
      const pcOp = demaisOp.reduce((a, b) => a + b, 0);
      const dOp = fatM.map((v) => v * pcOp / 100);
      const adm = fatM.map((v) => v * admTot / 100);
      const fin = fatM.map((v) => v * finPc / 100);
      const res = ent.map((v, k) => v - desp[k] - dOp[k] - adm[k] + fin[k]);
      const t = (vs: number[]) => vs.reduce((a, b) => a + b, 0);
      const cls = (v: number) => (v < 0 ? "text-destructive" : "");
      const rd = desp.map((v) => v * rede / 100);
      const bn = desp.map((v, k) => v - rd[k]);
      const admDemais = admTot - admPc[0] - admPc[1] - admPc[2];
      const filhos: Record<string, [string, number[]][]> = {
        ENT: [["FATURAMENTO", fatM], ["COPARTICIPAÇÃO", cop]],
        DESP: [["REDE", rd], ["BENÊ", bn]],
        OP: ["COMERCIALIZAÇÃO", "IMPOSTOS DIRETOS", "PROVISÕES", "SECUNDÁRIAS"].map((n, i) => [n, fatM.map((v) => v * demaisOp[i] / 100)] as [string, number[]]),
        ADM: (["PESSOAL", "INFORMÁTICA", "MARKETING", "DEMAIS"] as const).map((n, i) => [n, fatM.map((v) => v * (i === 3 ? admDemais : admPc[i]) / 100)] as [string, number[]]),
      };
      const row = (nome: string, vs: number[], cl: string, key?: string, filho = false) => (
        <tr key={nome + (filho ? "-f" : "")} className={`group transition-colors hover:bg-muted/80 ${cl}`}>
          <td className={`sticky left-0 z-10 bg-inherit px-3 py-0 leading-tight whitespace-nowrap ${filho ? "pl-10 text-xs text-foreground/80" : "font-semibold tracking-wide"}`}>
            {key ? (
              <button onClick={() => setDreAbertos((p) => ({ ...p, [key]: !p[key] }))} className="inline-flex items-center gap-1.5 hover:text-primary">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/10 text-primary">{dreAbertos[key] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>{nome}
              </button>
            ) : <span className={filho ? "" : "pl-6"}>{nome}</span>}
          </td>
          {vs.map((v, k) => <td key={k} className={`px-2 py-0 leading-tight text-right tabular-nums whitespace-nowrap ${filho ? "text-xs text-foreground/80" : ""} ${cls(v)}`}>{n2(v)}</td>)}
          <td className={`px-3 py-0 leading-tight text-right tabular-nums whitespace-nowrap font-semibold bg-muted ${cls(t(vs))}`}>{n2(t(vs))}</td>
        </tr>
      );
      const grupo = (nome: string, vs: number[], key: string, cl = "") => [
        row(nome, vs, cl, key),
        ...(dreAbertos[key] ? filhos[key].map(([n, v]) => row(n, v, "bg-muted/30", undefined, true)) : []),
      ];
      const tF = t(fatM);
      const imp = res.map((v) => (v > 0 ? v * 0.34 : 0));
      const resLiq = res.map((v, k) => v - imp[k]);
      const SUB = "bg-muted/60 [&>td:first-child]:shadow-[inset_3px_0_0_hsl(var(--primary))]";
      return (
        <section className="bg-card rounded-xl border border-border shadow-sm px-3 py-2 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold cursor-help" title="Resultado antes dos impostos = Entradas Operacionais − Despesas Assistenciais − Demais Operacionais − Despesas Administrativas + Financeiro. Impostos Federais = 34% do resultado antes dos impostos, quando positivo (senão 0). Resultado Líquido = antes dos impostos − Impostos Federais.">DRE — jan/27 a dez/27</h3>
            <span className="ml-auto rounded-md border border-border bg-muted/60 px-2 py-0.5 text-sm cursor-help" title="Resultado Total ÷ Faturamento Total">Margem: <b className="tabular-nums">{tF ? `${n2((t(resLiq) / tF) * 100)}%` : "-"}</b></span>

          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-y-0.5">
              <thead className="text-[11px] uppercase tracking-wider text-foreground/80">
                <tr>
                  <th className="sticky left-0 bg-card" />
                  {M.map((m) => <th key={m} className="text-right px-2 py-1.5 font-medium whitespace-nowrap">{m}</th>)}
                  <th className="text-right px-3 py-0.5 font-semibold text-foreground">Total 2027</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:border-y [&>tr>td]:border-border/50 [&>tr>td:first-child]:border-l [&>tr>td:last-child]:border-r [&>tr>td:first-child]:rounded-l-lg [&>tr>td:last-child]:rounded-r-lg">
                {grupo("ENTRADAS OPERACIONAIS", ent, "ENT", SUB)}
                {grupo("DESPESAS ASSISTENCIAIS", desp, "DESP", SUB)}
                {grupo("DEMAIS OPERACIONAIS", dOp, "OP", SUB)}
                {grupo("DESPESAS ADMINISTRATIVAS", adm, "ADM", SUB)}
                {row("FINANCEIRO", fin, SUB)}
                {row("RESULTADO ANTES DOS IMPOSTOS", res, "bg-primary/10 [&>td:first-child]:shadow-[inset_3px_0_0_hsl(var(--primary))]")}
                {row("IMPOSTOS FEDERAIS", imp, "bg-muted/60")}
                {row("RESULTADO LÍQUIDO", resLiq, "bg-primary text-primary-foreground font-bold [&_td]:font-bold [&_td]:bg-primary hover:bg-primary [&_.text-destructive]:text-primary-foreground")}
              </tbody>
            </table>
          </div>
        </section>
      );
    })() : aba === "Financeiro" ? (() => {
      const M = MESES.slice(1);
      const fatM = M.map((_, k) => sum((r) => mesVal(r, k + 1)));
      const fin = fatM.map((v) => v * finPc / 100);
      const t = (vs: number[]) => vs.reduce((a, b) => a + b, 0);
      const cls = (v: number) => (v < 0 ? "text-destructive" : "");
      const campo = "w-20 rounded border border-border px-2 py-0 h-6 text-right tabular-nums font-semibold bg-yellow-100/60";
      return (
        <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold cursor-help" title="Financeiro = Faturamento do mês × % Financeiro.">Financeiro — jan/27 a dez/27</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th />
                  <th className="text-right px-2 py-2">%</th>
                  {M.map((m) => <th key={m} className="text-right px-2 py-2 whitespace-nowrap">{m}</th>)}
                  <th className="text-right px-2 py-2 border-l border-border">Total 2027</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-2 py-0.5 font-medium">FATURAMENTO</td>
                  <td />
                  {fatM.map((v, k) => <td key={k} className={td}>{n2(v)}</td>)}
                  <td className={`${td} border-l border-border font-semibold`}>{n2(t(fatM))}</td>
                </tr>
                <tr className="border-t-2 border-border bg-muted/60 font-semibold">
                  <td className="px-2 py-0.5">FINANCEIRO</td>
                  <td className="px-2 py-0 text-right"><NumInput dec={2} className={campo} value={finPc} onChange={setFinPc} /></td>
                  {fin.map((v, k) => <td key={k} className={`${td} ${cls(v)}`}>{n2(v)}</td>)}
                  <td className={`${td} border-l border-border ${cls(t(fin))}`}>{n2(t(fin))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      );
    })() : (aba === "Demais Operacionais" || aba === "Despesas Administrativas") ? (() => {
      const M = MESES.slice(1);
      const isAdm = aba === "Despesas Administrativas";
      const NOMES = isAdm ? ["PESSOAL", "INFORMÁTICA", "MARKETING", "DEMAIS"] : ["COMERCIALIZAÇÃO", "IMPOSTOS DIRETOS", "PROVISÕES", "SECUNDÁRIAS"];
      const demais = isAdm ? [admPc[0], admPc[1], admPc[2], admTot - admPc[0] - admPc[1] - admPc[2]] : demaisOp;
      const setDemais = isAdm ? setAdmPc : setDemaisOp;
      const TOTNOME = isAdm ? "DESPESAS ADMINISTRATIVAS" : "DEMAIS OPERACIONAIS";
      const fatM = M.map((_, k) => sum((r) => mesVal(r, k + 1)));
      const linhas = demais.map((pc) => fatM.map((v) => v * pc / 100));
      const totM = M.map((_, k) => linhas.reduce((a, l) => a + l[k], 0));
      const vert = demais.reduce((a, b) => a + b, 0);
      const t = (vs: number[]) => vs.reduce((a, b) => a + b, 0);
      const cls = (v: number) => (v < 0 ? "text-destructive" : "");
      const campo = "w-20 rounded border border-border px-2 py-0 h-6 text-right tabular-nums font-semibold bg-yellow-100/60";
      return (
        <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold cursor-help" title="Cada linha = Faturamento do mês × % da linha. Total = soma das linhas. Vertical = soma dos %.">{aba} — jan/27 a dez/27</h3>
            <span className="ml-auto rounded-md border border-border bg-muted/60 px-2 py-0.5 text-sm">Vertical: <b className="tabular-nums">{n2(vert)}%</b></span>
            <button onClick={() => { if (isAdm) { setAdmPc([4, 2, 0.8, 1.2]); setAdmTot(8); } else setDemaisOp([2, 1, 0.5, 0.2]); }} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-sm border border-border bg-card hover:bg-accent transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th />
                  <th className="text-right px-2 py-2">%</th>
                  {M.map((m) => <th key={m} className="text-right px-2 py-2 whitespace-nowrap">{m}</th>)}
                  <th className="text-right px-2 py-2 border-l border-border">Total 2027</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-2 py-0.5 font-medium">FATURAMENTO</td>
                  <td />
                  {fatM.map((v, k) => <td key={k} className={td}>{n2(v)}</td>)}
                  <td className={`${td} border-l border-border font-semibold`}>{n2(t(fatM))}</td>
                </tr>
                {linhas.map((l, i) => (
                  <tr key={i} className={`${i === 0 ? "border-t-2" : "border-t"} border-border`}>
                    <td className="px-2 py-0.5 font-medium whitespace-nowrap">{NOMES[i]}</td>
                    <td className="px-2 py-0 text-right">{isAdm && i === 3 ? <span className="inline-block w-20 px-2 text-right tabular-nums">{n2(demais[i])}</span> : <NumInput dec={2} className={campo} value={demais[i]} onChange={(v) => setDemais((p) => p.map((x, j) => (j === i ? v : x)))} />}</td>
                    {l.map((v, k) => <td key={k} className={`${td} ${cls(v)}`}>{n2(v)}</td>)}
                    <td className={`${td} border-l border-border font-semibold ${cls(t(l))}`}>{n2(t(l))}</td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-muted/60 font-semibold">
                  <td className="px-2 py-0.5 whitespace-nowrap">{TOTNOME}</td>
                  <td className="px-2 py-0 text-right tabular-nums">{isAdm ? <NumInput dec={2} className={campo} value={admTot} onChange={setAdmTot} /> : `${n2(vert)}%`}</td>
                  {totM.map((v, k) => <td key={k} className={`${td} ${cls(v)}`}>{n2(v)}</td>)}
                  <td className={`${td} border-l border-border ${cls(t(totM))}`}>{n2(t(totM))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      );
    })() : aba !== "Faturamento" ? (
      <section className="bg-card rounded-xl border border-dashed border-border shadow-sm p-8 text-center space-y-1">
        <h3 className="text-sm font-semibold">{aba}</h3>
        <p className="text-sm text-muted-foreground">Quadro ilustrativo — conteúdo em construção.</p>
      </section>
    ) : (
    <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold cursor-help" title="A cada mês, Vidas = mês anterior + Entradas − Saídas; valor = Vidas × Ticket. Total 2027 = soma de jan/27 a dez/27.">Faturamento mensal — jan/27 a dez/27</h3>
        <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-sm">Crescimento: <b className="tabular-nums">{tM26 ? `${Math.round((tM27 / tM26 - 1) * 100)}%` : "-"}</b></span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-2 py-2">Planos</th>
              {MESES.slice(1).map((m) => <th key={m} className="text-right px-2 py-2 whitespace-nowrap">{m}</th>)}
              <th className="text-right px-2 py-2 border-l border-border">Total 2027</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-1.5 font-medium">{r.id}</td>
                {MESES.slice(1).map((m, k) => <td key={m} className={td}>{n2(mesVal(r, k + 1))}</td>)}
                <td className={`${td} border-l border-border font-semibold`}>{n2(totLinha(r))}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-muted/60 font-semibold">
              <td className="px-2 py-2">FATURAMENTO</td>
              {MESES.slice(1).map((m, k) => <td key={m} className={td}>{n2(sum((r) => mesVal(r, k + 1)))}</td>)}
              <td className={`${td} border-l border-border`}>{n2(sum(totLinha))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    )}
    {(() => {
      const fM = Array.from({ length: 12 }, (_, k) => sum((r) => (r.vidas + (k + 1) * (r.entradas - r.saidas)) * tk(r, k + 1)));
      const pcOp = demaisOp.reduce((a, b) => a + b, 0);
      let prim = 0, sec = 0, adm = 0, fin = 0, rai = 0, imp = 0;
      const fT = fM.reduce((a, b) => a + b, 0);
      fM.forEach((f) => {
        const ent = f * (1 + rec / 100), p = ent - ent * sinLiq / 100, s = -f * pcOp / 100, a = f * admTot / 100, fi = f * finPc / 100;
        const r = p + s - a + fi;
        prim += p; sec += s; adm += a; fin += fi; rai += r; imp += r > 0 ? r * 0.34 : 0;
      });
      const tot = prim + sec, ebitda = tot - adm;
      const cards: [string, number, string][] = [
        ["Operacionais Primários", prim, "Entradas Operacionais − Despesas Assistenciais"],
        ["Operacionais Secundários", sec, "− Demais Operacionais"],
        ["Operacionais Totais", tot, "Primários + Secundários"],
        ["EBITDA", ebitda, "Operacionais Totais − Despesas Administrativas"],
        ["Financeiro", fin, "Faturamento × % Financeiro"],
        ["Resultado antes dos Impostos", rai, "EBITDA + Financeiro"],
        ["Impostos Federais", -imp, "34% do resultado mensal, quando positivo"],
        ["Resultado Líquido", rai - imp, "Antes dos Impostos − Impostos Federais"],
      ];
      return (
        <div className="order-first grid gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {cards.map(([t, v, h], i) => {
            const hero = false;
            return (
            <div key={t} title={h} className={`rounded-xl border overflow-hidden cursor-help hover:shadow-md transition-shadow ${hero ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
              <div className={`h-1 ${hero ? "bg-primary-foreground/40" : v < 0 ? "bg-destructive" : "bg-primary"}`} />
              <div className={`px-3 ${aba === "DRE" ? "py-1" : "py-2"}`}>
                <div className={`text-[10px] uppercase tracking-wide leading-tight ${aba === "DRE" ? "" : "min-h-[1.6rem]"} ${hero ? "opacity-80" : "text-muted-foreground"}`}>{t}</div>
                <div className={`text-sm font-bold tabular-nums ${hero ? "" : v < 0 ? "text-destructive" : "text-foreground"}`}>R$ {n2(v)}</div>
                {aba !== "DRE" && <><div className={`mt-1 h-1 rounded-full overflow-hidden ${hero ? "bg-primary-foreground/20" : "bg-muted"}`}>
                  <div className={`h-full ${hero ? "bg-primary-foreground" : v < 0 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, fT ? Math.abs(v / fT) * 100 : 0)}%` }} />
                </div>
                <div className={`text-[10px] ${hero ? "opacity-80" : "text-muted-foreground"}`}>{fT ? n2((v / fT) * 100) : "-"}% do faturamento</div></>}
              </div>
            </div>
          );})}
        </div>
      );
    })()}
    </div>
  );
};

export default OrcamentoFaturamento;
