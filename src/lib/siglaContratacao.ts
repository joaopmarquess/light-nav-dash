// De/para de view_ecarteira.tp_contratacao para sigla (mesma regra de supabase/sql/sigla_contratacao.sql).
export type SiglaContratacao = "PIF" | "PCA" | "PCE";

export function siglaContratacao(tp: string | null | undefined): SiglaContratacao | null {
  const t = String(tp ?? "").toUpperCase();
  if (t.includes("INDIVIDUAL/FAMILIAR")) return "PIF";
  if (t.includes("COLETIVO POR ADESAO")) return "PCA";
  if (t.includes("COLETIVO EMPRESARIAL")) return "PCE";
  return null;
}
