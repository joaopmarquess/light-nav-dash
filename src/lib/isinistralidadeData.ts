import { hostinger } from "@/lib/hostingerClient";
import { fetchCarteiraDim, type CarteiraDim } from "@/lib/carteiraDimData";
import { fetchRegionalDim, normCidade, type RegionalDim, type RegionalMaps } from "@/lib/regionalDimData";

/**
 * Fonte única de dados do menu Sinistralidade: public.isinistralidade.
 * A tabela NÃO possui PERIODO — apenas `mabas` (AAAAMM).
 * PERIODO é derivado pela aplicação em ciclos móveis de 12 meses (jul..jun),
 * seguindo exatamente a mesma lógica validada no submenu APB.
 */

export type ISinRow = {
  mabas: string;
  GRUPO: string;
  cdpln: string;
  dspln: string;
  codigo: string;
  nmcli: string;
  CIDADE: string;
  REGIONAL: string;
  MACROREGIAO: string;
  rec_total: number;
  rec_tm: number;
  rec_cpa: number;
  vrdespesas: number;
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
};

export const DEFAULT_MABAS_INI = "202507";
export const DEFAULT_MABAS_FIM = "202606";

/** Nova fonte: public.ardmensal (granularidade beneficiário x mabas). */
const TABLE = "ardmensal";
const COLS =
  "mabas,cdregusr,cdpln,dspln,codigo,nmcli,dscid,rec_total,rec_tm,rec_cpa,vrdespesas,internacao,terapia,exame,consulta,emergencia,fisioterap,outros";

/** Ciclo móvel de 12 meses (jul→jun) ao qual um mabas pertence. Ex.: "202507-202606" */
export const cicloOf = (mabas: string): string => {
  const y = Number(mabas.slice(0, 4));
  const m = Number(mabas.slice(4, 6));
  const base = m >= 7 ? y : y - 1;
  return `${base}07-${base + 1}06`;
};

/** 202507 → 07/2025 */
export const fmtComp = (mabas: string) =>
  mabas && mabas.length === 6 ? `${mabas.slice(4, 6)}/${mabas.slice(0, 4)}` : mabas;

/** "202507-202606" → "07/2025 a 06/2026" */
export const fmtCiclo = (ciclo: string) => {
  const [a, b] = ciclo.split("-");
  return `${fmtComp(a)} a ${fmtComp(b)}`;
};

/** PERIODO derivado de um mabas: "07/2025 a 06/2026" */
export const periodoOf = (mabas: string) => fmtCiclo(cicloOf(mabas));

const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown, fallback = "") => {
  const s = v == null ? "" : String(v);
  return s || fallback;
};

const mapRow = (r: any, dim?: CarteiraDim, reg?: RegionalDim): ISinRow => ({
  mabas: String(r.mabas ?? ""),
  // GRUPO vem de carteira_beneficiario (NOME_EMPRESA_ASSOC) via cdregusr
  GRUPO: dim?.grupo || "(sem grupo)",
  cdpln: str(r.cdpln),
  dspln: str(r.dspln),
  codigo: str(r.codigo),
  nmcli: str(r.nmcli),
  // Cidade/UF vem de carteira_beneficiario; fallback dscid (sem UF)
  CIDADE: dim?.cidade || str(r.dscid, "(sem cidade)"),
  // REGIONAL / MACROREGIAO vêm de public.sinistralidade (de-para por cdregusr, fallback cidade)
  REGIONAL: reg?.regional || "(sem regional)",
  MACROREGIAO: reg?.macro || "(sem macrorregião)",
  rec_total: num(r.rec_total),
  rec_tm: num(r.rec_tm),
  rec_cpa: num(r.rec_cpa),
  vrdespesas: num(r.vrdespesas),
  internacao: num(r.internacao),
  terapia: num(r.terapia),
  exame: num(r.exame),
  consulta: num(r.consulta),
  emergencia: num(r.emergencia),
  demais: num(r.outros) + num(r.fisioterap),
});

const lookupRegional = (
  maps: RegionalMaps,
  r: any,
  d?: CarteiraDim,
): RegionalDim | undefined =>
  maps.byReg.get(String(r.cdregusr ?? "")) ??
  maps.byCidade.get(normCidade(d?.cidade)) ??
  maps.byCidade.get(normCidade(r.dscid));

