import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { ChevronRight, Search } from "lucide-react";

type Row = {
  bscmp: number | null;
  dscrdexe: string | null;
  dscrdsol: string | null;
  vidas: number | string | null;
  guias: number | string | null;
  custo: number | string | null;
};

const PAGE = 1000;
const HOSP_PORTUGUESA = "HOSP BENEF PORTUGUESA DE S J RIO PRETO";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Agg = { vidas: number; guias: number; custo: number };
const emptyAgg = (): Agg => ({ vidas: 0, guias: 0, custo: 0 });
const addAgg = (a: Agg, r: Row) => {
  a.vidas += Number(r.vidas ?? 0);
  a.guias += Number(r.guias ?? 0);
  a.custo += Number(r.custo ?? 0);
};

type SortKey = "name" | "vidas" | "guias" | "custo";
type SortDir = "asc" | "desc";

export default function AssistencialCompetencia() {
  const [periodo, setPeriodo] = useState<string>("");
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [filtro, setFiltro] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expGrp, setExpGrp] = useState<Record<string, boolean>>({});
  const [expExe, setExpExe] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("custo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "name" ? "asc" : "desc");
    }
  };
  const sortIndicator = (k: SortKey) => (sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : "");


  // Load distinct bscmp periods; default = MAX (paginado para contornar limite do PostgREST)
  useEffect(() => {
    let alive = true;
    (async () => {
      const uniqSet = new Set<string>();
      const CHUNK = 1000;
      let from = 0;
      // paginação em chunks até esgotar
      for (let i = 0; i < 200; i++) {
        const { data, error } = await hostinger
          .from("assistencial_003_competencia")
          .select("bscmp")
          .order("bscmp", { ascending: false })
          .range(from, from + CHUNK - 1);
        if (!alive) return;
        if (error) {
          setError(error.message);
          return;
        }
        const rows = data ?? [];
        for (const d of rows as any[]) {
          if (d.bscmp != null) uniqSet.add(String(d.bscmp));
        }
        if (rows.length < CHUNK) break;
        from += CHUNK;
      }
      const uniq = Array.from(uniqSet).sort((a, b) => Number(b) - Number(a));
      setPeriodos(uniq);
      if (uniq[0]) setPeriodo(uniq[0]);
    })();
    return () => {
      alive = false;
    };
  }, []);


  useEffect(() => {
    if (!periodo) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setRows([]);
    
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
          .from("assistencial_003_competencia")
          .select("bscmp,dscrdexe,dscrdsol,vidas,guias,custo")
          .eq("bscmp", bs)
          .range(from, from + PAGE - 1);
        if (!alive) return;
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        const chunk = (data ?? []) as Row[];
        acc.push(...chunk);
        if (chunk.length < PAGE) break;
        from += PAGE;
        if (from > 500000) break;
      }
      if (alive) {
        setRows(acc);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [periodo]);

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.dscrdsol, r.dscrdexe]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, filtro]);

  const { totalCusto, totalVidas, totalGuias } = useMemo(() => {
    const tot = emptyAgg();
    for (const r of filtered) addAgg(tot, r);
    return { totalCusto: tot.custo, totalVidas: tot.vidas, totalGuias: tot.guias };
  }, [filtered]);

  // Hierarchy: grupo0 (HOSP PORTUGUESA | REDE) > dscrdexe > dscrdsol
  const tree = useMemo(() => {
    type SolNode = { sol: string; agg: Agg };
    type ExeNode = { exe: string; agg: Agg; sol: Map<string, SolNode> };
    type GrpNode = { grp: string; agg: Agg; exe: Map<string, ExeNode> };

    const grupos = new Map<string, GrpNode>();
    for (const r of filtered) {
      const exe = r.dscrdexe ?? "(sem prestador executante)";
      const grp = exe === HOSP_PORTUGUESA ? HOSP_PORTUGUESA : "REDE";
      const sol = r.dscrdsol ?? "(sem prestador solicitante)";

      let g = grupos.get(grp);
      if (!g) {
        g = { grp, agg: emptyAgg(), exe: new Map() };
        grupos.set(grp, g);
      }
      addAgg(g.agg, r);

      let e = g.exe.get(exe);
      if (!e) {
        e = { exe, agg: emptyAgg(), sol: new Map() };
        g.exe.set(exe, e);
      }
      addAgg(e.agg, r);

      let s = e.sol.get(sol);
      if (!s) {
        s = { sol, agg: emptyAgg() };
        e.sol.set(sol, s);
      }
      addAgg(s.agg, r);
    }

    const grpOrder = (k: string) => (k === HOSP_PORTUGUESA ? 0 : 1);
    const cmpSol = (a: SolNode, b: SolNode) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.sol.localeCompare(b.sol, "pt-BR") * mul;
      return (a.agg[sortKey] - b.agg[sortKey]) * mul;
    };
    return Array.from(grupos.values())
      .map((g) => ({
        grp: g.grp,
        agg: g.agg,
        exe: Array.from(g.exe.values())
          .map((e) => ({
            exe: e.exe,
            agg: e.agg,
            sol: Array.from(e.sol.values()).sort(cmpSol),
          }))
          .sort((a, b) => b.agg.custo - a.agg.custo),
      }))
      .sort((a, b) => grpOrder(a.grp) - grpOrder(b.grp));
  }, [filtered, sortKey, sortDir]);


  const showCurtain = loading || !periodo;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Período</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="h-9 w-32 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {periodos.length === 0 && <option value="">—</option>}
            {periodos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por prestador executante ou solicitante..."
            className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>


      {error && <div className="p-4 text-sm text-destructive">Erro ao carregar: {error}</div>}

      <div className="flex-1 min-h-0 overflow-auto">
        {showCurtain ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">
                  <button className="hover:text-foreground" onClick={() => toggleSort("name")}>
                    Prestador{sortIndicator("name")}
                  </button>
                </th>
                <th className="px-3 py-2 text-right">
                  <button className="hover:text-foreground" onClick={() => toggleSort("vidas")}>
                    Vidas{sortIndicator("vidas")}
                  </button>
                </th>
                <th className="px-3 py-2 text-right">
                  <button className="hover:text-foreground" onClick={() => toggleSort("guias")}>
                    Guias{sortIndicator("guias")}
                  </button>
                </th>
                <th className="px-3 py-2 text-right">
                  <button className="hover:text-foreground" onClick={() => toggleSort("custo")}>
                    R$ Custo{sortIndicator("custo")}
                  </button>
                </th>

              </tr>
              <tr className="text-xs font-semibold bg-accent/50 border-b border-border">
                <td className="px-3 py-1.5">Total</td>
                <td className="px-3 py-1.5 text-right">{totalVidas.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-1.5 text-right">{totalGuias.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(totalCusto)}</td>
              </tr>
            </thead>

            <tbody>
              {tree.map((g) => {
                const gOpen = expGrp[g.grp] !== false;
                return (
                  <>
                    <tr key={`g:${g.grp}`} className="border-b border-border bg-accent/30 hover:bg-accent/50 font-semibold">
                      <td className="px-3 py-1.5">
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => setExpGrp((p) => ({ ...p, [g.grp]: !(p[g.grp] !== false) }))}
                        >
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${gOpen ? "rotate-90" : ""}`} />
                          <span>{g.grp}</span>
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-right">{g.agg.vidas.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-1.5 text-right">{g.agg.guias.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(g.agg.custo)}</td>
                    </tr>
                    {gOpen &&
                      g.exe.map((e) => {
                        const eKey = `${g.grp}||${e.exe}`;
                        const eOpen = !!expExe[eKey];
                        return (
                          <>
                            <tr key={`e:${eKey}`} className="border-b border-border/50 hover:bg-accent/40 font-medium">
                              <td className="px-3 py-1.5 pl-8">
                                <button
                                  className="inline-flex items-center gap-1"
                                  onClick={() => setExpExe((p) => ({ ...p, [eKey]: !p[eKey] }))}
                                >
                                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${eOpen ? "rotate-90" : ""}`} />
                                  <span>{e.exe}</span>
                                </button>
                              </td>
                              <td className="px-3 py-1.5 text-right">{e.agg.vidas.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-right">{e.agg.guias.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(e.agg.custo)}</td>
                            </tr>
                            {eOpen &&
                              e.sol.map((s) => (
                                <tr key={`s:${eKey}||${s.sol}`} className="border-b border-border/40 hover:bg-accent/30 text-muted-foreground">
                                  <td className="px-3 py-1.5 pl-14">{s.sol}</td>
                                  <td className="px-3 py-1.5 text-right">{s.agg.vidas.toLocaleString("pt-BR")}</td>
                                  <td className="px-3 py-1.5 text-right">{s.agg.guias.toLocaleString("pt-BR")}</td>
                                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(s.agg.custo)}</td>
                                </tr>
                              ))}
                          </>
                        );
                      })}
                  </>
                );
              })}
              {tree.length === 0 && (
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
