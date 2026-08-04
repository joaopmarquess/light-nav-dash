import { hostinger } from "@/lib/hostingerClient";

/**
 * De-para de REGIONAL / MACROREGIAO a partir de public.sinistralidade.
 * public.ardmensal não possui esses campos.
 * Chave principal: cdregusr. Fallback: nome da cidade normalizado.
 * Para manter o volume baixo, carrega apenas o PERIODO mais recente da tabela.
 */
export type RegionalDim = {
  regional: string;
  macro: string;
};

const TABLE = "sinistralidade";
const PAGE = 1000; // PostgREST limita respostas a 1000 linhas
const CONCURRENCY = 6;

export const normCidade = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\/\s*[A-Za-z]{2}\s*$/, "")
    .trim()
    .toUpperCase();

export type RegionalMaps = {
  byReg: Map<string, RegionalDim>;
  byCidade: Map<string, RegionalDim>;
};

async function load(): Promise<RegionalMaps> {
  const byReg = new Map<string, RegionalDim>();
  const byCidade = new Map<string, RegionalDim>();

  const { data: last, error: pErr } = await hostinger
    .from(TABLE)
    .select('"PERIODO"')
    .order("PERIODO", { ascending: false })
    .limit(1);
  if (pErr || !last?.length) {
    if (pErr) console.error("sinistralidade periodo error", pErr);
    return { byReg, byCidade };
  }
  const periodo = String((last[0] as any).PERIODO);

  const { count, error: cErr } = await hostinger
    .from(TABLE)
    .select("cdregusr", { count: "exact", head: true })
    .eq("PERIODO", periodo);
  if (cErr) {
    console.error("sinistralidade count error", cErr);
    return { byReg, byCidade };
  }
  const total = count ?? 0;
  const pages = Math.ceil(total / PAGE);
  let next = 0;

  const worker = async () => {
    while (true) {
      const page = next++;
      if (page >= pages) return;
      const { data, error } = await hostinger
        .from(TABLE)
        .select('cdregusr,"CIDADE","REGIONAL","MACROREGIAO"')
        .eq("PERIODO", periodo)
        .order("cdregusr", { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) {
        console.error("sinistralidade fetch error", error);
        return;
      }
      for (const r of (data ?? []) as any[]) {
        const dim: RegionalDim = {
          regional: String(r.REGIONAL ?? "").trim() || "(sem regional)",
          macro: String(r.MACROREGIAO ?? "").trim() || "(sem macrorregião)",
        };
        const key = String(r.cdregusr ?? "");
        if (key && !byReg.has(key)) byReg.set(key, dim);
        const cid = normCidade(r.CIDADE);
        if (cid && !byCidade.has(cid)) byCidade.set(cid, dim);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { byReg, byCidade };
}

let cached: Promise<RegionalMaps> | null = null;

export function fetchRegionalDim(): Promise<RegionalMaps> {
  if (!cached) {
    cached = load().catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}
