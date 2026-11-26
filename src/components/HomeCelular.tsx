import { useEffect, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { somarTotaisMovimentacao, type TotaisMovimentacao } from "@/lib/movimentacaoCarga";
import { AvisoErroDados } from "@/components/AvisoErroDados";
import { ChevronRight } from "lucide-react";
import { periodoHomeCelular } from "./homeCelularPeriodo";
import { resumoMovimentacao } from "@/lib/movimentacaoResumo";

// Home de celular: movimentação desde 01/01/2026 até hoje e vidas ativas nessa data.
type App = { id: string; label: string; icon: React.ComponentType<{ className?: string }> };

export default function HomeCelular({ apps, nome, onAbrir }: { apps: App[]; nome?: string | null; onAbrir: (id: string) => void }) {
  const p = periodoHomeCelular();
  const [vidas, setVidas] = useState<number | null>(null);
  const [t, setT] = useState<TotaisMovimentacao | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setErr(null); setVidas(null); setT(null);
    hostinger.rpc("carteira_trial_geo", { p_data: p.ate }).then(({ data, error }) => {
      if (error) return setErr(error.message);
      setVidas((Array.isArray(data) ? data : []).reduce((s: number, r: any) => s + (Number(r.ativos) || 0), 0));
    });
    hostinger.rpc("carteira_movimentacao_totais", { p_de: p.de, p_ate: p.ate }).then(({ data, error }) => {
      if (error) return setErr(error.message);
      setT(somarTotaisMovimentacao([(Array.isArray(data) ? data[0] : data) ?? {}]));
    });
  }, [tick, p.de, p.ate]);
  const n = (v: number | null | undefined) => (v == null ? "…" : v.toLocaleString("pt-BR"));
  const crescimento = t ? resumoMovimentacao(t.e, t.s, t.r, t.tp, t.tm).crescimento : null;
  const card = (rotulo: string, valor: string, tom = "text-foreground") => (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tom}`}>{valor}</p>
    </div>
  );
  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      <div>
        <p className="text-lg font-semibold">Olá, {nome ?? "Usuário"}</p>
        <p className="text-xs text-muted-foreground">Movimentação de {p.nome}</p>
      </div>
      {err ? <AvisoErroDados erro={err} onTentar={() => setTick(x => x + 1)} /> : (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">{card("Vidas ativas atuais", n(vidas), "text-primary")}</div>
          {card("Vendas", n(t?.e))}
          {card("Cancelamentos", n(t?.s), "text-destructive")}
          <div className="col-span-2">{card("Crescimento", n(crescimento), crescimento !== null && crescimento < 0 ? "text-destructive" : "text-primary")}</div>
        </div>
      )}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Apps</p>
        <div className="divide-y divide-border border-y border-border">
          {apps.map(a => (
            <button key={a.id} onClick={() => onAbrir(a.id)} className="flex w-full items-center gap-3 py-3 text-left">
              <a.icon className="h-5 w-5 text-primary" /><span className="flex-1">{a.label}</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          {apps.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nenhum app de celular liberado.</p>}
        </div>
      </div>
    </div>
  );
}
