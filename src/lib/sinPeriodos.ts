import { hostinger } from "@/lib/hostingerClient";

/**
 * Lista os PERIODO distintos de public.sinistralidade sem usar a RPC
 * `sin_periodos` (que estoura statement timeout na base atual).
 * Usa keyset walk: cada consulta pega o próximo período maior.
 */
export async function fetchSinPeriodos(): Promise<string[]> {
  const out: string[] = [];
  let last: string | null = null;
  for (let i = 0; i < 60; i++) {
    let q = hostinger
      .from("sinistralidade")
      .select("PERIODO")
      .order("PERIODO", { ascending: true })
      .limit(1);
    if (last) q = q.gt("PERIODO", last);
    const { data, error } = await q;
    if (error) throw error;
    const p = String((data?.[0] as any)?.PERIODO ?? "").trim();
    if (!p) break;
    out.push(p);
    last = p;
  }
  return out;
}
