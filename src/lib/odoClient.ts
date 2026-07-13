import { createClient } from "@supabase/supabase-js";

// Projeto Supabase separado do ODO-NRPS (ref: xyuzylbaainzrxrukrou).
// A publishable key é pública por design (protegida por RLS/GRANTs do projeto).
const ODO_URL = "https://xyuzylbaainzrxrukrou.supabase.co";
const ODO_PUBLISHABLE_KEY = "sb_publishable_eRmvgWACXYpKE_k7wqoP5A_vkCBVt9B";

export const odo = createClient(ODO_URL, ODO_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type OdoPagamento = {
  id: number;
  cd_fornecedor: number | null;
  fornecedor: string | null;
  tp_relatorio: string | null;
  objeto: string | null;
  vencimento: string | null; // YYYY-MM-DD
  vl_bruto: number | null;
  created_at: string;
};

export type OdoLog = {
  id: number;
  protocolo: string;
  cd_operador: number | null;
  operador: string | null;
  momento: string | null;
  descricao: string | null;
  acao: string | null;
  created_at: string;
};

/** Formata protocolo AAAA-MM-000042 a partir da data de vencimento + id. */
export const buildProtocolo = (vencimento: string | null | undefined, id: number): string => {
  const d = vencimento ? new Date(vencimento + "T00:00:00") : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${String(id).padStart(6, "0")}`;
};
