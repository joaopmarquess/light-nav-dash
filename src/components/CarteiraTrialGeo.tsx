import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, Map as MapIcon, Scissors, Search } from "lucide-react";
import { geographicToday, useCarteiraTrialGeo } from "@/hooks/useCarteiraTrialGeo";
import { BrazilHeatMap } from "@/components/BrazilHeatMap";
import { StateHeatMap } from "@/components/StateHeatMap";
import { UF_FLAGS } from "@/components/DWCarteira";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CarteiraTrialGeo = ({ embedded = false, mapOnly = false, selectedDate, onDateChange, toolbarTarget }: { embedded?: boolean; mapOnly?: boolean; selectedDate?: string; onDateChange?: (date: string) => void; toolbarTarget?: HTMLElement | null }) => {
  const [localDate, setLocalDate] = useState(geographicToday);
  const data = selectedDate ?? localDate;
  const setData = onDateChange ?? setLocalDate;
  const { data: rows, isLoading: loading, error: queryError } = useCarteiraTrialGeo(data);
  const error = queryError?.message;
  const [sel, setSel] = useState<"SP" | "MG" | "MS" | "GO" | "BRASIL" | "CENTRO" | null>(null);
  const [showMAA, setShowMAA] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);

  const { total, porUF, ufTotals, cityTotalsByUF } = useMemo(() => {
    const ufTotals: Record<string, number> = {};
    const city: Record<string, Record<string, number>> = { SP: {}, MG: {}, MS: {}, GO: {} };
    let total = 0;
    for (const r of rows ?? []) {
      total += r.ativos;
      if (r.uf) ufTotals[r.uf] = (ufTotals[r.uf] ?? 0) + r.ativos;
      if (city[r.uf] && r.cidade) city[r.uf][r.cidade] = (city[r.uf][r.cidade] ?? 0) + r.ativos;
    }
    const porUF = ["SP", "MS", "MG", "GO"].map((uf) => ({ uf, total: ufTotals[uf] ?? 0 }));
    porUF.push({ uf: "Outros", total: total - porUF.reduce((s, r) => s + r.total, 0) });
    return { total, porUF, ufTotals, cityTotalsByUF: city };
  }, [rows]);

  if (sel && sel !== "CENTRO") {
    return (
      <div className={embedded ? "h-full min-h-[400px] bg-background flex flex-col" : "fixed inset-0 z-50 bg-background flex flex-col"}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
            <MapIcon className="h-4 w-4" />{sel === "BRASIL" ? "Mapa do Brasil — Vidas por UF" : `Mapa de ${sel}`}
          </div>
          <Button variant="outline" size="sm" onClick={() => setSel(null)}><ArrowLeft />Voltar</Button>
        </div>
        <div className="flex-1 min-h-0">
          {sel === "BRASIL" ? <BrazilHeatMap ufTotals={ufTotals} /> : <StateHeatMap trialScale ufs={[sel]} cityTotalsByUF={cityTotalsByUF} stateTotals={ufTotals} />}
        </div>
      </div>
    );
  }

  const dateControls = <div className={toolbarTarget ? "flex flex-wrap items-center gap-4" : "flex flex-wrap items-center justify-between gap-4 bg-card rounded-xl border border-border shadow-sm px-6 py-4"}>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ativos em:</span>
          <input type="date" aria-label="Ativos em" value={data} onChange={(e) => e.target.value && setData(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-foreground" />
        </div>
        {!loading && !error && (
          <div className={`${toolbarTarget ? "text-xl" : "text-3xl"} font-bold text-foreground tabular-nums`}>{total.toLocaleString("pt-BR")} vidas</div>
        )}
      </div>;
  const mapControls = <div className="flex shrink-0 items-center gap-2">
    <Button type="button" variant="outline" size="icon" title="Mapa Área Atuação (MAA)" aria-label="Mapa Área Atuação (MAA)" onClick={() => setSel("CENTRO")} className="h-12 w-12 [&_svg]:size-6"><Search /></Button>
    <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild>
      <Button type="button" variant={showMAA ? "secondary" : "outline"} size="icon" aria-label={showMAA ? "Ocultar MAA" : "Mostrar MAA"} aria-pressed={showMAA} onClick={() => setShowMAA((visible) => !visible)} className="h-12 w-12 [&_svg]:size-6">{showMAA ? <Eye /> : <EyeOff />}</Button>
    </TooltipTrigger><TooltipContent>{showMAA ? "Ocultar MAA" : "Mostrar MAA"}</TooltipContent></Tooltip></TooltipProvider>
    <Button type="button" variant="outline" size="icon" title="Área de atuação recortada" aria-label="Área de atuação recortada" onClick={() => setCropOpen(true)} className="h-12 w-12 [&_svg]:size-6"><Scissors /></Button>
  </div>;

  return (
    <section className="h-full flex flex-col min-h-0 gap-4">
      {toolbarTarget ? createPortal(<>{dateControls}{sel !== "CENTRO" && mapControls}</>, toolbarTarget) : dateControls}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Carregando…</div>
        ) : error ? (
          <div className="text-destructive text-sm">Erro: {error}</div>
        ) : sel === "CENTRO" ? (
          <div className="h-full bg-card rounded-xl border border-border shadow-sm p-2 flex flex-col min-h-0">
            <div className="flex items-center gap-3 px-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSel(null)} className="h-12 shrink-0 gap-2 px-3 [&_svg]:size-6">
                <ArrowLeft />Voltar
              </Button>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mapa Área Atuação (MAA)</h3>
            </div>
            <div className="flex-1 min-h-0 w-full pt-2">
              <StateHeatMap trialScale core ufs={["SP", "MG", "MS", "GO"]} cityTotalsByUF={cityTotalsByUF} />
            </div>
          </div>
        ) : (
          <div className={`h-full grid grid-cols-1 ${mapOnly ? "" : "md:grid-cols-[2fr_3fr]"} gap-4 items-stretch`}>
            {!mapOnly && <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col justify-center gap-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Vidas por estado</h3>
              {porUF.map((r) => {
                const max = Math.max(1, ...porUF.map((x) => x.total));
                const share = total > 0 ? (r.total / total) * 100 : 0;
                const outros = r.uf === "Outros";
                return (
                  <button key={r.uf} type="button" onClick={() => setSel(outros ? "BRASIL" : (r.uf as "SP" | "MG" | "MS" | "GO"))}
                    className="w-full text-left rounded-md p-3 hover:bg-accent/40 transition-colors">
                    <div className="flex justify-between text-base mb-2">
                      <span className="text-foreground inline-flex items-center gap-2">
                        {!outros && UF_FLAGS[r.uf] && <img src={UF_FLAGS[r.uf]} alt={`Bandeira ${r.uf}`} className="h-4 w-6 object-cover rounded-[2px] border border-border" />}
                        {r.uf}
                      </span>
                      <span><span className="font-semibold text-foreground tabular-nums">{r.total.toLocaleString("pt-BR")}</span>{" "}
                        <span className="text-xs text-muted-foreground tabular-nums">({share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)</span></span>
                    </div>
                    <div className="flex h-2.5 rounded-full bg-accent overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(r.total / max) * 100}%` }} /></div>
                  </button>
                );
              })}
            </div>}
            <div className="bg-card rounded-xl border border-border shadow-sm p-2 flex flex-col min-h-0">
              {!toolbarTarget && <div className="flex items-center gap-3 px-2 pt-2">
                {mapControls}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mapa por cidade</h3>
              </div>}
              <div className="flex-1 min-h-0 h-full w-full">
                <StateHeatMap trialScale outlineOnly={showMAA} showOverview={false} ufs={["SP", "MG", "MS", "GO"]} cityTotalsByUF={cityTotalsByUF} onSelectUF={setSel} stateTotals={ufTotals} outrosTotal={porUF.find((r) => r.uf === "Outros")?.total ?? 0} />
              </div>
            </div>
          </div>
        )}
      </div>
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="flex h-[92vh] w-[95vw] max-w-none flex-col p-4">
          <DialogTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Área de atuação recortada</DialogTitle>
          <div className="min-h-0 flex-1">
            {cropOpen && <StateHeatMap trialScale crop showOverview={false} ufs={["SP", "MG", "MS", "GO"]} cityTotalsByUF={cityTotalsByUF} />}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default CarteiraTrialGeo;
