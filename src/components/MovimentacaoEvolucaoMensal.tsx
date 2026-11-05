import { useEffect, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LoaderCircle } from "lucide-react";

const ANOS = [2023, 2024, 2025, 2026];
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

const siglasCache = new Map<string, Record<string, number>>();
async function siglas(d: string) {
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
  const nf = (n: number) => n.toLocaleString("pt-BR");
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!linhas) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Gerando grid…</p>;
  return (
    <div className="max-h-[480px] overflow-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr><th className="px-3 py-2 text-left">Mês</th><th className="px-3 py-2 text-left">Ano</th><th className="px-3 py-2 text-left">Nível</th><th className="px-3 py-2 text-right">Vidas</th></tr>
        </thead>
        <tbody>
          {linhas.flatMap((l) => [
            <tr key={`${l.a}-${l.m}-t`} className="border-t border-border bg-muted/40 font-semibold">
              <td className="px-3 py-1.5">{MESES[l.m]}</td><td className="px-3 py-1.5">{l.a}</td><td className="px-3 py-1.5">Total</td><td className="px-3 py-1.5 text-right tabular-nums">{nf(l.total)}</td>
            </tr>,
            ...(["PIF", "PCA", "PCE"] as const).map((k) => (
              <tr key={`${l.a}-${l.m}-${k}`} className="text-muted-foreground">
                <td className="px-3 py-1">{MESES[l.m]}</td><td className="px-3 py-1">{l.a}</td><td className="py-1 pl-8 pr-3">{k}</td><td className="px-3 py-1 text-right tabular-nums">{nf(l[k])}</td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
}

export default function MovimentacaoEvolucaoMensal() {
  const [dados, setDados] = useState<Record<string, any>[] | null>(null);
  const [err, setErr] = useState("");
  const [grid, setGrid] = useState(false);
  const [datas] = useState(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return ANOS.flatMap((a) => MESES.map((_, m) => ({ a, m, d: fimMes(a, m) })))
      .filter((x) => x.d.slice(0, 7) <= hoje.slice(0, 7))
      .map((x) => ({ ...x, d: x.d > hoje ? hoje : x.d }));
  });

  useEffect(() => {
    let off = false;
    (async () => {
      const res = new Map<string, number>();
      for (let i = 0; i < datas.length; i += 6) {
        const lote = datas.slice(i, i + 6);
        const v = await Promise.all(lote.map((x) => vidas(x.d)));
        lote.forEach((x, k) => res.set(`${x.a}-${x.m}`, v[k]));
      }
      if (off) return;
      setDados(MESES.map((mes, m) => {
        const o: Record<string, any> = { mes };
        ANOS.forEach((a) => { if (res.has(`${a}-${m}`)) o[a] = res.get(`${a}-${m}`); });
        return o;
      }));
    })().catch((e: Error) => !off && setErr(e.message));
    return () => { off = true; };
  }, []);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Evolução mensal de vidas ativas</h3>
        <button type="button" onClick={() => setGrid((g) => !g)} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">
          {grid ? "Ocultar grid" : "Gerar grid"}
        </button>
      </div>
      {grid && <div className="mb-4"><GridVidas datas={datas} /></div>}
      {err ? <p className="text-sm text-destructive">{err}</p> : !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando vidas de 2023 a 2026…</p>
      ) : (
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} width={70} />
              <Tooltip formatter={(v: any) => Number(v).toLocaleString("pt-BR")} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              {ANOS.map((a, i) => <Line key={a} type="monotone" dataKey={String(a)} name={String(a)} stroke={CORES[i]} strokeWidth={a === 2026 ? 3 : 2} dot={{ r: 3 }} connectNulls={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
