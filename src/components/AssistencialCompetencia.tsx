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
const HOSP_PORTUGUESA = "HOSP BENEF PORTUGUESA DE S J RIO PRETO";

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
  const [periodo, setPeriodo] = useState<string>("");
  const [periodoInput, setPeriodoInput] = useState<string>("");
  const [filtro, setFiltro] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expGrp, setExpGrp] = useState<Record<string, boolean>>({});
  const [expExe, setExpExe] = useState<Record<string, boolean>>({});
  const [expSol, setExpSol] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Simple elapsed-time counter while loading (1s tick, cheap). Freezes when loading ends.
  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [loading]);

  // Resolve default period = MAX(bscmp) for idtipfol like Contas Medicas
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await hostinger
        .from("assistencial")
        .select("bscmp")
        .ilike("idtipfol", IDTIPFOL_FILTER)
        .order("bscmp", { ascending: false })
        .limit(1);
      if (!alive) return;
      if (error) {
        setError(error.message);
        return;
      }
      const bs = data?.[0]?.bscmp;
      if (bs != null) {
        const s = String(bs);
        setPeriodo(s);
        setPeriodoInput(s);
      }
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
    setRevealed(false);
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
        let attempt = 0;
        let chunk: Row[] | null = null;
        // retry on timeout with smaller ranges
        while (attempt < 4) {
          const size = Math.max(100, PAGE >> attempt);
          const { data, error } = await hostinger
            .from("assistencial")
            .select("ideAssist,bscmp,nrgui,nmcli,cdregusr,dscrdexe,dscrdsol,dscrdrec,vrevt")
            .eq("bscmp", bs)
            .ilike("idtipfol", IDTIPFOL_FILTER)
            .order("ideAssist", { ascending: true })
            .range(from, from + size - 1);
          if (!alive) return;
          if (!error) {
            chunk = (data ?? []) as Row[];
            if (chunk.length < size) {
              acc.push(...chunk);
              if (alive) {
                setRows(acc);
                setLoading(false);
              }
              return;
            }
            from += size;
            break;
          }
          if (!/timeout/i.test(error.message) || attempt === 3) {
            setError(error.message);
            if (alive) setLoading(false);
            return;
          }
          attempt++;
        }
        if (!chunk) break;
        acc.push(...chunk);
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

  // Hierarchy: grupo0 (HOSP PORTUGUESA | REDE) > dscrdexe > dscrdsol > (nmcli | cdregusr)
  const tree = useMemo(() => {
    type BenefNode = { key: string; sample: Row; agg: Agg };
    type SolNode = { sol: string; agg: Agg; benefs: Map<string, BenefNode> };
    type ExeNode = { exe: string; agg: Agg; sol: Map<string, SolNode> };
    type GrpNode = { grp: string; agg: Agg; exe: Map<string, ExeNode> };

    const grupos = new Map<string, GrpNode>();
    for (const r of filtered) {
      const exe = r.dscrdexe ?? "(sem prestador executante)";
      const grp = exe === HOSP_PORTUGUESA ? HOSP_PORTUGUESA : "REDE";
      const sol = r.dscrdsol ?? "(sem prestador solicitante)";
      const benefKey = `${r.nmcli ?? "-"}|${r.cdregusr ?? ""}`;

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
        s = { sol, agg: emptyAgg(), benefs: new Map() };
        e.sol.set(sol, s);
      }
      addAgg(s.agg, r);

      let b = s.benefs.get(benefKey);
      if (!b) {
        b = { key: benefKey, sample: r, agg: emptyAgg() };
        s.benefs.set(benefKey, b);
      }
      addAgg(b.agg, r);
    }

    // Materialize + order (HOSP PORTUGUESA first, then REDE)
    const grpOrder = (k: string) => (k === HOSP_PORTUGUESA ? 0 : 1);
    return Array.from(grupos.values())
      .map((g) => ({
        grp: g.grp,
        agg: g.agg,
        exe: Array.from(g.exe.values())
          .map((e) => ({
            exe: e.exe,
            agg: e.agg,
            sol: Array.from(e.sol.values())
              .map((s) => ({
                sol: s.sol,
                agg: s.agg,
                benefs: Array.from(s.benefs.values()).sort((a, b) => b.agg.custo - a.agg.custo),
              }))
              .sort((a, b) => b.agg.custo - a.agg.custo),
          }))
          .sort((a, b) => b.agg.custo - a.agg.custo),
      }))
      .sort((a, b) => grpOrder(a.grp) - grpOrder(b.grp));
  }, [filtered]);

  const showCurtain = loading || !periodo;

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
          <span>{showCurtain ? "Carregando..." : `${totalVidas.toLocaleString("pt-BR")} vidas`}</span>
          <span>{showCurtain ? "" : `${totalGuias.toLocaleString("pt-BR")} guias`}</span>
          <span>{showCurtain ? "" : `R$ ${fmtBRL(totalCusto)}`}</span>
        </div>
      </div>

      {error && <div className="p-4 text-sm text-destructive">Erro ao carregar: {error}</div>}

      <div className="flex-1 min-h-0 overflow-auto">
        {showCurtain ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <FunLoader />
            <div className="text-xs text-muted-foreground">
              Isso pode levar algum tempo... por favor, aguarde.
            </div>
            <div className="text-xs tabular-nums text-muted-foreground">
              {Math.floor(elapsed / 60).toString().padStart(2, "0")}:
              {(elapsed % 60).toString().padStart(2, "0")}
            </div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Grupo / Prestador Executante / Solicitante / Beneficiário</th>
                <th className="px-3 py-2 text-right">Vidas</th>
                <th className="px-3 py-2 text-right">Guias</th>
                <th className="px-3 py-2 text-right">R$ Custo</th>
              </tr>
            </thead>
            <tbody>
              {tree.map((g) => {
                const gOpen = expGrp[g.grp] !== false; // default open
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
                      <td className="px-3 py-1.5 text-right">{g.agg.vidas.size.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-1.5 text-right">{g.agg.guias.size.toLocaleString("pt-BR")}</td>
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
                              <td className="px-3 py-1.5 text-right">{e.agg.vidas.size.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-right">{e.agg.guias.size.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(e.agg.custo)}</td>
                            </tr>
                            {eOpen &&
                              e.sol.map((s) => {
                                const sKey = `${eKey}||${s.sol}`;
                                const sOpen = !!expSol[sKey];
                                return (
                                  <>
                                    <tr key={`s:${sKey}`} className="border-b border-border/40 hover:bg-accent/30">
                                      <td className="px-3 py-1.5 pl-14">
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
                                          <td className="px-3 py-1.5 pl-20">
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
