import { useMemo } from "react";
import { ChevronRight, Search } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import {
  useConsultaState,
  consultaActions,
  type Row,
} from "@/lib/assistencialConsultaStore";

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

export default function AssistencialConsulta() {
  const s = useConsultaState();

  const periodoInput = useMemo(() => {
    const y = s.anoInput.replace(/\D/g, "").slice(0, 4);
    const m = s.mesInput.replace(/\D/g, "").slice(0, 2).padStart(2, "0");
    if (y.length !== 4 || m.length !== 2) return "";
    const mn = Number(m);
    if (mn < 1 || mn > 12) return "";
    return `${y}${m}`;
  }, [s.anoInput, s.mesInput]);

  const filtered = useMemo(() => {
    const q = s.filtro.trim().toLowerCase();
    if (!q) return s.rows;
    return s.rows.filter((r) =>
      [r.dscrdsol, r.dscrdexe, r.dscrdrec]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [s.rows, s.filtro]);

  const { totalCusto, totalVidas, totalGuias } = useMemo(() => {
    const tot = emptyAgg();
    for (const r of filtered) addAgg(tot, r);
    return { totalCusto: tot.custo, totalVidas: tot.vidas.size, totalGuias: tot.guias.size };
  }, [filtered]);

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

      let so = e.sol.get(sol);
      if (!so) {
        so = { sol, agg: emptyAgg(), benefs: new Map() };
        e.sol.set(sol, so);
      }
      addAgg(so.agg, r);

      let b = so.benefs.get(benefKey);
      if (!b) {
        b = { key: benefKey, sample: r, agg: emptyAgg() };
        so.benefs.set(benefKey, b);
      }
      addAgg(b.agg, r);
    }

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
              .map((so) => ({
                sol: so.sol,
                agg: so.agg,
                benefs: Array.from(so.benefs.values()).sort((a, b) => b.agg.custo - a.agg.custo),
              }))
              .sort((a, b) => b.agg.custo - a.agg.custo),
          }))
          .sort((a, b) => b.agg.custo - a.agg.custo),
      }))
      .sort((a, b) => grpOrder(a.grp) - grpOrder(b.grp));
  }, [filtered]);

  const showCurtain = !s.triggered || s.loading || !s.periodo || !s.revealed;
  const readyToReveal = s.triggered && !s.loading && !!s.periodo && !s.revealed;
  const canLoad = !!periodoInput && periodoInput.length === 6 && !s.loading;

  const handleCarregar = () => {
    if (!canLoad) return;
    consultaActions.start();
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Ano</label>
          <input
            type="text"
            value={s.anoInput}
            onChange={(e) => consultaActions.setAnoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCarregar();
            }}
            placeholder="2026"
            className="h-9 w-20 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <label className="text-xs text-muted-foreground">Mês</label>
          <input
            type="text"
            value={s.mesInput}
            onChange={(e) => consultaActions.setMesInput(e.target.value)}
            onBlur={() => consultaActions.padMes()}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCarregar();
            }}
            placeholder="05"
            className="h-9 w-16 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleCarregar}
            disabled={!canLoad}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Carregar
          </button>
        </div>

        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={s.filtro}
            onChange={(e) => consultaActions.setFiltro(e.target.value)}
            placeholder="Filtrar por prestador solicitante, executante ou receptor..."
            className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="text-xs text-muted-foreground flex gap-4">
          <span>{showCurtain ? "" : `${totalVidas.toLocaleString("pt-BR")} vidas`}</span>
          <span>{showCurtain ? "" : `${totalGuias.toLocaleString("pt-BR")} guias`}</span>
          <span>{showCurtain ? "" : `R$ ${fmtBRL(totalCusto)}`}</span>
        </div>
      </div>

      {s.error && <div className="p-4 text-sm text-destructive">Erro ao carregar: {s.error}</div>}

      <div className="flex-1 min-h-0 overflow-auto">
        {showCurtain ? (
          !s.triggered ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <div>Informe o período e clique em <span className="font-medium text-foreground">Carregar</span>.</div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              {!readyToReveal && <FunLoader />}
              <div className="text-xs text-muted-foreground text-center max-w-md">
                {readyToReveal
                  ? "Concluído. Clique em Pronto para abrir o grid."
                  : "Isso pode levar algum tempo. Você pode navegar para outras telas — o carregamento continua em segundo plano."}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm tabular-nums font-medium text-foreground">
                  {Math.floor(s.elapsed / 60).toString().padStart(2, "0")}:
                  {(s.elapsed % 60).toString().padStart(2, "0")}
                </div>
                {readyToReveal && (
                  <button
                    onClick={() => consultaActions.setRevealed(true)}
                    className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    Pronto
                  </button>
                )}
              </div>
            </div>
          )
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
                const gOpen = s.expGrp[g.grp] !== false;
                return (
                  <>
                    <tr key={`g:${g.grp}`} className="border-b border-border bg-accent/30 hover:bg-accent/50 font-semibold">
                      <td className="px-3 py-1.5">
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() =>
                            consultaActions.setExpGrp((p) => ({ ...p, [g.grp]: !(p[g.grp] !== false) }))
                          }
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
                        const eOpen = !!s.expExe[eKey];
                        return (
                          <>
                            <tr key={`e:${eKey}`} className="border-b border-border/50 hover:bg-accent/40 font-medium">
                              <td className="px-3 py-1.5 pl-8">
                                <button
                                  className="inline-flex items-center gap-1"
                                  onClick={() =>
                                    consultaActions.setExpExe((p) => ({ ...p, [eKey]: !p[eKey] }))
                                  }
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
                              e.sol.map((so) => {
                                const sKey = `${eKey}||${so.sol}`;
                                const sOpen = !!s.expSol[sKey];
                                return (
                                  <>
                                    <tr key={`s:${sKey}`} className="border-b border-border/40 hover:bg-accent/30">
                                      <td className="px-3 py-1.5 pl-14">
                                        <button
                                          className="inline-flex items-center gap-1"
                                          onClick={() =>
                                            consultaActions.setExpSol((p) => ({ ...p, [sKey]: !p[sKey] }))
                                          }
                                        >
                                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${sOpen ? "rotate-90" : ""}`} />
                                          <span>{so.sol}</span>
                                        </button>
                                      </td>
                                      <td className="px-3 py-1.5 text-right">{so.agg.vidas.size.toLocaleString("pt-BR")}</td>
                                      <td className="px-3 py-1.5 text-right">{so.agg.guias.size.toLocaleString("pt-BR")}</td>
                                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(so.agg.custo)}</td>
                                    </tr>
                                    {sOpen &&
                                      so.benefs.map((b) => (
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
                    Nenhum registro encontrado para o período {s.periodo}.
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
