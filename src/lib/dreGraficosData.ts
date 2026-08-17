import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";

export type DreRow = { g1: string; g2: string; g3: string; g4: string; valor: number; mes: number };

const ALL_MONTHS = [
  { n: 1, label: "Jan/26" },
  { n: 2, label: "Fev/26" },
  { n: 3, label: "Mar/26" },
  { n: 4, label: "Abr/26" },
  { n: 5, label: "Mai/26" },
  { n: 6, label: "Jun/26" },
  { n: 7, label: "Jul/26" },
  { n: 8, label: "Ago/26" },
  { n: 9, label: "Set/26" },
  { n: 10, label: "Out/26" },
  { n: 11, label: "Nov/26" },
  { n: 12, label: "Dez/26" },
];
const YEAR = 2026;
const MES_DE = 1;
const MES_ATE = 6;

const ACRONYMS = ["EBITDA", "TI"];
export const toSentence = (s: string) => {
  if (!s) return s;
  let r = s.toLowerCase();
  r = r.charAt(0).toUpperCase() + r.slice(1);
  for (const a of ACRONYMS) r = r.replace(new RegExp(`\\b${a.toLowerCase()}\\b`, "gi"), a);
  return r;
};
export const strip = (s: string) => toSentence((s || "").replace(/^\d+\|/, ""));

export const MONTHS = ALL_MONTHS.filter((m) => m.n >= MES_DE && m.n <= MES_ATE);

export function useDreGraficosData() {
  const [rows, setRows] = useState<DreRow[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const monthsList = MONTHS.map((m) => m.n);
        const PAGE = 1000;
        let from = 0;
        const data: any[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: chunk, error } = await hostinger
            .from("contabilidade")
            .select("G1,G2,G3,G4,N2,nr_mes,nr_ano,REALIZADO")
            .eq("nr_ano", YEAR)
            .in("nr_mes", monthsList)
            .range(from, from + PAGE - 1);
          if (error) throw error;
          const arr = (chunk || []) as any[];
          data.push(...arr);
          if (arr.length < PAGE) break;
          from += PAGE;
        }
        const filtered: DreRow[] = [];
        for (const r of data) {
          const n2 = (r.N2 as string | null) || "";
          const code = parseInt(n2.split("|")[0], 10);
          if (!Number.isFinite(code)) continue;
          if (!((code >= 31 && code <= 49) || code === 61)) continue;
          const g1 = r.G1 || "";
          if (!g1) continue;
          filtered.push({
            g1,
            g2: r.G2 || "",
            g3: r.G3 || "",
            g4: r.G4 || "",
            valor: Number(r.REALIZADO) || 0,
            mes: Number(r.nr_mes) || 0,
          });
        }
        setRows(filtered);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  const data = useMemo(() => {
    if (!rows) return null;
    const byMes = MONTHS.map((m) => {
      const mr = rows.filter((r) => r.mes === m.n);
      const ebitda = mr.filter((r) => r.g1 === "1|EBITDA").reduce((s, r) => s + r.valor, 0);
      const financeiro = mr.filter((r) => r.g1 === "2|FINANCEIRO").reduce((s, r) => s + r.valor, 0);
      return {
        mes: m.label,
        Receitas: mr.filter((r) => r.valor > 0).reduce((s, r) => s + r.valor, 0),
        Despesas: Math.abs(mr.filter((r) => r.valor < 0).reduce((s, r) => s + r.valor, 0)),
        EBITDA: ebitda,
        Financeiro: financeiro,
        Resultado: ebitda + financeiro,
      };
    });
    const sumAbs = (pred: (r: DreRow) => boolean) =>
      rows.filter((r) => r.valor < 0 && pred(r)).reduce((s, r) => s + Math.abs(r.valor), 0);
    const buckets = [
      { name: "Despesa Assistencial", value: sumAbs((r) => r.g3 === "1|PRINCIPAL" && r.g4 === "3|DESP. ASSISTENCIAL") },
      { name: "Secundária", value: sumAbs((r) => r.g3 === "2|SECUNDÁRIA") },
      { name: "Provisões", value: sumAbs((r) => r.g3 === "3|PROVISÕES") },
      { name: "Comercialização", value: sumAbs((r) => r.g3 === "4|COMERCIALIZAÇÃO") },
      { name: "Impostos Diretos", value: sumAbs((r) => r.g3 === "5|IMPOSTOS DIRETOS") },
      { name: "Despesas Administrativas", value: sumAbs((r) => r.g2 === "2|ADMINISTRATIVO") },
    ];
    const despPie = buckets.filter((b) => b.value > 0);

    const admRows = rows.filter((r) => r.g2 === "2|ADMINISTRATIVO");
    const cats = Array.from(new Set(admRows.map((r) => strip(r.g3))));
    const admCats = cats
      .map((c) => ({ c, t: admRows.filter((r) => strip(r.g3) === c).reduce((s, r) => s + Math.abs(r.valor), 0) }))
      .sort((a, b) => b.t - a.t)
      .slice(0, 5)
      .map((x) => x.c);
    const admByMes = MONTHS.map((m) => {
      const row: any = { mes: m.label };
      admCats.forEach((c) => {
        row[c] = admRows.filter((r) => r.mes === m.n && strip(r.g3) === c).reduce((s, r) => s + Math.abs(r.valor), 0);
      });
      return row;
    });
    return { byMes, despPie, admByMes, admCats };
  }, [rows]);

  return data;
}
