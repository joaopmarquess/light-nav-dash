import { useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { podeCalcularMovimentacao, resumoMovimentacao } from "@/lib/movimentacaoResumo";
import { datasVidasIndicadores, mesesMovimentacao, somarTotaisMovimentacao, type TotaisMovimentacao } from "@/lib/movimentacaoCarga";
import { AvisoErroDados } from "@/components/AvisoErroDados";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Search } from "lucide-react";

// Versão de celular de Carteira › Movimentação: só leitura dos mesmos totais
// (carteira_movimentacao_totais por mês e vidas por carteira_trial_geo); a tela de computador não muda.
type F = { de: string; ate: string };
const num = (n: number | null) => (n == null ? "…" : n.toLocaleString("pt-BR"));
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const nomeMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const padrao = (): F => {
  const h = new Date().toISOString().slice(0, 10), de = h.slice(0, 4) + "-01-01";
  const u = new Date(h.slice(0, 8) + "01T12:00:00"); u.setDate(0);
  const ate = u.toISOString().slice(0, 10);
  return { de, ate: ate < de ? h : ate };
};
const vidasEm = async (d: string) => {
  const { data, error } = await hostinger.rpc("carteira_trial_geo", { p_data: d });
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []).reduce((s: number, r: any) => s + (Number(r.ativos) || 0), 0);
};

export default function MovimentacaoCelular() {
  const [f, setF] = useState<F>(padrao());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [totais, setTotais] = useState<TotaisMovimentacao | null>(null);
  const [meses, setMeses] = useState<{ mes: string; t: TotaisMovimentacao }[]>([]);
  const [vidas, setVidas] = useState<{ ant: number | null; fin: number | null }>({ ant: null, fin: null });

  const buscar = async () => {
    if (!podeCalcularMovimentacao(f)) return;
    setLoading(true); setErr(null); setTotais(null); setMeses([]); setVidas({ ant: null, fin: null });
    try {
      const ms = mesesMovimentacao(f);
      const { anterior, final } = datasVidasIndicadores(f);
      Promise.all([vidasEm(anterior), vidasEm(final)]).then(([ant, fin]) => setVidas({ ant, fin })).catch((e: Error) => setErr(e.message));
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < ms.length; i += 2) {
        rows.push(...await Promise.all(ms.slice(i, i + 2).map(async m => {
          const { data, error } = await hostinger.rpc("carteira_movimentacao_totais", { p_de: m.de, p_ate: m.ate });
          if (error) throw new Error(error.message);
          return (Array.isArray(data) ? data[0] : data) ?? {};
        })));
      }
      setTotais(somarTotaisMovimentacao(rows));
      setMeses(rows.map((r, i) => ({ mes: ms[i].de.slice(0, 7), t: somarTotaisMovimentacao([r]) })).reverse());
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const k = totais ?? { e: 0, s: 0, r: 0, tp: 0, tm: 0 };
  const res = resumoMovimentacao(k.e, k.s, k.r, k.tp, k.tm);
  const linha = (rotulo: string, valor: number | null, tom: "pos" | "neg" | "neu" = "neu") => (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{rotulo}</span>
      <span className={`text-lg font-semibold tabular-nums ${tom === "pos" ? "text-primary" : tom === "neg" ? "text-destructive" : "text-foreground"}`}>{totais || tom === "neu" ? num(valor) : "…"}</span>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-3 pb-8">
      <h2 className="mb-3 text-lg font-semibold">Movimentação</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">De<Input type="date" value={f.de} onChange={e => setF({ ...f, de: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground">Até<Input type="date" value={f.ate} onChange={e => setF({ ...f, ate: e.target.value })} /></label>
      </div>
      <Button className="mt-2 w-full" disabled={loading || !podeCalcularMovimentacao(f)} onClick={buscar}>
        {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Buscar
      </Button>
      {err && <div className="mt-3"><AvisoErroDados erro={err} onTentar={buscar} /></div>}
      {(totais || loading) && <>
        <section className="mt-4 rounded-lg border border-border bg-card px-4">
          {linha("Anterior", vidas.ant)}
          {linha("Vendas", k.e, "pos")}
          {linha("Cancelamentos", -k.s, "neg")}
          {linha("Reativações", k.r, "pos")}
          {linha("Transferências Líq.", res.transferenciasLiquidas, res.transferenciasLiquidas < 0 ? "neg" : "pos")}
          {linha("Crescimento", res.crescimento, res.crescimento < 0 ? "neg" : "pos")}
          {linha("Final", vidas.fin)}
        </section>
        {meses.length > 0 && <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Mês a mês</h3>
          <div className="rounded-lg border border-border bg-card">
            <div className="grid grid-cols-4 gap-1 border-b border-border px-3 py-2 text-xs text-muted-foreground"><span>Mês</span><span className="text-right">Vendas</span><span className="text-right">Canc.</span><span className="text-right">Cresc.</span></div>
            {meses.map(({ mes, t }) => { const c = resumoMovimentacao(t.e, t.s, t.r, t.tp, t.tm).crescimento; return (
              <div key={mes} className="grid grid-cols-4 gap-1 border-b border-border px-3 py-2 text-sm tabular-nums last:border-0">
                <span>{nomeMes(mes)}</span>
                <span className="text-right text-primary">{num(t.e)}</span>
                <span className="text-right text-destructive">{num(-t.s)}</span>
                <span className={`text-right font-semibold ${c < 0 ? "text-destructive" : "text-primary"}`}>{num(c)}</span>
              </div>); })}
          </div>
        </section>}
      </>}
    </div>
  );
}
