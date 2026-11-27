import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { geographicToday, useCarteiraTrialGeo } from "@/hooks/useCarteiraTrialGeo";
import { StateHeatMap } from "@/components/StateHeatMap";
import { AvisoErroDados } from "@/components/AvisoErroDados";
import { UF_FLAGS } from "@/lib/ufFlags";
import { vidasPorRegiaoIbge } from "@/lib/regioesIbge";

// Versão de celular de Carteira › Área Geográfica: mesma consulta (carteira_trial_geo) e mesmo
// agrupamento IBGE da tela de computador, que não muda.
const UFS = ["SP", "MS", "MG", "GO"] as const;
const pct = (v: number, t: number) => (t > 0 ? (v / t) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export default function AreaGeograficaCelular() {
  const [data, setData] = useState(geographicToday);
  const [modo, setModo] = useState<"estado" | "regiao">("estado");
  const [regiaoSel, setRegiaoSel] = useState<number | null>(null);
  const { data: rows, isLoading, error, refetch } = useCarteiraTrialGeo(data);

  const { total, porUF, cityTotalsByUF } = useMemo(() => {
    const uf: Record<string, number> = {};
    const city: Record<string, Record<string, number>> = { SP: {}, MG: {}, MS: {}, GO: {} };
    let total = 0;
    for (const r of rows ?? []) {
      total += r.ativos;
      if (r.uf) uf[r.uf] = (uf[r.uf] ?? 0) + r.ativos;
      if (city[r.uf] && r.cidade) city[r.uf][r.cidade] = (city[r.uf][r.cidade] ?? 0) + r.ativos;
    }
    const porUF = UFS.map((u) => ({ id: u, nome: u, uf: u, total: uf[u] ?? 0 }));
    porUF.push({ id: "Outros", nome: "Outros", uf: "", total: total - porUF.reduce((s, r) => s + r.total, 0) } as any);
    return { total, porUF, cityTotalsByUF: city };
  }, [rows]);
  const porRegiao = useMemo(() => vidasPorRegiaoIbge(rows ?? [], "imediata"), [rows]);
  const lista = modo === "estado" ? porUF : porRegiao;
  const max = Math.max(1, ...lista.map((r) => r.total));

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 pb-8">
      <div className="flex items-center justify-between gap-2 text-sm">
        <label className="flex items-center gap-2"><span className="text-muted-foreground">Ativos em</span>
          <input type="date" aria-label="Ativos em" value={data} onChange={(e) => e.target.value && setData(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2" />
        </label>
        {!isLoading && !error && <span className="text-lg font-bold tabular-nums">{total.toLocaleString("pt-BR")}</span>}
      </div>
      {isLoading ? <div className="flex items-center justify-center p-8 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando…</div>
        : error ? <AvisoErroDados erro={error.message} onTentar={() => void refetch()} />
        : <>
          <div className="h-[340px] shrink-0 overflow-hidden rounded-xl border border-border bg-card">
            <StateHeatMap trialScale showOverview={false} ufs={["SP", "MG", "MS", "GO"]} cityTotalsByUF={cityTotalsByUF} regiaoDestaque={modo === "regiao" ? regiaoSel : null} />
          </div>
          <div role="group" aria-label="Agrupar por" className="grid grid-cols-2 gap-1 rounded-lg bg-accent/50 p-1 text-sm">
            {([["estado", "Estado"], ["regiao", "Região IBGE"]] as const).map(([v, rot]) => (
              <button key={v} type="button" aria-pressed={modo === v} onClick={() => { setModo(v); setRegiaoSel(null); }}
                className={`rounded-md py-2 ${modo === v ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"}`}>{rot}</button>))}
          </div>
          <div className="flex flex-col gap-1">
            {lista.map((r) => {
              const sel = modo === "regiao" && regiaoSel === Number(r.id);
              const clicavel = modo === "regiao" && r.id !== "?";
              return (
                <button key={r.id} type="button" disabled={!clicavel} aria-pressed={sel} onClick={() => setRegiaoSel((a) => a === Number(r.id) ? null : Number(r.id))}
                  className={`w-full rounded-lg px-3 py-2 text-left ${sel ? "bg-orange-100 ring-1 ring-orange-400 dark:bg-orange-500/20" : ""}`}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      {modo === "estado" && UF_FLAGS[r.id] && <img src={UF_FLAGS[r.id]} alt="" className="h-3 w-[18px] rounded-[2px] border border-border object-cover" />}
                      {r.nome}{modo === "regiao" && r.uf && <span className="text-[11px] text-muted-foreground">{r.uf}</span>}
                    </span>
                    <span className="whitespace-nowrap"><span className="font-semibold tabular-nums">{r.total.toLocaleString("pt-BR")}</span> <span className="text-[11px] text-muted-foreground">({pct(r.total, total)}%)</span></span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-accent"><div className="h-full bg-primary" style={{ width: `${(r.total / max) * 100}%` }} /></div>
                </button>
              );
            })}
          </div>
        </>}
    </div>
  );
}
