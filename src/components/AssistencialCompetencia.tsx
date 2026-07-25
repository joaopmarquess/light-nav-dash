import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { ChevronRight, Search } from "lucide-react";
import FunLoader from "@/components/FunLoader";

type Row = {
  ideAssist: number;
  bscmp: number | null;
  nrgui: string | number | null;
  nmcli: string | null;
  cdregusr: string | number | null;
  dscrdexe: string | null;
  dscrdsol: string | null;
  dscrdrec: string | null;
  vrevt: number | string | null;
};

const PAGE = 500;
const IDTIPFOL_FILTER = "%conta%m%dica%"; // matches "Contas Medicas" / "Contas Médicas"

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Agg = {
  vidas: Set<string>;
  guias: Set<string>;
  custo: number;
};
const emptyAgg = (): Agg => ({ vidas: new Set(), guias: new Set(), custo: 0 });
const addAgg = (a: Agg, r: Row) => {
  if (r.nmcli) a.vidas.add(r.nmcli);
  if (r.nrgui != null) a.guias.add(String(r.nrgui));
  a.custo += Number(r.vrevt ?? 0);
};

export default function AssistencialCompetencia() {
  const [periodo, setPeriodo] = useState<string>(currentPeriod());
  const [periodoInput, setPeriodoInput] = useState<string>(currentPeriod());
  const [filtro, setFiltro] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [expExe, setExpExe] = useState<Record<string, boolean>>({});
  const [expSol, setExpSol] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setRows([]);
    setReachedEnd(false);
    (async () => {
      const bs = Number(periodo);
      if (!Number.isFinite(bs)) {
        setLoading(false);
        return;
      }
      let from = 0;
      const acc: Row[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await hostinger
          .from("assistencial")
          .select("ideAssist,bscmp,nrgui,nmcli,cdregusr,dscrdexe,dscrdsol,dscrdrec,vrevt")
          .eq("bscmp", bs)
          .order("ideAssist", { ascending: true })
          .range(from, from + PAGE - 1);
        if (!alive) return;
        if (error) {
          setError(error.message);
          break;
        }
        const chunk = (data ?? []) as Row[];
        acc.push(...chunk);
        setRows([...acc]);
        if (chunk.length < PAGE) {
          setReachedEnd(true);
          break;
        }
        from += PAGE;
        if (from > 200000) break;
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [periodo]);

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.dscrdsol, r.dscrdexe, r.dscrdrec]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, filtro]);

  const { totalCusto, totalVidas, totalGuias } = useMemo(() => {
    const tot = emptyAgg();
    for (const r of filtered) addAgg(tot, r);
    return { totalCusto: tot.custo, totalVidas: tot.vidas.size, totalGuias: tot.guias.size };
  }, [filtered]);

  // Hierarchy: dscrdexe > dscrdsol > (nmcli | cdregusr)
  const tree = useMemo(() => {
    const byExe = new Map<string, { agg: Agg; sol: Map<string, { agg: Agg; benefs: Map<string, { agg: Agg; sample: Row }> }> }>();
    for (const r of filtered) {
      const exe = r.dscrdexe ?? "(sem prestador executante)";
      const sol = r.dscrdsol ?? "(sem prestador solicitante)";
      const benefKey = `${r.nmcli ?? "-"}|${r.cdregusr ?? ""}`;
      let e = byExe.get(exe);
      if (!e) {
        e = { agg: emptyAgg(), sol: new Map() };
        byExe.set(exe, e);
      }
      addAgg(e.agg, r);
      let s = e.sol.get(sol);
      if (!s) {
        s = { agg: emptyAgg(), benefs: new Map() };
        e.sol.set(sol, s);
      }
      addAgg(s.agg, r);
      let b = s.benefs.get(benefKey);
      if (!b) {
        b = { agg: emptyAgg(), sample: r };
        s.benefs.set(benefKey, b);
      }
      addAgg(b.agg, r);
    }
    return Array.from(byExe.entries())
      .map(([k, v]) => ({
        exe: k,
        agg: v.agg,
        sol: Array.from(v.sol.entries())
          .map(([sk, sv]) => ({
            sol: sk,
            agg: sv.agg,
            benefs: Array.from(sv.benefs.entries())
              .map(([bk, bv]) => ({ key: bk, sample: bv.sample, agg: bv.agg }))
              .sort((a, b) => b.agg.custo - a.agg.custo),
          }))
          .sort((a, b) => b.agg.custo - a.agg.custo),
      }))
      .sort((a, b) => b.agg.custo - a.agg.custo);
  }, [filtered]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Período (AAAAMM)</label>
          <input
            type="text"
            value={periodoInput}
            onChange={(e) => setPeriodoInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onBlur={() => periodoInput.length === 6 && setPeriodo(periodoInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && periodoInput.length === 6) setPeriodo(periodoInput);
            }}
            placeholder="202606"
            className="h-9 w-28 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por prestador solicitante, executante ou receptor..."
            className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="text-xs text-muted-foreground flex gap-4">
          <span>{loading ? "Carregando..." : `${totalVidas.toLocaleString("pt-BR")} vidas`}</span>
          <span>{totalGuias.toLocaleString("pt-BR")} guias</span>
          <span>R$ {fmtBRL(totalCusto)}</span>
          {!loading && !reachedEnd && rows.length > 0 && <span>(parcial)</span>}
        </div>
      </div>

      {error && <div className="p-4 text-sm text-destructive">Erro ao carregar: {error}</div>}

      <div className="flex-1 min-h-0 overflow-auto">
        {loading && rows.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <FunLoader />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Prestador Executante / Solicitante / Beneficiário</th>
                <th className="px-3 py-2 text-right">Vidas</th>
                <th className="px-3 py-2 text-right">Guias</th>
                <th className="px-3 py-2 text-right">R$ Custo</th>
              </tr>
            </thead>
            <tbody>
              {tree.map((e) => {
                const eOpen = !!expExe[e.exe];
                return (
                  <>
                    <tr key={`e:${e.exe}`} className="border-b border-border/50 hover:bg-accent/40 font-medium">
                      <td className="px-3 py-1.5">
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => setExpExe((p) => ({ ...p, [e.exe]: !p[e.exe] }))}
                        >
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${eOpen ? "rotate-90" : ""}`} />
                          <span>{e.exe}</span>
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-right">{e.agg.vidas.size.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-1.5 text-right">{e.agg.guias.size.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(e.agg.custo)}</td>
                    </tr>
                    {eOpen &&
                      e.sol.map((s) => {
                        const sKey = `${e.exe}||${s.sol}`;
                        const sOpen = !!expSol[sKey];
                        return (
                          <>
                            <tr key={`s:${sKey}`} className="border-b border-border/40 hover:bg-accent/30">
                              <td className="px-3 py-1.5 pl-8">
                                <button
                                  className="inline-flex items-center gap-1"
                                  onClick={() => setExpSol((p) => ({ ...p, [sKey]: !p[sKey] }))}
                                >
                                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${sOpen ? "rotate-90" : ""}`} />
                                  <span>{s.sol}</span>
                                </button>
                              </td>
                              <td className="px-3 py-1.5 text-right">{s.agg.vidas.size.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-right">{s.agg.guias.size.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(s.agg.custo)}</td>
                            </tr>
                            {sOpen &&
                              s.benefs.map((b) => (
                                <tr key={`b:${sKey}||${b.key}`} className="border-b border-border/30 hover:bg-accent/20 text-muted-foreground">
                                  <td className="px-3 py-1.5 pl-14">
                                    {b.sample.nmcli ?? "-"} {b.sample.cdregusr ? `(${b.sample.cdregusr})` : ""}
                                  </td>
                                  <td className="px-3 py-1.5 text-right">{b.agg.vidas.size.toLocaleString("pt-BR")}</td>
                                  <td className="px-3 py-1.5 text-right">{b.agg.guias.size.toLocaleString("pt-BR")}</td>
                                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(b.agg.custo)}</td>
                                </tr>
                              ))}
                          </>
                        );
                      })}
                  </>
                );
              })}
              {!loading && tree.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum registro encontrado para o período {periodo}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
