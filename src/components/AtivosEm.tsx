import { useEffect, useState } from "react";
import { Loader2, Map as MapIcon } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";
import { BrazilHeatMap } from "@/components/BrazilHeatMap";
import { StateHeatMap } from "@/components/StateHeatMap";
import { UF_FLAGS } from "@/components/DWCarteira";

interface Props {
  dateValue: string;
}

const toISO = (s: string): string | null => {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
};

const AtivosEm = ({ dateValue }: Props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ativos, setAtivos] = useState<number | null>(null);
  const [porUF, setPorUF] = useState<{ uf: string; total: number }[]>([]);
  const [ufTotals, setUfTotals] = useState<Record<string, number>>({});
  const [cityTotalsByUF, setCityTotalsByUF] = useState<Record<string, Record<string, number>>>({});
  const [mapSelection, setMapSelection] = useState<"SP" | "MG" | "MS" | "BRASIL" | null>(null);

  useEffect(() => {
    if (!dateValue) return;
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      setAtivos(null);
      setPorUF([]);
      setUfTotals({});
      setCityTotalsByUF({});
      try {
        const ref = toISO(dateValue);
        if (!ref) throw new Error(`Data de referência inválida: ${dateValue}`);

        const UF_KEYS = ["SP", "MS", "MG", "Outros"] as const;
        const perUF = new Map<string, number>(UF_KEYS.map((u) => [u, 0]));
        const perUFAll = new Map<string, number>();
        const perCityByUF: Record<string, Map<string, number>> = {
          SP: new Map(),
          MG: new Map(),
          MS: new Map(),
        };

        const pageSize = 1000;
        let from = 0;
        let totalRows = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data, error } = await dw
            .from("sv_ecarteira_ativos")
            .select('"UF_CIDADE_OFICIAL","CIDADE_OFICIAL"')
            .lte("DATA_INICIO_ATIVO", ref)
            .gte("DATA_FIM_ATIVO", ref)
            .range(from, from + pageSize - 1);
          if (error) throw error;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const chunk = (data ?? []) as any[];
          totalRows += chunk.length;
          for (const r of chunk) {
            const uf = String(r.UF_CIDADE_OFICIAL ?? "").trim().toUpperCase();
            const key = (["SP", "MS", "MG"] as const).includes(uf as never) ? uf : "Outros";
            perUF.set(key, (perUF.get(key) ?? 0) + 1);
            if (uf) perUFAll.set(uf, (perUFAll.get(uf) ?? 0) + 1);
            if (perCityByUF[uf] && r.CIDADE_OFICIAL) {
              const city = String(r.CIDADE_OFICIAL);
              perCityByUF[uf].set(city, (perCityByUF[uf].get(city) ?? 0) + 1);
            }
          }
          if (chunk.length < pageSize) break;
          from += pageSize;
        }
        if (abort) return;

        setAtivos(totalRows);
        setPorUF(UF_KEYS.map((u) => ({ uf: u, total: perUF.get(u) ?? 0 })));
        setUfTotals(Object.fromEntries(perUFAll));
        setCityTotalsByUF({
          SP: Object.fromEntries(perCityByUF.SP),
          MG: Object.fromEntries(perCityByUF.MG),
          MS: Object.fromEntries(perCityByUF.MS),
        });
        setLoading(false);
      } catch (e: any) {
        if (!abort) {
          setError(e?.message ?? String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      abort = true;
    };
  }, [dateValue]);

  const fmtInt = (n: number) => n.toLocaleString("pt-BR");

  if (mapSelection) {
    const isBrasil = mapSelection === "BRASIL";
    const title = isBrasil
      ? "Mapa do Brasil — Vidas por UF"
      : `Mapa de ${mapSelection}`;
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
            <MapIcon className="h-4 w-4" />
            {title}
          </div>
          <button
            type="button"
            onClick={() => setMapSelection(null)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            ← Voltar
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {isBrasil ? (
            <BrazilHeatMap ufTotals={ufTotals} />
          ) : (
            <StateHeatMap
              ufs={[mapSelection] as ("SP" | "MG" | "MS")[]}
              cityTotalsByUF={cityTotalsByUF}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="h-full flex flex-col min-h-0 relative">
      {/* Total discreto no canto superior esquerdo, sem container */}
      <div className="absolute top-2 left-4 z-10 text-xl font-semibold text-foreground tabular-nums">
        Beneficiários ativos:{" "}
        <span>{ativos !== null ? fmtInt(ativos) : "—"}</span>
      </div>

      {/* Main container — fills to bottom, no scroll */}
      <div className="flex-1 min-h-0 p-4 pt-12">

        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Carregando…
          </div>
        ) : error ? (
          <div className="text-destructive text-sm">Erro: {error}</div>
        ) : (
          <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className="flex flex-col justify-center space-y-2">
              {(() => {
                const totalAll = porUF.reduce((s, r) => s + r.total, 0);
                const max = Math.max(1, ...porUF.map((r) => r.total));
                return porUF.map((r) => {
                  const share = totalAll > 0 ? (r.total / totalAll) * 100 : 0;
                  const pct = (r.total / max) * 100;
                  const isOutros = r.uf === "Outros";
                  return (
                    <button
                      key={r.uf}
                      type="button"
                      onClick={() =>
                        setMapSelection(isOutros ? "BRASIL" : (r.uf as "SP" | "MG" | "MS"))
                      }
                      className="w-full text-left rounded-md p-2 hover:bg-accent/40 transition-colors cursor-pointer"
                      title={isOutros ? "Ver mapa do Brasil" : `Ver mapa de ${r.uf}`}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground inline-flex items-center gap-2">
                          {!isOutros && UF_FLAGS[r.uf] && (
                            <img
                              src={UF_FLAGS[r.uf]}
                              alt={`Bandeira ${r.uf}`}
                              className="h-3.5 w-5 object-cover rounded-[2px] border border-border"
                              loading="lazy"
                            />
                          )}
                          {r.uf}
                        </span>
                        <span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {r.total.toLocaleString("pt-BR")}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground tabular-nums">
                            ({share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)
                          </span>
                        </span>
                      </div>
                      <div className="flex h-2 rounded-full bg-accent overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
            <div className="w-full h-full flex items-center justify-center">
              <StateHeatMap
                ufs={["SP", "MG", "MS"]}
                cityTotalsByUF={cityTotalsByUF}
                onSelectUF={setMapSelection}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AtivosEm;
