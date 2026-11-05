import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronRight, Download, LoaderCircle } from "lucide-react";
import * as XLSX from "xlsx";

const ANO_ATUAL = new Date().getUTCFullYear();
const ANOS_OPCOES = Array.from({ length: ANO_ATUAL - 2019 + 1 }, (_, i) => 2019 + i);
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const cache = new Map<string, number>();

/** Último dia do mês (UTC), mesma regra de "Ativos em" da Área Geográfica. */
const fimMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10);

async function vidas(d: string) {
  if (cache.has(d)) return cache.get(d)!;
  const { data, error } = await hostinger.rpc("carteira_trial_geo", { p_data: d });
  if (error) throw new Error(error.message);
  const n = (Array.isArray(data) ? data : []).reduce((s: number, r: any) => s + (Number(r.ativos) || 0), 0);
  cache.set(d, n);
  return n;
}

const siglasCache = new Map<string, Record<"PIF" | "PCA" | "PCE", number>>();
async function siglas(d: string): Promise<Record<"PIF" | "PCA" | "PCE", number>> {
  if (siglasCache.has(d)) return siglasCache.get(d)!;
  const { data, error } = await hostinger.rpc("carteira_trial_siglas", { p_data: d, p_q: null, p_empresa: null, p_cidade: null });
  if (error) throw new Error(error.message);
  const g = (x: string) => Number((data ?? []).find((r: any) => r.sigla === x)?.vidas ?? 0);
  const o = { PIF: g("PIF"), PCA: g("PCA"), PCE: g("PCE") };
  siglasCache.set(d, o);
  return o;
}

type Linha = { a: number; m: number; total: number; PIF: number; PCA: number; PCE: number };
type Data = { a: number; m: number; d: string };

/** Função rápida (uma chamada). Retorna null se ainda não instalada na Hostinger. */
const rapidaCache = new Map<string, Linha[]>();
let rapidaIndisponivel = false;
async function carregarRapida(de: number, ate: number): Promise<Linha[] | null> {
  if (rapidaIndisponivel) return null;
  const k = `${de}-${ate}`;
  if (rapidaCache.has(k)) return rapidaCache.get(k)!;
  const { data, error } = await hostinger.rpc("carteira_evolucao_mensal", { p_de: de, p_ate: ate });
  if (error) { if (/function|schema cache|not find|timing out|timeout|canceling/i.test(error.message)) { rapidaIndisponivel = true; return null; } throw new Error(error.message); }
  const out = (data ?? []).map((r: any) => ({ a: +r.ano, m: +r.mes - 1, total: +r.total, PIF: +r.pif, PCA: +r.pca, PCE: +r.pce }));
  rapidaCache.set(k, out);
  return out;
}

async function emLotes<T, R>(xs: T[], f: (x: T) => Promise<R>, n = 4) {
  const out: R[] = [];
  for (let i = 0; i < xs.length; i += n) out.push(...(await Promise.all(xs.slice(i, i + n).map(f))));
  return out;
}

