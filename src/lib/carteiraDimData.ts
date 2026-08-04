import { hostinger } from "@/lib/hostingerClient";

/**
 * Dimensões de beneficiário/contrato vindas de public.carteira_beneficiario,
 * usadas para enriquecer public.ardmensal (que não possui GRUPO nem Cidade/UF).
 * Chave de ligação: CDREGUSR (ardmensal.cdregusr).
 */
export type CarteiraDim = {
  grupo: string;
  cidade: string; // "CIDADE/UF"
};

const TABLE = "carteira_beneficiario";
const COLS = '"CDREGUSR","NOME_EMPRESA_ASSOC","CIDADE_OFICIAL","UF_CIDADE_OFICIAL","CIDADE_PLANO","UF_PLANO"';

// PostgREST limita respostas a 1000 linhas.
const PAGE = 1000;
const CONCURRENCY = 6;

const cidadeUf = (cid: unknown, uf: unknown) => {
  const c = String(cid ?? "").trim();
  const u = String(uf ?? "").trim();
  if (!c) return "";
  return u ? `${c}/${u}` : c;
};

async function load(): Promise<Map<string, CarteiraDim>> {
  const map = new Map<string, CarteiraDim>();

  const { count, error: cErr } = await hostinger
    .from(TABLE)
    .select("CDREGUSR", { count: "exact", head: true });
  if (cErr) {
    console.error("carteira_beneficiario count error", cErr);
    return map;
  }
  const total = count ?? 0;
  if (!total) return map;

  const pages = Math.ceil(total / PAGE);
  let next = 0;

  const worker = async () => {
    while (true) {
      const page = next++;
      if (page >= pages) return;
      const { data, error } = await hostinger
        .from(TABLE)
        .select(COLS)
        .order("CDREGUSR", { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) {
        console.error("carteira_beneficiario fetch error", error);
        return;
      }
      for (const r of (data ?? []) as any[]) {
        const key = String(r.CDREGUSR ?? "");
        if (!key || map.has(key)) continue;
        map.set(key, {
          grupo: String(r.NOME_EMPRESA_ASSOC ?? "").trim() || "(sem grupo)",
          cidade:
            cidadeUf(r.CIDADE_OFICIAL, r.UF_CIDADE_OFICIAL) ||
            cidadeUf(r.CIDADE_PLANO, r.UF_PLANO) ||
            "(sem cidade)",
        });
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return map;
}

let cached: Promise<Map<string, CarteiraDim>> | null = null;

/** Mapa cdregusr → dimensões (cache em memória). */
export function fetchCarteiraDim(): Promise<Map<string, CarteiraDim>> {
  if (!cached) {
    cached = load().catch((e) => {
      cached = null;
      throw e;
    });
  }
  return cached;
}
