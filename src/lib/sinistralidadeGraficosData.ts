import { fetchSinPeriodos } from "@/lib/sinPeriodos";
import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";

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

const DESP_COLS = ["Internacao", "Terapia", "Exame", "Consulta", "Emergencia", "Demais"] as const;

export function useSinistralidadeGraficosData(): SinGraficosData {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<PeriodoTotal[]>([]);
  const [gruposTop, setGruposTop] = useState<GrupoTotal[]>([]);
  const [desp, setDesp] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: pdata, error: pErr } = await fetchSinPeriodos().then((p) => ({ data: p.map((x) => ({ PERIODO: x })), error: null as any })).catch((e) => ({ data: [] as any[], error: e }));
      if (pErr) {
        console.error(pErr);
        if (alive) setLoading(false);
        return;
      }
      const periodos = Array.from(
        new Set(((pdata ?? []) as any[]).map((r) => String(r.periodo ?? r.PERIODO ?? "")).filter(Boolean)),
      );
      periodos.sort();

      const grupoMap = new Map<string, GrupoTotal>();
      const totalsArr: PeriodoTotal[] = [];

      await Promise.all(
        periodos.map(async (p) => {
          const { data: d, error: e } = await hostinger.rpc("sin_por_grupo", { p_periodo: p });
          if (e) {
            console.error("sin_por_grupo", p, e);
            return;
          }
          const rows = (d ?? []) as any[];
          let vidas = 0, rec = 0, desp = 0, sal = 0;
          for (const r of rows) {
            const v = Number(r.vidas ?? 0);
            const rt = Number(r.rec_total ?? 0);
            const vd = Number(r.vrdespesas ?? 0);
            const sl = Number(r.saldo ?? rt - vd);
            vidas += v; rec += rt; desp += vd; sal += sl;
            const g = String(r.grupo ?? r.GRUPO ?? "").trim();
            if (g) {
              const cur = grupoMap.get(g) ?? { GRUPO: g, vidas: 0, rec_total: 0, vrdespesas: 0, saldo: 0, sin: 0 };
              cur.vidas += v; cur.rec_total += rt; cur.vrdespesas += vd; cur.saldo += sl;
              grupoMap.set(g, cur);
            }
          }
          totalsArr.push({ periodo: p, vidas, rec_total: rec, vrdespesas: desp, saldo: sal, sin: rec ? desp / rec : 0 });
        }),
      );
      if (!alive) return;
      totalsArr.sort((a, b) => a.periodo.localeCompare(b.periodo));

      // Latest period detail: fetch composition of despesa
      const latest = totalsArr[totalsArr.length - 1]?.periodo;
      const composicao: Record<string, number> = {};
      if (latest) {
        const PAGE = 1000;
        let from = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: chunk, error } = await hostinger
            .from("sinistralidade")
            .select("Internacao,Terapia,Exame,Consulta,Emergencia,Demais,fisioterap,outros")
            .eq("PERIODO", latest)
            .range(from, from + PAGE - 1);
          if (error) { console.error(error); break; }
          const arr = (chunk ?? []) as any[];
          for (const r of arr) {
            for (const c of DESP_COLS) {
              const raw = (r as any)[c];
              if (raw != null) composicao[c] = (composicao[c] ?? 0) + Number(raw);
            }
            // fisioterap/outros -> Demais fallback caso schema legado
            if ((r as any).fisioterap != null) composicao.Demais = (composicao.Demais ?? 0) + Number((r as any).fisioterap);
            if ((r as any).outros != null) composicao.Demais = (composicao.Demais ?? 0) + Number((r as any).outros);
          }
          if (arr.length < PAGE) break;
          from += PAGE;
        }
      }
      const despArr = DESP_COLS.map((c) => ({ name: c, value: composicao[c] ?? 0 })).filter((x) => x.value > 0);

      const grupos = Array.from(grupoMap.values())
        .map((g) => ({ ...g, sin: g.rec_total ? g.vrdespesas / g.rec_total : 0 }))
        .sort((a, b) => b.vrdespesas - a.vrdespesas)
        .slice(0, 10);

      setTotals(totalsArr);
      setGruposTop(grupos);
      setDesp(despArr);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return useMemo(() => ({ loading, totals, gruposTop, desp }), [loading, totals, gruposTop, desp]);
}
