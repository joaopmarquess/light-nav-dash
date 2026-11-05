import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronRight, LoaderCircle } from "lucide-react";

const ANO_ATUAL = new Date().getUTCFullYear();
const ANOS_OPCOES = Array.from({ length: ANO_ATUAL - 2019 + 1 }, (_, i) => 2019 + i);
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CORES = ["hsl(var(--muted-foreground))", "hsl(var(--chart-2, 160 60% 40%))", "hsl(var(--chart-4, 35 90% 50%))", "hsl(var(--primary))"];
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

function GridVidas({ datas }: { datas: { a: number; m: number; d: string }[] }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let off = false;
    (async () => {
      const out: Linha[] = [];
      for (let i = 0; i < datas.length; i += 6) {
        const lote = datas.slice(i, i + 6);
        const r = await Promise.all(lote.map(async (x) => ({ x, t: await vidas(x.d), s: await siglas(x.d) })));
        r.forEach(({ x, t, s }) => out.push({ a: x.a, m: x.m, total: t, ...s }));
      }
      if (!off) setLinhas(out.reverse());
    })().catch((e: Error) => !off && setErr(e.message));
    return () => { off = true; };
  }, [datas]);
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
  return (
    <div className="max-h-[480px] overflow-auto rounded-md border border-border">
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

export default function MovimentacaoEvolucaoMensal() {
  const [dados, setDados] = useState<Record<string, any>[] | null>(null);
  const [err, setErr] = useState("");
  const [grid, setGrid] = useState(false);
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
      for (let i = 0; i < datas.length; i += 6) {
        const lote = datas.slice(i, i + 6);
        const v = await Promise.all(lote.map((x) => vidas(x.d)));
        lote.forEach((x, k) => res.set(`${x.a}-${x.m}`, v[k]));
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
  }, [datas, ANOS]);

  const sel = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Evolução mensal de vidas ativas</h3>
        <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">De</label>
        <select className={sel} value={de} onChange={(e) => { const v = +e.target.value; setDe(v); if (v > ate) setAte(v); }}>{ANOS_OPCOES.map((a) => <option key={a}>{a}</option>)}</select>
        <label className="text-sm text-muted-foreground">Até</label>
        <select className={sel} value={ate} onChange={(e) => { const v = +e.target.value; setAte(v); if (v < de) setDe(v); }}>{ANOS_OPCOES.map((a) => <option key={a}>{a}</option>)}</select>
        <button type="button" onClick={() => setGrid((g) => !g)} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">
          {grid ? "Ocultar grid" : "Gerar grid"}
        </button>
        </div>
      </div>
      {grid && <div className="mb-4"><GridVidas datas={datas} /></div>}
      {err ? <p className="text-sm text-destructive">{err}</p> : !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando vidas de {de} a {ate}…</p>
      ) : (
        <div className="h-[380px] rounded-lg border border-border bg-background p-3 shadow-sm">
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
    </section>
  );
}
