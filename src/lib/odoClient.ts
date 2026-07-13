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

/** Protocolo mensal AAAA-MM-000042. AAAA-MM = competência do pagamento, 000042 = id do fornecedor. */
export const buildProtocoloMensal = (yyyyMm: string, fornecedorId: number): string => {
  const [y, m] = yyyyMm.split("-");
  return `${y}-${m}-${String(fornecedorId).padStart(6, "0")}`;
};

/** Extrai o dia (1-31) de uma coluna `date` usada como "dia do vencimento". */
export const diaDoVencimento = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const d = Number(iso.split("-")[2]);
  return Number.isFinite(d) ? d : null;
};

/** Serializa um dia (1-31) em data ISO usando ano/mês fixos, para gravar na coluna `date`. */
export const diaParaDate = (dia: number): string => {
  const dd = String(Math.max(1, Math.min(31, Math.floor(dia)))).padStart(2, "0");
  return `2000-01-${dd}`;
};

