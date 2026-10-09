import { useEffect, useMemo, useState } from "react";
import { Loader2, Map as MapIcon } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";
import { BrazilHeatMap } from "@/components/BrazilHeatMap";
import { StateHeatMap } from "@/components/StateHeatMap";
import { UF_FLAGS } from "@/components/DWCarteira";

type Row = { uf: string; cidade: string; ativos: number };
const hoje = () => new Date().toISOString().slice(0, 10);

const CarteiraTrialGeo = () => {
  const [data, setData] = useState(hoje());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<"SP" | "MG" | "MS" | "BRASIL" | null>(null);

  useEffect(() => {
    let abort = false;
    setLoading(true); setError(null);
    hostinger.rpc("carteira_trial_geo", { p_data: data }).then(({ data: d, error }: any) => {
      if (abort) return;
      if (error) setError(error.message); else setRows((d ?? []).map((r: any) => ({ uf: String(r.uf ?? "").trim().toUpperCase(), cidade: String(r.cidade ?? ""), ativos: Number(r.ativos) || 0 })));
      setLoading(false);
    });
    return () => { abort = true; };
  }, [data]);

  const { total, porUF, ufTotals, cityTotalsByUF } = useMemo(() => {
    const ufTotals: Record<string, number> = {};
    const city: Record<string, Record<string, number>> = { SP: {}, MG: {}, MS: {} };
    let total = 0;
    for (const r of rows ?? []) {
      total += r.ativos;
      if (r.uf) ufTotals[r.uf] = (ufTotals[r.uf] ?? 0) + r.ativos;
      if (city[r.uf] && r.cidade) city[r.uf][r.cidade] = (city[r.uf][r.cidade] ?? 0) + r.ativos;
    }
    const porUF = ["SP", "MS", "MG"].map((uf) => ({ uf, total: ufTotals[uf] ?? 0 }));
    porUF.push({ uf: "Outros", total: total - porUF.reduce((s, r) => s + r.total, 0) });
    return { total, porUF, ufTotals, cityTotalsByUF: city };
  }, [rows]);

  if (sel) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
            <MapIcon className="h-4 w-4" />{sel === "BRASIL" ? "Mapa do Brasil — Vidas por UF" : `Mapa de ${sel}`}
          </div>
          <button type="button" onClick={() => setSel(null)} className="text-xs text-muted-foreground hover:text-foreground underline">← Voltar</button>
        </div>
        <div className="flex-1 min-h-0">
          {sel === "BRASIL" ? <BrazilHeatMap ufTotals={ufTotals} /> : <StateHeatMap ufs={[sel]} cityTotalsByUF={cityTotalsByUF} stateTotals={ufTotals} />}
        </div>
      </div>
    );
  }

  return (
    <section className="h-full flex flex-col min-h-0 gap-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Ativos em:</span>
        <input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-foreground" />
      </div>
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Carregando…</div>
        ) : error ? (
          <div className="text-destructive text-sm">Erro: {error}</div>
        ) : (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className="flex flex-col justify-center space-y-2">
              <div className="text-lg font-semibold text-foreground tabular-nums mb-1">Beneficiários ativos: {total.toLocaleString("pt-BR")}</div>
              {porUF.map((r) => {
                const max = Math.max(1, ...porUF.map((x) => x.total));
                const share = total > 0 ? (r.total / total) * 100 : 0;
                const outros = r.uf === "Outros";
                return (
                  <button key={r.uf} type="button" onClick={() => setSel(outros ? "BRASIL" : (r.uf as "SP" | "MG" | "MS"))}
                    className="w-full text-left rounded-md p-2 hover:bg-accent/40 transition-colors">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground inline-flex items-center gap-2">
                        {!outros && UF_FLAGS[r.uf] && <img src={UF_FLAGS[r.uf]} alt={`Bandeira ${r.uf}`} className="h-3.5 w-5 object-cover rounded-[2px] border border-border" />}
                        {r.uf}
                      </span>
                      <span><span className="font-semibold text-foreground tabular-nums">{r.total.toLocaleString("pt-BR")}</span>{" "}
                        <span className="text-xs text-muted-foreground tabular-nums">({share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)</span></span>
                    </div>
                    <div className="flex h-2 rounded-full bg-accent overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(r.total / max) * 100}%` }} /></div>
                  </button>
                );
              })}
            </div>
            <div className="w-full h-full flex items-center justify-center">
              <StateHeatMap ufs={["SP", "MG", "MS"]} cityTotalsByUF={cityTotalsByUF} onSelectUF={setSel} stateTotals={ufTotals} outrosTotal={porUF.find((r) => r.uf === "Outros")?.total ?? 0} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CarteiraTrialGeo;