function GridVidas({ datas, de, ate }: { datas: Data[]; de: number; ate: number }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let off = false;
    setLinhas(null); setErr("");
    (async () => {
      const r = (await carregarRapida(de, ate)) ?? await emLotes(datas, async (x) => ({ a: x.a, m: x.m, total: await vidas(x.d), ...(await siglas(x.d)) }));
      if (!off) setLinhas([...r].reverse());
    })().catch((e: Error) => !off && setErr(e.message));
    return () => { off = true; };
  }, [datas, de, ate]);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const nf = (n: number) => n.toLocaleString("pt-BR");
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!linhas) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Gerando grid…</p>;
  const tog = (k: string) => setAbertos((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const Btn = ({ k }: { k: string }) => (
    <button type="button" onClick={() => tog(k)} aria-label={abertos.has(k) ? "Recolher" : "Expandir"} className="mr-1 inline-flex h-4 w-4 items-center justify-center align-middle">
      <ChevronRight className={`h-4 w-4 transition-transform ${abertos.has(k) ? "rotate-90" : ""}`} />
    </button>
  );
  const anos = [...new Set(linhas.map((l) => l.a))].sort((x, y) => y - x);
  const rows: JSX.Element[] = [];
  anos.forEach((ano) => {
    const ms = linhas.filter((l) => l.a === ano);
    const ka = String(ano);
    rows.push(<tr key={ka} className="border-t border-border bg-muted/40 font-semibold"><td className="px-3 py-1.5"><Btn k={ka} />{ano}</td><td /><td /><td className="px-3 py-1.5 text-right tabular-nums">{nf(ms[0].total)}</td></tr>);
    if (!abertos.has(ka)) return;
    ms.forEach((l) => {
      const km = `${ano}-${l.m}`;
      rows.push(<tr key={km} className="border-t border-border/60"><td className="px-3 py-1 pl-8">{ano}</td><td className="px-3 py-1"><Btn k={km} />{MESES[l.m]}</td><td /><td className="px-3 py-1 text-right tabular-nums">{nf(l.total)}</td></tr>);
      if (abertos.has(km)) (["PIF", "PCA", "PCE"] as const).forEach((p) => rows.push(
        <tr key={`${km}-${p}`} className="text-muted-foreground"><td className="px-3 py-1 pl-8">{ano}</td><td className="px-3 py-1 pl-8">{MESES[l.m]}</td><td className="px-3 py-1">{p}</td><td className="px-3 py-1 text-right tabular-nums">{nf(l[p])}</td></tr>));
    });
  });
  const baixar = () => {
    const linhasX: (string | number)[][] = [["Mês", "Plano", "Vidas"]];
    anos.forEach((ano) => {
      const ms = linhas.filter((l) => l.a === ano);
      ms.forEach((l) => {
        (["PIF", "PCA", "PCE"] as const).forEach((p) => linhasX.push([`${String(l.m + 1).padStart(2, "0")}/${ano}`, p, l[p]]));
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(linhasX);
    ws["!cols"] = [{ wch: 10 }, { wch: 8 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Evolução Mensal");
    XLSX.writeFile(wb, `evolucao_mensal_vidas_${de}-${ate}.xlsx`);
  };
  return (
    <div className="max-h-[480px] overflow-auto">
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={baixar} title="Baixar grid expandido (xlsx)" aria-label="Baixar grid expandido em xlsx" className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted">
          <Download className="h-4 w-4" />xlsx
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr><th className="px-3 py-2 text-left">Ano</th><th className="px-3 py-2 text-left">Mês</th><th className="px-3 py-2 text-left">Plano</th><th className="px-3 py-2 text-right">Vidas</th></tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      <p className="px-3 py-1.5 text-xs text-muted-foreground">Vidas do ano = último mês disponível.</p>
    </div>
  );
}

function Bloco({ titulo, aberto, onToggle, children }: { titulo: string; aberto: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-background shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold">
        <ChevronRight className={`h-4 w-4 transition-transform ${aberto ? "rotate-90" : ""}`} />{titulo}
      </button>
      {aberto && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}

export default function MovimentacaoEvolucaoMensal() {
  const [dados, setDados] = useState<Record<string, any>[] | null>(null);
  const [err, setErr] = useState("");
  const [grafAberto, setGrafAberto] = useState(true);
  const [gridAberto, setGridAberto] = useState(false);
  const [de, setDe] = useState(2019);
  const [ate, setAte] = useState(ANO_ATUAL);
  const ANOS = useMemo(() => ANOS_OPCOES.filter((a) => a >= de && a <= ate), [de, ate]);
  const datas = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return ANOS.flatMap((a) => MESES.map((_, m) => ({ a, m, d: fimMes(a, m) })))
      .filter((x) => x.d.slice(0, 7) <= hoje.slice(0, 7))
      .map((x) => ({ ...x, d: x.d > hoje ? hoje : x.d }));
  }, [ANOS]);

  useEffect(() => {
    let off = false;
    setDados(null); setErr("");
    (async () => {
      const res = new Map<string, number>();
      const rapida = await carregarRapida(de, ate);
      if (rapida) rapida.forEach((l) => res.set(`${l.a}-${l.m}`, l.total));
      else {
        // Sem a função rápida: só busca dezembro dos anos completos e os meses do ano em andamento.
        const precisa = datas.filter((x) => x.m === 11 || !datas.some((y) => y.a === x.a && y.m === 11));
        const v = await emLotes(precisa, (x) => vidas(x.d), 6);
        precisa.forEach((x, k) => res.set(`${x.a}-${x.m}`, v[k]));
      }
      if (off) return;
      const pts: Record<string, any>[] = [];
      ANOS.forEach((a) => {
        if (res.has(`${a}-11`)) pts.push({ mes: String(a), vidas: res.get(`${a}-11`) });
        else MESES.forEach((m, i) => { if (res.has(`${a}-${i}`)) pts.push({ mes: `${m}/${String(a).slice(2)}`, vidas: res.get(`${a}-${i}`) }); });
      });
      setDados(pts);
    })().catch((e: Error) => !off && setErr(e.message));
    return () => { off = true; };
  }, [datas, ANOS, de, ate]);

  const sel = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Evolução mensal de vidas ativas</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">De</label>
          <select className={sel} value={de} onChange={(e) => { const v = +e.target.value; setDe(v); if (v > ate) setAte(v); }}>{ANOS_OPCOES.map((a) => <option key={a}>{a}</option>)}</select>
          <label className="text-sm text-muted-foreground">Até</label>
          <select className={sel} value={ate} onChange={(e) => { const v = +e.target.value; setAte(v); if (v < de) setDe(v); }}>{ANOS_OPCOES.map((a) => <option key={a}>{a}</option>)}</select>
        </div>
      </div>
      <Bloco titulo="Gráfico" aberto={grafAberto} onToggle={() => setGrafAberto((v) => !v)}>
        {err ? <p className="text-sm text-destructive">{err}</p> : !dados ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando vidas de {de} a {ate}…</p>
        ) : (
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados} margin={{ top: 24, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} width={70} />
                <Tooltip formatter={(v: any) => Number(v).toLocaleString("pt-BR")} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="vidas" name="Vidas" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }}><LabelList dataKey="vidas" position="top" offset={8} fontSize={11} fill="hsl(var(--foreground))" formatter={(v: any) => Number(v).toLocaleString("pt-BR")} /></Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Bloco>
      <Bloco titulo="Grid" aberto={gridAberto} onToggle={() => setGridAberto((v) => !v)}>
        <GridVidas datas={datas} de={de} ate={ate} />
      </Bloco>
    </section>
  );
}
