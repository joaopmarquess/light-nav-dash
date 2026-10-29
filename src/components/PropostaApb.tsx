import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileSpreadsheet, Users, UserCheck, Wallet, Receipt, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PropostaApbSinistralidade from "@/components/PropostaApbSinistralidade";
import { gerarPropostaPdf } from "@/lib/propostaApbPdf";
import PropostaApbCopart from "@/components/PropostaApbCopart";
const COPART_DESC: Record<string, string> = { "2290": "Sem Coparticipação", "2490": "Use Bem com teto de R$ 396,96", "2890": "Fácil Flex com teto de R$ 656,10", "Proposta": "Fácil 50 sem teto" };
const COPART_TIPO = { "2490": "usebem", "2890": "flex", "Proposta": "facil50" } as const;
import csv from "@/data/propostaApb/vidas_precos_2026-10-29.csv?raw";
import { parseApb, gridPlano, PLANOS_APB, FAIXAS_APB, PRECOS_APB, PRECOS_PROPOSTA, PLANO_NOVO, PLANO_GRUPO, idadeSomaPlanos, escalarVidas, gridsN5, COPART_PROPOSTA, tabelaLinear, tabelaDependente, PRECO_TITULAR_2890, projecaoFaixas, type FaixaApb } from "@/lib/propostaApb";

const n0 = (v: number) => v.toLocaleString("pt-BR");
const brl = (v: number | null) => (v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "—");

