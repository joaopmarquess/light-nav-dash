import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  cicloOf,
  fetchISinRows,
  fetchMabasBounds,
  fmtCiclo,
} from "@/lib/isinistralidadeData";

export type PeriodoTotal = {
  periodo: string;
  vidas: number;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
  sin: number;
};

export type GrupoTotal = {
  GRUPO: string;
  vidas: number;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
  sin: number;
};

export type SinGraficosData = {
  loading: boolean;
  totals: PeriodoTotal[];
  gruposTop: GrupoTotal[];
  desp: { name: string; value: number }[];
};

/**
 * Fonte: public.isinistralidade. PERIODO é derivado de `mabas`
 * em ciclos móveis de 12 meses (jul→jun), igual ao submenu APB.
 * Carrega os últimos 24 meses disponíveis (2 ciclos completos).
 */
export function useSinistralidadeGraficosData(): SinGraficosData {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<PeriodoTotal[]>([]);
  const [gruposTop, setGruposTop] = useState<GrupoTotal[]>([]);
  const [desp, setDesp] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const bounds = await fetchMabasBounds();
      if (!bounds) {
        if (alive) setLoading(false);
        return;
      }
      const mFim = bounds.max;
      const wanted = addMonths(mFim, -23);
      const mIni = Number(wanted) < Number(bounds.min) ? bounds.min : wanted;

      const rows = await fetchISinRows(mIni, mFim);
      if (!alive) return;

      type Acc = {
        rec: number;
        desp: number;
        codigos: Set<string>;
      };
      const perPeriodo = new Map<string, Acc>();
      const perGrupo = new Map<string, Acc>();
      const perPeriodoGrupo = new Map<string, Map<string, Acc>>();
      const composicao = {
        Internacao: 0,
        Terapia: 0,
        Exame: 0,
        Consulta: 0,
        Emergencia: 0,
        Demais: 0,
      };

      const touch = (m: Map<string, Acc>, k: string): Acc => {
        let a = m.get(k);
        if (!a) {
          a = { rec: 0, desp: 0, codigos: new Set<string>() };
          m.set(k, a);
        }
        return a;
      };

      let latestCiclo = "";
      for (const r of rows) {
        if (!r.mabas) continue;
        const ciclo = cicloOf(r.mabas);
        if (ciclo > latestCiclo) latestCiclo = ciclo;
      }

      for (const r of rows) {
        if (!r.mabas) continue;
        const ciclo = cicloOf(r.mabas);
        const periodo = fmtCiclo(ciclo);
        const id = r.codigo || r.nmcli;

        const p = touch(perPeriodo, periodo);
        p.rec += r.rec_total;
        p.desp += r.vrdespesas;
        if (id) p.codigos.add(id);

        const g = touch(perGrupo, r.GRUPO);
        g.rec += r.rec_total;
        g.desp += r.vrdespesas;
        if (id) g.codigos.add(id);

        let inner = perPeriodoGrupo.get(periodo);
        if (!inner) {
          inner = new Map();
          perPeriodoGrupo.set(periodo, inner);
        }
        const pg = touch(inner, r.GRUPO);
        pg.rec += r.rec_total;
        pg.desp += r.vrdespesas;
        if (id) pg.codigos.add(id);

        if (ciclo === latestCiclo) {
          composicao.Internacao += r.internacao;
          composicao.Terapia += r.terapia;
          composicao.Exame += r.exame;
          composicao.Consulta += r.consulta;
          composicao.Emergencia += r.emergencia;
          composicao.Demais += r.demais;
        }
      }

      const totalsArr: PeriodoTotal[] = Array.from(perPeriodo.entries())
        .map(([periodo, a]) => ({
          periodo,
          vidas: a.codigos.size,
          rec_total: a.rec,
          vrdespesas: a.desp,
          saldo: a.rec - a.desp,
          sin: a.rec ? a.desp / a.rec : 0,
        }))
        .sort((x, y) => x.periodo.localeCompare(y.periodo));

      const grupos: GrupoTotal[] = Array.from(perGrupo.entries())
        .map(([GRUPO, a]) => ({
          GRUPO,
          vidas: a.codigos.size,
          rec_total: a.rec,
          vrdespesas: a.desp,
          saldo: a.rec - a.desp,
          sin: a.rec ? a.desp / a.rec : 0,
        }))
        .sort((x, y) => y.vrdespesas - x.vrdespesas)
        .slice(0, 10);

      const despArr = Object.entries(composicao)
        .map(([name, value]) => ({ name, value }))
        .filter((x) => x.value > 0);

      if (!alive) return;
      setTotals(totalsArr);
      setGruposTop(grupos);
      setDesp(despArr);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => ({ loading, totals, gruposTop, desp }), [loading, totals, gruposTop, desp]);
}
