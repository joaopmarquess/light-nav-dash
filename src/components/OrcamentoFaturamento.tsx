import { useState } from "react";
import { RotateCcw, ChevronDown, ChevronRight } from "lucide-react";

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

const OrcamentoFaturamento = () => {
  const [rows, setRows] = useState<Linha[]>(BASE);
  const [aba, setAba] = useState("Faturamento");
  const [reaj, setReaj] = useState(1.01);
  const [rec, setRec] = useState(16);
  const [sinLiq, setSinLiq] = useState(87);
  const [rede, setRede] = useState(55);
  const [demaisOp, setDemaisOp] = useState([2, 1, 0.5, 0.2]);
  const [admPc, setAdmPc] = useState([4, 2, 0.8, 1.2]);
  const [admTot, setAdmTot] = useState(8);
  const [finPc, setFinPc] = useState(4);
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

  const inp = "w-24 rounded border border-border px-2 py-1 text-right tabular-nums font-semibold bg-yellow-100/60";
  const td = "px-2 py-0.5 text-right tabular-nums whitespace-nowrap";
  const tot = (v: string) => <span className="inline-block w-24 px-2 text-right">{v}</span>;

  const MESES = ["2026", ...["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"].map((m) => `${m}/27`)];
  const mesVal = (r: Linha, k: number) => (r.vidas + k * (r.entradas - r.saidas)) * (k === 0 ? r.ticket : tk(r, k));
  const totLinha = (r: Linha) => MESES.slice(1).reduce((s, _, j) => s + mesVal(r, j + 1), 0);

  return (
    <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {ABAS.map((a) => (
        <button
          key={a}
          onClick={() => setAba(a)}
          className={`rounded-md border px-3 py-1.5 text-sm ${aba === a ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
        >
          {a}
        </button>
      ))}
    </div>
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
            {rows.map((r, i) => (
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
              <td className="px-2 py-0.5">FATURAMENTO</td>
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
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th />
                  {M.map((m) => <th key={m} className="text-right px-2 py-2 whitespace-nowrap">{m}</th>)}
                  <th className="text-right px-2 py-2 border-l border-border">Total 2027</th>
                </tr>
              </thead>
              <tbody>
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
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th />
                  {M.map((m) => <th key={m} className="text-right px-2 py-2 whitespace-nowrap">{m}</th>)}
                  <th className="text-right px-2 py-2 border-l border-border">Total 2027</th>
                </tr>
              </thead>
              <tbody>
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
        <tr key={nome + (filho ? "-f" : "")} className={`border-t border-border ${cl}`}>
          <td className={`px-2 py-0.5 whitespace-nowrap ${filho ? "pl-8 text-muted-foreground" : "font-medium"}`}>
            {key ? (
              <button onClick={() => setDreAbertos((p) => ({ ...p, [key]: !p[key] }))} className="inline-flex items-center gap-1 hover:text-primary">
                {dreAbertos[key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{nome}
              </button>
            ) : <span className={filho ? "" : "pl-5"}>{nome}</span>}
          </td>
          {vs.map((v, k) => <td key={k} className={`${td} ${cls(v)}`}>{n2(v)}</td>)}
          <td className={`${td} border-l border-border font-semibold ${cls(t(vs))}`}>{n2(t(vs))}</td>
        </tr>
      );
      const grupo = (nome: string, vs: number[], key: string, cl = "") => [
        row(nome, vs, cl, key),
        ...(dreAbertos[key] ? filhos[key].map(([n, v]) => row(n, v, "", undefined, true)) : []),
      ];
      const tF = t(fatM);
      const SUB = "border-t-2 border-b-2 !border-primary/40 bg-primary/10 font-bold [&_td]:font-bold";
      return (
        <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold cursor-help" title="Resultado = Entradas Operacionais − Despesas Assistenciais − Demais Operacionais − Despesas Administrativas + Financeiro. Usa as premissas de cada botão.">DRE — jan/27 a dez/27</h3>
            <span className="ml-auto rounded-md border border-border bg-muted/60 px-2 py-0.5 text-sm cursor-help" title="Resultado Total ÷ Faturamento Total">Margem: <b className="tabular-nums">{tF ? `${n2((t(res) / tF) * 100)}%` : "-"}</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th />
                  {M.map((m) => <th key={m} className="text-right px-2 py-2 whitespace-nowrap">{m}</th>)}
                  <th className="text-right px-2 py-2 border-l border-border">Total 2027</th>
                </tr>
              </thead>
              <tbody>
                {grupo("ENTRADAS OPERACIONAIS", ent, "ENT", SUB)}
                {grupo("DESPESAS ASSISTENCIAIS", desp, "DESP", SUB)}
                {grupo("DEMAIS OPERACIONAIS", dOp, "OP", SUB)}
                {grupo("DESPESAS ADMINISTRATIVAS", adm, "ADM", SUB)}
                {row("FINANCEIRO", fin, SUB)}
                {row("RESULTADO", res, "border-t-4 border-b-4 !border-primary bg-primary/30 font-bold [&_td]:font-bold")}
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
    </div>
  );
};

export default OrcamentoFaturamento;
