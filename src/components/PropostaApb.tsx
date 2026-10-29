import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileSpreadsheet, Users, UserCheck, Wallet, Receipt } from "lucide-react";
import PropostaApbSinistralidade from "@/components/PropostaApbSinistralidade";
import csv from "@/data/propostaApb/vidas_precos_2026-10-29.csv?raw";
import { parseApb, gridPlano, PLANOS_APB, PRECOS_PROPOSTA, type FaixaApb } from "@/lib/propostaApb";

const n0 = (v: number) => v.toLocaleString("pt-BR");
const brl = (v: number | null) => (v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "—");

const Card = ({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) => (
  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</div>
    <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
  </div>
);

export default function PropostaApb() {
  const { data, linhas } = useMemo(() => parseApb(csv), []);
  const [transf, setTransf] = useState(false);
  const grids = useMemo(() => Object.fromEntries(PLANOS_APB.map((p) => [p, gridPlano(linhas, p, transf ? PRECOS_PROPOSTA : undefined)])), [linhas, transf]);
  const [sel, setSel] = useState<string>("Todos");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [rel, setRel] = useState(false);

  const tot = PLANOS_APB.reduce((a, p) => {
    const t = grids[p].total;
    return { vidas: a.vidas + t.total, tit: a.tit + t.enfTit + t.apTit, enf: a.enf + t.enfTit + t.enfDep, mens: a.mens + t.mensalidade };
  }, { vidas: 0, tit: 0, enf: 0, mens: 0 });
  const vis = sel === "Todos" ? PLANOS_APB : [sel];
  const k = vis.reduce((a, p) => { const t = grids[p].total; return { vidas: a.vidas + t.total, tit: a.tit + t.enfTit + t.apTit, enf: a.enf + t.enfTit + t.enfDep, mens: a.mens + t.mensalidade }; }, { vidas: 0, tit: 0, enf: 0, mens: 0 });
  const dataBr = data ? data.split("-").reverse().join("/") : "";

  const Linha = ({ f, bold }: { f: FaixaApb; bold?: boolean }) => (
    <tr className={`border-t border-border ${bold ? "bg-muted font-semibold" : ""}`}>
      <td className="px-3 py-1.5 text-left font-medium">{f.faixa}</td>
      {(rel ? [f.enfTit, f.enfDep, f.apTit, f.apDep] : [f.enfTit + f.enfDep, f.apTit + f.apDep]).map((v, i) => <td key={i} className="px-3 py-1.5 text-center">{v ? n0(v) : "-"}</td>)}
      <td className="px-3 py-1.5 text-center font-semibold">{n0(f.total)}</td>
      <td className="px-3 py-1.5 text-center">{brl(f.precoEnf)}</td>
      <td className="px-3 py-1.5 text-center">{brl(f.precoAp)}</td>
      <td className="px-3 py-1.5 text-center font-semibold">{brl(f.mensalidade)}</td>
    </tr>
  );

  return (
    <div className="h-full space-y-5 overflow-auto">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground"><FileSpreadsheet className="h-6 w-6 text-primary" />Proposta APB</h2>
          <p className="text-sm text-muted-foreground">Vidas ativas em {dataBr} nos planos 2290, 2490 e 2890 × preços de referência fornecidos (fotografia, não atualiza com a base).</p>
        </div>
        <div className="flex items-center gap-2">
        <button type="button" onClick={() => setTransf((t) => !t)} className={`rounded-lg border px-3 py-2 text-sm font-medium ${transf ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"}`}>{transf ? "Voltar ao atual" : "Transformar"}</button>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {["Todos", ...PLANOS_APB].map((p) => (
            <button key={p} type="button" onClick={() => setSel(p)} className={`rounded-md px-3 py-1.5 text-sm ${sel === p ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{p}</button>
          ))}
        </div>
        </div>
      </header>
      {transf && <p className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm text-foreground">Modo Transformar: preços pela tabela proposta (iguais para os três planos); projeção anual = vidas × preço × 12; copart 16% da CPP; sinistralidade 75%.</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={Users} label="Vidas ativas" value={n0(k.vidas)} sub={sel === "Todos" ? undefined : `${pct(k.vidas, tot.vidas)} do total`} />
        <Card icon={UserCheck} label="Titulares" value={n0(k.tit)} sub={`${pct(k.tit, k.vidas)} · ${n0(k.vidas - k.tit)} dependentes`} />
        <Card icon={Wallet} label="Mensalidade total" value={brl(k.mens)} sub={`Anual: ${brl(k.mens * 12)}`} />
        <Card icon={Receipt} label="Ticket médio" value={brl(k.vidas ? k.mens / k.vidas : 0)} sub={`Enfermaria ${pct(k.enf, k.vidas)} das vidas`} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="min-w-0 space-y-5">
      {sel === "Todos" && (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Resumo por plano</h3>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground"><tr>{["Plano", "Vidas", "% vidas", "Titulares", "Dependentes", "Enfermaria", "Apartamento", "Mensalidade", "% receita", "Ticket médio"].map((h) => <th key={h} className="px-3 py-1.5 text-center first:text-left">{h}</th>)}</tr></thead>
            <tbody>
              {PLANOS_APB.map((p) => { const t = grids[p].total; return (
                <tr key={p} className="border-t border-border cursor-pointer hover:bg-accent" onClick={() => setSel(p)}>
                  <td className="px-3 py-1.5 font-semibold">{p}</td>
                  <td className="px-3 py-1.5 text-center">{n0(t.total)}</td>
                  <td className="px-3 py-1.5 text-center">{pct(t.total, tot.vidas)}</td>
                  <td className="px-3 py-1.5 text-center">{n0(t.enfTit + t.apTit)}</td>
                  <td className="px-3 py-1.5 text-center">{n0(t.enfDep + t.apDep)}</td>
                  <td className="px-3 py-1.5 text-center">{n0(t.enfTit + t.enfDep)}</td>
                  <td className="px-3 py-1.5 text-center">{n0(t.apTit + t.apDep)}</td>
                  <td className="px-3 py-1.5 text-center">{brl(t.mensalidade)}</td>
                  <td className="px-3 py-1.5 text-center">{pct(t.mensalidade, tot.mens)}</td>
                  <td className="px-3 py-1.5 text-center">{brl(t.total ? t.mensalidade / t.total : 0)}</td>
                </tr>); })}
              <tr className="border-t border-border bg-muted font-semibold">
                <td className="px-3 py-1.5">Total</td><td className="px-3 py-1.5 text-center">{n0(tot.vidas)}</td><td className="px-3 py-1.5 text-center">100,00%</td>
                <td className="px-3 py-1.5 text-center">{n0(tot.tit)}</td><td className="px-3 py-1.5 text-center">{n0(tot.vidas - tot.tit)}</td>
                <td className="px-3 py-1.5 text-center">{n0(tot.enf)}</td><td className="px-3 py-1.5 text-center">{n0(tot.vidas - tot.enf)}</td>
                <td className="px-3 py-1.5 text-center">{brl(tot.mens)}</td><td className="px-3 py-1.5 text-center">100,00%</td><td className="px-3 py-1.5 text-center">{brl(tot.mens / tot.vidas)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {vis.map((p) => (
        <section key={p} className="rounded-lg border border-border bg-card shadow-sm">
          <button type="button" onClick={() => setAbertos((a) => ({ ...a, [p]: !a[p] }))} className="flex w-full items-center justify-between gap-2 p-4 text-left hover:bg-accent">
            <span className="flex items-center gap-2 text-base font-semibold text-foreground">{abertos[p] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}Plano {p}</span>
            <span className="text-sm text-muted-foreground">{n0(grids[p].total.total)} vidas · {brl(grids[p].total.mensalidade)}</span>
          </button>
          {abertos[p] && (
          <div className="overflow-x-auto px-4 pb-4">
            <div className="mb-2 flex justify-end"><button type="button" onClick={() => setRel((r) => !r)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">{rel ? "Recolher Titular/Dependente" : "Expandir Titular/Dependente"}</button></div>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr><th rowSpan={rel ? 3 : 2} className="px-3 py-1.5 text-left align-bottom">Faixa</th><th colSpan={rel ? 5 : 3} className="border-b border-border px-3 py-1.5 text-center">Vidas</th><th colSpan={3} className="border-b border-border px-3 py-1.5 text-center">Preço</th></tr>
                <tr><th colSpan={rel ? 2 : 1} rowSpan={rel ? 1 : 1} className="px-3 py-1 text-center">Enfermaria</th><th colSpan={rel ? 2 : 1} className="px-3 py-1 text-center">Apartamento</th><th rowSpan={rel ? 2 : 1} className="px-3 py-1 text-center align-bottom">Total</th><th rowSpan={rel ? 2 : 1} className="px-3 py-1 text-center align-bottom">Enfermaria</th><th rowSpan={rel ? 2 : 1} className="px-3 py-1 text-center align-bottom">Apartamento</th><th rowSpan={rel ? 2 : 1} className="px-3 py-1 text-center align-bottom">Mensalidade</th></tr>
                {rel && <tr>{["Titular", "Dependente", "Titular", "Dependente"].map((h, i) => <th key={i} className="px-3 py-1 text-center font-normal">{h}</th>)}</tr>}
              </thead>
              <tbody>
                {grids[p].faixas.map((f) => <Linha key={f.faixa} f={f} />)}
                <Linha f={grids[p].total} bold />
              </tbody>
            </table>
          </div>
          )}
        </section>
      ))}
        </div>
        <PropostaApbSinistralidade proj={transf ? Object.fromEntries(PLANOS_APB.map((p) => [p, grids[p]])) : undefined} />
      </div>
      <p className="text-xs text-muted-foreground">Mensalidade = vidas × preço da faixa e acomodação. Ativo: vigência iniciada e sem desligamento na data; titular = matrícula final 00.</p>
    </div>
  );
}