// PostgREST limita respostas a 1000 linhas: páginas maiores perdiam dados silenciosamente.
const PAGE = 1000;
const CONCURRENCY = 6;

const cache = new Map<string, Promise<ISinRow[]>>();

async function loadRange(mIni: string, mFim: string): Promise<ISinRow[]> {
  const [dim, regMaps] = await Promise.all([fetchCarteiraDim(), fetchRegionalDim()]);
  const ini = Number(mIni);
  const fim = Number(mFim);
  if (!ini || !fim || fim < ini) return [];

  const { count, error: cErr } = await hostinger
    .from(TABLE)
    .select("mabas", { count: "exact", head: true })
    .gte("mabas", ini)
    .lte("mabas", fim);
  if (cErr) {
    console.error("isinistralidade count error", cErr);
    return [];
  }
  const total = count ?? 0;
  if (!total) return [];

  const pages = Math.ceil(total / PAGE);
  const out: ISinRow[] = [];
  let next = 0;

  const worker = async () => {
    while (true) {
      const page = next++;
      if (page >= pages) return;
      const { data, error } = await hostinger
        .from(TABLE)
        .select(COLS)
        .gte("mabas", ini)
        .lte("mabas", fim)
        .order("mabas", { ascending: true })
        .order("codigo", { ascending: true, nullsFirst: true })
        .order("cdpln", { ascending: true, nullsFirst: true })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) {
        console.error("isinistralidade fetch error", error);
        return;
      }
      for (const r of (data ?? []) as any[]) {
        const d = dim.get(String(r.cdregusr ?? ""));
        out.push(mapRow(r, d, lookupRegional(regMaps, r, d)));
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out;
}

/** Linhas de public.isinistralidade no intervalo de mabas (com cache em memória). */
export function fetchISinRows(mIni: string, mFim: string): Promise<ISinRow[]> {
  const key = `${mIni}|${mFim}`;
  let p = cache.get(key);
  if (!p) {
    p = loadRange(mIni, mFim).catch((e) => {
      cache.delete(key);
      throw e;
    });
    cache.set(key, p);
  }
  return p;
}

/** Menor e maior mabas presentes na tabela. */
export async function fetchMabasBounds(): Promise<{ min: string; max: string } | null> {
  const [{ data: a }, { data: b }] = await Promise.all([
    hostinger.from(TABLE).select("mabas").order("mabas", { ascending: true }).limit(1),
    hostinger.from(TABLE).select("mabas").order("mabas", { ascending: false }).limit(1),
  ]);
  const min = (a ?? [])[0]?.mabas;
  const max = (b ?? [])[0]?.mabas;
  if (!min || !max) return null;
  return { min: String(min), max: String(max) };
}

/** Soma um mês de mabas: 202512 → 202601 */
export const addMonths = (mabas: string, n: number): string => {
  const y = Number(mabas.slice(0, 4));
  const m = Number(mabas.slice(4, 6));
  const t = y * 12 + (m - 1) + n;
  const ny = Math.floor(t / 12);
  const nm = (t % 12) + 1;
  return `${ny}${String(nm).padStart(2, "0")}`;
};

export type Metrics = {
  rec_total: number;
  rec_tm: number;
  rec_cpa: number;
  vrdespesas: number;
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
};

export const zeroMetrics = (): Metrics => ({
  rec_total: 0,
  rec_tm: 0,
  rec_cpa: 0,
  vrdespesas: 0,
  internacao: 0,
  terapia: 0,
  exame: 0,
  consulta: 0,
  emergencia: 0,
  demais: 0,
});

export const addMetrics = (t: Metrics, r: ISinRow) => {
  t.rec_total += r.rec_total;
  t.rec_tm += r.rec_tm;
  t.rec_cpa += r.rec_cpa;
  t.vrdespesas += r.vrdespesas;
  t.internacao += r.internacao;
  t.terapia += r.terapia;
  t.exame += r.exame;
  t.consulta += r.consulta;
  t.emergencia += r.emergencia;
  t.demais += r.demais;
};

export const saldoOf = (m: Metrics) => m.rec_total - m.vrdespesas;
export const sinOf = (m: Metrics) => (m.rec_total ? m.vrdespesas / m.rec_total : 0);