const Card = ({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) => (
  <div className="rounded-lg border border-border bg-card px-3 py-2 text-center shadow-sm">
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</div>
    <div className="mt-0.5 text-xl font-semibold text-foreground">{value}</div>
    {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
  </div>
);

export default function PropostaApb() {
  const { data, linhas } = useMemo(() => parseApb(csv), []);
  const linhasN4 = useMemo(() => escalarVidas(linhas), [linhas]);
  const sinN3 = useMemo(() => projecaoFaixas(gridPlano(linhas.map((l) => ({ ...l, plano: PLANO_NOVO })), PLANO_NOVO, PRECOS_PROPOSTA).faixas.map((f) => f.mensalidade)).sin, [linhas]);
  const [nivel, setNivel] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [linEnf, setLinEnf] = useState(199.99);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [sinPct, setSinPct] = useState(90);
  const [copartPct, setCopartPct] = useState(25);
  const [depBase, setDepBase] = useState(125);
  const linear = useMemo(() => tabelaLinear(linEnf), [linEnf]);
  const precoDep = useMemo(() => tabelaDependente(depBase), [depBase]);
  const n5 = useMemo(() => gridsN5(linhasN4, linear, precoDep), [linhasN4, linear, precoDep]);
  const transf = nivel >= 3;
  // Transformar: todas as vidas migram para o plano novo 3990, com a tabela proposta.
  // Nível 2: os três planos agrupados em GRUPO, com preços e resultado atuais (preço por faixa varia por plano → não exibido).
  const planos = nivel >= 3 ? [PLANO_NOVO] : nivel === 2 ? [PLANO_GRUPO] : PLANOS_APB;
  const grids = useMemo(() => {
    if (nivel === 3) return { [PLANO_NOVO]: gridPlano(linhas.map((l) => ({ ...l, plano: PLANO_NOVO })), PLANO_NOVO, PRECOS_PROPOSTA) };
    if (nivel === 5) return { [PLANO_NOVO]: n5.todos };
    if (nivel === 4) return { [PLANO_NOVO]: gridPlano(linhasN4.map((l) => ({ ...l, plano: PLANO_NOVO })), PLANO_NOVO, PRECOS_PROPOSTA) };
    if (nivel === 2) {
      const g = gridPlano(linhas.map((l) => ({ ...l, plano: PLANO_GRUPO })), PLANO_GRUPO);
      const media = (i: number, a: 0 | 1) => PLANOS_APB.reduce((t, pl) => t + PRECOS_APB[pl][i][a], 0) / PLANOS_APB.length; // média simples das tabelas 2290/2490/2890
      return { [PLANO_GRUPO]: { ...g, faixas: g.faixas.map((f, i) => ({ ...f, precoEnf: media(i, 0), precoAp: media(i, 1) })) } };
    }
    return Object.fromEntries(PLANOS_APB.map((p) => [p, gridPlano(linhas, p)]));
  }, [linhas, linhasN4, nivel, n5]) as Record<string, ReturnType<typeof gridPlano>>;
  // Plano 2890 (Nível 1): grid triplicado — Titular (preço linear), Dependente (tabela) e Todos (preço médio ponderado por vidas).
  const sub2890 = useMemo(() => {
    const ls = linhas.filter((l) => l.plano === "2890");
    const tit = gridPlano(ls.filter((l) => l.rel === "Titular"), "2890", FAIXAS_APB.map(() => PRECO_TITULAR_2890));
    const dep = gridPlano(ls.filter((l) => l.rel === "Dependente"), "2890");
    const g = gridPlano(ls, "2890");
    const medio = (faixa: string, a: string) => { const x = ls.filter((l) => l.faixa === faixa && l.acom === a); const v = x.reduce((t, l) => t + l.vidas, 0); return v ? x.reduce((t, l) => t + l.vidas * l.preco, 0) / v : null; };
    const todos = { ...g, faixas: g.faixas.map((f) => ({ ...f, precoEnf: medio(f.faixa, "Enfermaria"), precoAp: medio(f.faixa, "Apartamento") })) };
    return [["Titular", tit], ["Dependente", dep], ["Todos (preço médio)", todos]] as const;
  }, [linhas]);
  const [sel, setSel] = useState<string>("Todos");
  const selOk = nivel > 1 ? planos[0] : "Todos";
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [rel, setRel] = useState(false);

  const tot = planos.reduce((a, p) => {
    const t = grids[p].total;
    return { vidas: a.vidas + t.total, tit: a.tit + t.enfTit + t.apTit, enf: a.enf + t.enfTit + t.enfDep, mens: a.mens + t.mensalidade };
  }, { vidas: 0, tit: 0, enf: 0, mens: 0 });
  const vis = selOk === "Todos" ? planos : [selOk];
  const k = vis.reduce((a, p) => { const t = grids[p].total; return { vidas: a.vidas + t.total, tit: a.tit + t.enfTit + t.apTit, enf: a.enf + t.enfTit + t.enfDep, mens: a.mens + t.mensalidade }; }, { vidas: 0, tit: 0, enf: 0, mens: 0 });
  const idadeSoma = idadeSomaPlanos(nivel >= 4 ? linhasN4 : linhas, vis); // idades exatas pela data de nascimento
  const idadeMedia = k.vidas ? idadeSoma / k.vidas : 0;
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
    <div className={`h-full space-y-2 overflow-y-auto text-sm [scrollbar-gutter:stable] ${nivel > 1 ? "[&_table]:table-fixed [&_td]:whitespace-nowrap" : ""}`}><div className="flex min-h-full flex-col gap-2 [&_td]:py-0.5 [&_th]:py-0.5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground"><FileSpreadsheet className="h-6 w-6 text-primary" />Proposta APB</h2>
        </div>
        <div className="flex items-center gap-2">
        <button type="button" onClick={() => gerarPropostaPdf()} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Gerar Proposta</button>
        <Dialog>
          <DialogTrigger asChild><button type="button" className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">Tabela Proposta</button></DialogTrigger>
          <DialogContent className="max-w-[90vw] text-base">
            <DialogHeader><DialogTitle>Tabelas de preço — 2290 × 2490 × 2890 × Proposta ({PLANO_NOVO})</DialogTitle></DialogHeader>
            <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="bg-primary text-primary-foreground"><th rowSpan={2} className="px-3 py-2 text-left align-bottom">Faixa etária</th>{[...PLANOS_APB, "Proposta"].map((p) => <th key={p} colSpan={2} className="border-l border-primary-foreground/30 px-3 py-1 text-center">{p}{COPART_DESC[p] && <div className="text-xs font-normal">{COPART_DESC[p]}{p in COPART_TIPO && <PropostaApbCopart tipo={COPART_TIPO[p as keyof typeof COPART_TIPO]} />}</div>}</th>)}</tr>
                <tr className="bg-primary text-sm text-primary-foreground">{[...PLANOS_APB, "Proposta"].flatMap((p) => [<th key={p + "e"} className="border-l border-primary-foreground/30 px-2 py-1 text-center">Enfermaria</th>, <th key={p + "a"} className="px-2 py-1 text-center">Apartamento</th>])}</tr>
              </thead>
              <tbody>{FAIXAS_APB.map((f, i) => <tr key={f} className="border-t border-border"><td className="px-3 py-1.5 font-medium">{f}</td>{[...PLANOS_APB.map((p) => PRECOS_APB[p][i]), PRECOS_PROPOSTA[i]].flatMap((v, j) => [<td key={j + "e"} className={`border-l border-border px-3 py-2.5 text-center ${j === 3 ? "font-semibold" : ""}`}>{brl(v[0])}</td>, <td key={j + "a"} className={`px-3 py-2.5 text-center ${j === 3 ? "font-semibold" : ""}`}>{brl(v[1])}</td>])}</tr>)}</tbody>
            </table>
            </div>
          </DialogContent>
        </Dialog>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {([1, 2, 3, 4, 5] as const).map((n) => <button key={n} type="button" onClick={() => setNivel(n)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${nivel === n ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>Nível {n}</button>)}
          <Dialog modal={false} onOpenChange={(o) => o && setPos({ x: 0, y: 0 })}>
            <DialogTrigger asChild><button type="button" tabIndex={nivel === 5 ? 0 : -1} aria-hidden={nivel !== 5} className={`${nivel === 5 ? "" : "invisible pointer-events-none"} rounded-md border border-primary px-3 py-1.5 text-sm text-primary hover:bg-accent`}>Variáveis</button></DialogTrigger>
            <DialogContent semFundo className="max-w-md shadow-2xl" style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }} onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader className="cursor-move select-none" onPointerDown={(e) => { const o = { x: e.clientX - pos.x, y: e.clientY - pos.y }; const mv = (ev: PointerEvent) => setPos({ x: ev.clientX - o.x, y: ev.clientY - o.y }); const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); }}><DialogTitle>Variáveis do Nível 5</DialogTitle><p className="text-xs font-normal text-muted-foreground">Arraste por aqui para mover</p></DialogHeader>
              <div className="space-y-4 text-sm">
                <label className="flex items-center gap-2 font-semibold">Sinistralidade:<input aria-label="Sinistralidade" type="number" step="0.01" min="0" value={sinPct} onChange={(e) => setSinPct(Number(e.target.value) || 0)} className="w-24 rounded border border-input bg-background px-2 py-1 text-right font-normal" />%<button type="button" onClick={() => setSinPct(90)} className="rounded border border-border px-2 py-0.5 text-xs font-normal hover:bg-accent">Padrão</button></label>
                <label className="flex items-center gap-2 font-semibold">Coparticipação (% da CPP):<input aria-label="Coparticipação" type="number" step="0.1" min="0" value={copartPct} onChange={(e) => setCopartPct(Number(e.target.value) || 0)} className="w-24 rounded border border-input bg-background px-2 py-1 text-right font-normal" />%</label>
                <div>
                  <div className="mb-2 font-semibold">Titular</div>
                  <div className="flex gap-4"><label className="flex items-center gap-2">Enfermaria:<input type="number" step="0.01" min="0" value={linEnf} onChange={(e) => setLinEnf(Number(e.target.value) || 0)} className="w-28 rounded border border-input bg-background px-2 py-1 text-right" /></label><span className="flex items-center gap-2">Apartamento: <b>{brl(linear[1])}</b></span></div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between font-semibold">Dependente<button type="button" onClick={() => setDepBase(125)} className="rounded border border-border px-2 py-0.5 text-xs font-normal hover:bg-accent">Restaurar sugestão</button></div>
                  <table className="w-full">
                    <thead className="text-muted-foreground"><tr><th className="py-1 text-left">Faixa</th><th className="py-1 text-center">Enfermaria</th><th className="py-1 text-center">Apartamento</th></tr></thead>
                    <tbody>{FAIXAS_APB.map((f, i) => <tr key={f} className="border-t border-border"><td className="py-1 font-medium">{f}</td>{[0, 1].map((j) => <td key={j} className="px-1 py-1 text-right">{i === 0 && j === 0 ? <input aria-label="00 a 18 Enfermaria" type="number" step="0.01" min="0" value={depBase} onChange={(e) => setDepBase(Number(e.target.value) || 0)} className="w-full rounded border border-input bg-background px-2 py-1 text-right" /> : <span className="px-2">{brl(precoDep[i][j])}</span>}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {false && <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {(nivel > 1 ? planos : ["Todos", ...planos]).map((p) => (
            <button key={p} type="button" onClick={() => setSel(p)} className={`rounded-md px-3 py-1.5 text-sm ${selOk === p ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{p}</button>
          ))}
        </div>}
        </div>
      </header>
      {nivel === 2 && <p className="rounded-md border border-primary/40 bg-primary/5 truncate px-3 py-1 text-xs text-foreground">Nível 2: planos 2290, 2490 e 2890 agrupados como GRUPO, com preços e resultados atuais.</p>}
      {nivel === 4 && <p className="rounded-md border border-primary/40 bg-primary/5 truncate px-3 py-1 text-xs text-foreground">Nível 4: igual ao Nível 3, com 1.242 titulares nas quantidades por faixa fornecidas + 15% de dependentes (186), distribuídos como hoje; despesas = receita total × sinistralidade do Nível 3.</p>}
      {nivel === 5 && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-1 text-xs text-foreground">
          <span className="truncate">Nível 5: vidas do Nível 4 no plano 3990; titulares com preço linear e dependentes com tabela por faixa; despesas = receita total × sinistralidade do Nível 3.</span>

        </div>
      )}
      {nivel === 3 && <p className="rounded-md border border-primary/40 bg-primary/5 truncate px-3 py-1 text-xs text-foreground">Nível 3: todas as vidas dos planos 2290, 2490 e 2890 passam ao plano novo 3990, com a tabela proposta; projeção anual = vidas × preço × 12; copart 20% da CPP; despesas fixas de R$ 2.950.000,00.</p>}

      <section className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Card icon={Users} label="Vidas ativas" value={n0(k.vidas)} />
        <Card icon={UserCheck} label="Titulares" value={n0(k.tit)} sub={pct(k.tit, k.vidas)} />
        <Card icon={Users} label="Dependentes" value={n0(k.vidas - k.tit)} sub={pct(k.vidas - k.tit, k.vidas)} />
        <Card icon={CalendarDays} label="Idade média" value={`${idadeMedia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos`} />
        <Card icon={Wallet} label="Mensalidade total" value={brl(k.mens)} sub={`Anual: ${brl(k.mens * 12)}`} />
        {(() => { const tm = k.vidas ? k.mens / k.vidas : 0; const tc = nivel >= 3 ? tm * (nivel === 5 ? copartPct / 100 : COPART_PROPOSTA) : null; return (
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Receipt className="h-4 w-4 text-primary" />Ticket</div>
            <div className="mt-0.5 grid grid-cols-3 gap-1">{([["Mens", tm], ["Copar", tc], ["Médio", tc == null ? null : tm + tc]] as const).map(([l, v]) => <div key={l}><div className="text-[11px] text-muted-foreground">Ticket {l}</div><div className={`text-sm font-semibold ${l === "Médio" ? "text-primary" : "text-foreground"}`}>{brl(v)}</div></div>)}</div>
          </div>); })()}
      </section>

      <div className="grid flex-1 gap-2 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
      {selOk === "Todos" && (
        <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Resumo por plano</h3>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground"><tr>{["Plano", "Vidas", "% vidas", "Titulares", "Dependentes", "Enfermaria", "Apartamento", "Mensalidade", "% receita", "Ticket médio"].map((h) => <th key={h} className="px-3 py-1.5 text-center first:text-left">{h}</th>)}</tr></thead>
            <tbody>
              {planos.map((p) => { const t = grids[p].total; return (
                <tr key={p} className="border-t border-border">
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
        <section key={p} className={`rounded-lg border border-border bg-card shadow-sm flex flex-1 flex-col`}>
          <button type="button" disabled={nivel > 1} onClick={() => setAbertos((a) => ({ ...a, [p]: !a[p] }))} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left enabled:hover:bg-accent">
            <span className="flex items-center gap-2 text-base font-semibold text-foreground">{nivel > 1 ? null : abertos[p] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}Plano {p}</span>
            <span className="text-sm text-muted-foreground">{n0(grids[p].total.total)} vidas · {brl(grids[p].total.mensalidade)}</span>
          </button>
          {(abertos[p] || nivel > 1) && (
          <div className={`overflow-x-auto px-3 pb-2 ${nivel > 1 ? "flex flex-1 flex-col" : ""}`}>
            <div className="mb-1 flex justify-end"><button type="button" onClick={() => setRel((r) => !r)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">{rel ? "Recolher Titular/Dependente" : "Expandir Titular/Dependente"}</button></div>
            {!(nivel === 1 && p === "2890") && nivel !== 5 && (
            <table className={`w-full text-sm ${nivel > 1 ? "h-full flex-1" : ""}`}>
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
            )}
            {((nivel === 1 && p === "2890") ? sub2890 : nivel === 5 ? ([["Titular × tabela linear", n5.tit], ["Dependente × tabela por faixa", n5.dep]] as const) : []).map(([nome, g]) => (
              <div key={nome} className="mb-3">
                <div className="px-1 py-1 text-sm font-semibold text-foreground">{nome}</div>
            <table key={nome} className={`w-full text-sm ${nivel > 1 ? "h-full flex-1" : ""}`}>
              <thead className="text-muted-foreground">
                <tr><th rowSpan={rel ? 3 : 2} className="px-3 py-1.5 text-left align-bottom">Faixa</th><th colSpan={rel ? 5 : 3} className="border-b border-border px-3 py-1.5 text-center">Vidas</th><th colSpan={3} className="border-b border-border px-3 py-1.5 text-center">Preço</th></tr>
                <tr><th colSpan={rel ? 2 : 1} rowSpan={rel ? 1 : 1} className="px-3 py-1 text-center">Enfermaria</th><th colSpan={rel ? 2 : 1} className="px-3 py-1 text-center">Apartamento</th><th rowSpan={rel ? 2 : 1} className="px-3 py-1 text-center align-bottom">Total</th><th rowSpan={rel ? 2 : 1} className="px-3 py-1 text-center align-bottom">Enfermaria</th><th rowSpan={rel ? 2 : 1} className="px-3 py-1 text-center align-bottom">Apartamento</th><th rowSpan={rel ? 2 : 1} className="px-3 py-1 text-center align-bottom">Mensalidade</th></tr>
                {rel && <tr>{["Titular", "Dependente", "Titular", "Dependente"].map((h, i) => <th key={i} className="px-3 py-1 text-center font-normal">{h}</th>)}</tr>}
              </thead>
              <tbody>
                {g.faixas.map((f) => <Linha key={f.faixa} f={f} />)}
                <Linha f={g.total} bold />
              </tbody>
            </table>
              </div>
            ))}
          </div>
          )}
        </section>
      ))}
        </div>
        <PropostaApbSinistralidade proj={transf ? grids : undefined} sinFixa={nivel === 5 ? sinPct / 100 : nivel === 4 ? sinN3 : undefined} copart={nivel === 5 ? copartPct / 100 : undefined} grupo={nivel === 2 ? grids[PLANO_GRUPO] : undefined} fixo={nivel > 1} />
      </div>
    </div></div>
  );
}
