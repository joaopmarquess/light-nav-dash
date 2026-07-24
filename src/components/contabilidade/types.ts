export type ContabRow = {
  nr_ano: number;
  nr_mes: number;
  nr_trimestre: number;
  cd_reduzido: number | null;
  cd_contabil: string;
  ds_conta: string;
  cd_grau: number | null;
  tp_conta: string | null;
  vl_saldo_inicial: number | null;
  vl_debito: number | null;
  vl_credito: number | null;
  vl_movimento: number | null;
  vl_saldo_final: number | null;
  REALIZADO: number | null;
  N1: string | null; N2: string | null; N3: string | null; N4: string | null;
  N5: string | null; N6: string | null; N7: string | null; N8: string | null; N9: string | null;
  G1: string | null; G2: string | null; G3: string | null; G4: string | null;
  O1: string | null;
};

export const fmtBR = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
