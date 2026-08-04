import { useEffect, useState } from "react";
import { addMonths, fmtComp } from "@/lib/isinistralidadeData";

/**
 * Definição de PERÍODO do menu Sinistralidade.
 * O usuário define a Base final (mabas) e a quantidade de meses;
 * a aplicação calcula a Base inicial e gera os períodos (Período 1, 2, ...)
 * agrupando os mabas. Os submenus consultam por PERÍODO, nunca por mabas.
 */

export type PeriodoDef = {
  idx: number;
  label: string;
  mIni: string;
  mFim: string;
};

export type SinPeriodoConfig = {
  baseFim: string;
  meses: number;
  baseIni: string;
  periodos: PeriodoDef[];
};

const KEY = "sin.periodo.config.v1";

let current: SinPeriodoConfig | null = load();
const subs = new Set<() => void>();

function load(): SinPeriodoConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as SinPeriodoConfig;
    if (!cfg?.periodos?.length) return null;
    return cfg;
  } catch {
    return null;
  }
}

export function getSinPeriodo(): SinPeriodoConfig | null {
  return current;
}

export function setSinPeriodo(cfg: SinPeriodoConfig | null) {
  current = cfg;
  try {
    if (cfg) localStorage.setItem(KEY, JSON.stringify(cfg));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  subs.forEach((fn) => fn());
}

export function useSinPeriodo(): SinPeriodoConfig | null {
  const [cfg, setCfg] = useState<SinPeriodoConfig | null>(current);
  useEffect(() => {
    const fn = () => setCfg(current);
    subs.add(fn);
    fn();
    return () => {
      subs.delete(fn);
    };
  }, []);
  return cfg;
}

/** Gera os períodos a partir da base final, indo para trás enquanto houver dados. */
export function buildPeriodos(
  baseFim: string,
  meses: number,
  minMabas?: string,
  maxPeriodos = 10,
): PeriodoDef[] {
  if (!/^\d{6}$/.test(baseFim) || !meses || meses < 1) return [];
  const out: PeriodoDef[] = [];
  let fim = baseFim;
  for (let i = 1; i <= maxPeriodos; i++) {
    const ini = addMonths(fim, -(meses - 1));
    if (minMabas && Number(fim) < Number(minMabas)) break;
    out.push({
      idx: i,
      mIni: ini,
      mFim: fim,
      label: `${fmtComp(ini)} a ${fmtComp(fim)}`,
    });
    if (minMabas && Number(ini) <= Number(minMabas)) break;
    fim = addMonths(ini, -1);
  }
  return out;
}

/** Intervalo total coberto pela configuração. */
export function fullRange(cfg: SinPeriodoConfig): { mIni: string; mFim: string } {
  const last = cfg.periodos[cfg.periodos.length - 1];
  return { mIni: last.mIni, mFim: cfg.periodos[0].mFim };
}

/** PERÍODO (label) a que pertence um mabas, ou null se fora da definição. */
export function periodoLabelOf(mabas: string, cfg: SinPeriodoConfig): string | null {
  const n = Number(mabas);
  if (!n) return null;
  for (const p of cfg.periodos) {
    if (n >= Number(p.mIni) && n <= Number(p.mFim)) return p.label;
  }
  return null;
}

/** Ordena labels do mais recente para o mais antigo conforme a definição. */
export function sortPeriodos(labels: string[], cfg: SinPeriodoConfig): string[] {
  const order = new Map(cfg.periodos.map((p) => [p.label, p.idx]));
  return [...labels].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}
