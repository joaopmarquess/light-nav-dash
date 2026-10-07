/**
 * Orçamento jul–dez/2026: dados locais.
 * A tabela orcamento_2026 do Supabase ainda cobre apenas jan–jun e não possui
 * a coluna "projetado", então estes registros complementam a consulta.
 * Ao carregar esses meses no banco, remova o merge em Orcamento.tsx.
 */
export type OrcamentoLinha = {
  item: string;
  mes: number;
  previsto: number;
  realizado: number;
  projetado: number;
};

export const ORCAMENTO_LOCAL: OrcamentoLinha[] = [
  { item: "01|FATURAMENTO", mes: 7, previsto: 32410000.0, realizado: 31969483, projetado: 3.15e+07 },
  { item: "01|FATURAMENTO", mes: 8, previsto: 32645000.0, realizado: 32038265.03, projetado: 3.22e+07 },
  { item: "01|FATURAMENTO", mes: 9, previsto: 32880000.0, realizado: 0, projetado: 3.253e+07 },
  { item: "01|FATURAMENTO", mes: 10, previsto: 33115000.0, realizado: 0, projetado: 3.29e+07 },
  { item: "01|FATURAMENTO", mes: 11, previsto: 33350000.0, realizado: 0, projetado: 3.33e+07 },
  { item: "01|FATURAMENTO", mes: 12, previsto: 33414854.0, realizado: 0, projetado: 3.365e+07 },
  { item: "02|COPARTICIPAÇÃO", mes: 7, previsto: 3296097.0, realizado: 3179945, projetado: 3.60644e+06 },
  { item: "02|COPARTICIPAÇÃO", mes: 8, previsto: 3319997.0, realizado: 3480586.03, projetado: 3.6326e+06 },
  { item: "02|COPARTICIPAÇÃO", mes: 9, previsto: 3343896.0, realizado: 0, projetado: 3.65874e+06 },
  { item: "02|COPARTICIPAÇÃO", mes: 10, previsto: 3367796.0, realizado: 0, projetado: 3.6849e+06 },
  { item: "02|COPARTICIPAÇÃO", mes: 11, previsto: 3391695.0, realizado: 0, projetado: 3.71104e+06 },
  { item: "02|COPARTICIPAÇÃO", mes: 12, previsto: 3396859.0, realizado: 0, projetado: 3.7167e+06 },
  { item: "03|DESPESAS ASSISTENCIAIS", mes: 7, previsto: -31570581.0, realizado: -33419348, projetado: -3.25e+07 },
  { item: "03|DESPESAS ASSISTENCIAIS", mes: 8, previsto: -31799495.0, realizado: -29890040.24, projetado: -3.3e+07 },
  { item: "03|DESPESAS ASSISTENCIAIS", mes: 9, previsto: -32028408.0, realizado: 0, projetado: -3.2e+07 },
  { item: "03|DESPESAS ASSISTENCIAIS", mes: 10, previsto: -32257322.0, realizado: 0, projetado: -3.132e+07 },
  { item: "03|DESPESAS ASSISTENCIAIS", mes: 11, previsto: -32486235.0, realizado: 0, projetado: -3.0666e+07 },
  { item: "03|DESPESAS ASSISTENCIAIS", mes: 12, previsto: -32535482.0, realizado: 0, projetado: -3.1e+07 },
  { item: "04|OUTRAS RECEITAS OPERACIONAIS", mes: 7, previsto: -294811.0, realizado: -269067, projetado: -16054 },
  { item: "04|OUTRAS RECEITAS OPERACIONAIS", mes: 8, previsto: -294811.0, realizado: -76364.12, projetado: -16054 },
  { item: "04|OUTRAS RECEITAS OPERACIONAIS", mes: 9, previsto: -294811.0, realizado: 0, projetado: -16054 },
  { item: "04|OUTRAS RECEITAS OPERACIONAIS", mes: 10, previsto: -294811.0, realizado: 0, projetado: -16054 },
  { item: "04|OUTRAS RECEITAS OPERACIONAIS", mes: 11, previsto: -294811.0, realizado: 0, projetado: -16054 },
  { item: "04|OUTRAS RECEITAS OPERACIONAIS", mes: 12, previsto: -294811.0, realizado: 0, projetado: -16054 },
  { item: "05|COMERCIALIZAÇÃO", mes: 7, previsto: -281607.0, realizado: -353566, projetado: -287835 },
  { item: "05|COMERCIALIZAÇÃO", mes: 8, previsto: -281607.0, realizado: -360847.92, projetado: -287835 },
  { item: "05|COMERCIALIZAÇÃO", mes: 9, previsto: -281607.0, realizado: 0, projetado: -287835 },
  { item: "05|COMERCIALIZAÇÃO", mes: 10, previsto: -281607.0, realizado: 0, projetado: -287835 },
  { item: "05|COMERCIALIZAÇÃO", mes: 11, previsto: -281607.0, realizado: 0, projetado: -287835 },
  { item: "05|COMERCIALIZAÇÃO", mes: 12, previsto: -281607.0, realizado: 0, projetado: -287835 },
  { item: "06|IMPOSTOS DIRETOS", mes: 7, previsto: -505391.0, realizado: -605457, projetado: -787571 },
  { item: "06|IMPOSTOS DIRETOS", mes: 8, previsto: -505391.0, realizado: -202124.15, projetado: -787571 },
  { item: "06|IMPOSTOS DIRETOS", mes: 9, previsto: -505391.0, realizado: 0, projetado: -787571 },
  { item: "06|IMPOSTOS DIRETOS", mes: 10, previsto: -505391.0, realizado: 0, projetado: -787571 },
  { item: "06|IMPOSTOS DIRETOS", mes: 11, previsto: -505391.0, realizado: 0, projetado: -787571 },
  { item: "06|IMPOSTOS DIRETOS", mes: 12, previsto: -505391.0, realizado: 0, projetado: -787571 },
  { item: "07|PROVISÕES OPERACIONAIS", mes: 7, previsto: 46445.0, realizado: -753940, projetado: -638130 },
  { item: "07|PROVISÕES OPERACIONAIS", mes: 8, previsto: 46445.0, realizado: -315053.68, projetado: -766091 },
  { item: "07|PROVISÕES OPERACIONAIS", mes: 9, previsto: 46445.0, realizado: 0, projetado: -919711 },
  { item: "07|PROVISÕES OPERACIONAIS", mes: 10, previsto: 46445.0, realizado: 0, projetado: -1.10414e+06 },
  { item: "07|PROVISÕES OPERACIONAIS", mes: 11, previsto: 46445.0, realizado: 0, projetado: -1.32554e+06 },
  { item: "07|PROVISÕES OPERACIONAIS", mes: 12, previsto: 46445.0, realizado: 0, projetado: -1.59134e+06 },
  { item: "08|PESSOAL", mes: 7, previsto: -1377446.0, realizado: -1470196, projetado: -1.44117e+06 },
  { item: "08|PESSOAL", mes: 8, previsto: -1377446.0, realizado: -1485433.98, projetado: -1.44117e+06 },
  { item: "08|PESSOAL", mes: 9, previsto: -1377446.0, realizado: 0, projetado: -1.44117e+06 },
  { item: "08|PESSOAL", mes: 10, previsto: -1377446.0, realizado: 0, projetado: -1.44117e+06 },
  { item: "08|PESSOAL", mes: 11, previsto: -1377446.0, realizado: 0, projetado: -1.44117e+06 },
  { item: "08|PESSOAL", mes: 12, previsto: -1377446.0, realizado: 0, projetado: -1.44117e+06 },
  { item: "09|MARKETING", mes: 7, previsto: -175610.0, realizado: -260837, projetado: -217915 },
  { item: "09|MARKETING", mes: 8, previsto: -175610.0, realizado: -134347.42, projetado: -217915 },
  { item: "09|MARKETING", mes: 9, previsto: -175610.0, realizado: 0, projetado: -217915 },
  { item: "09|MARKETING", mes: 10, previsto: -175610.0, realizado: 0, projetado: -217915 },
  { item: "09|MARKETING", mes: 11, previsto: -175610.0, realizado: 0, projetado: -217915 },
  { item: "09|MARKETING", mes: 12, previsto: -175610.0, realizado: 0, projetado: -217915 },
  { item: "10|INFORMÁTICA", mes: 7, previsto: -165840.0, realizado: -136409, projetado: -297429 },
  { item: "10|INFORMÁTICA", mes: 8, previsto: -165840.0, realizado: -328429.15, projetado: -297429 },
  { item: "10|INFORMÁTICA", mes: 9, previsto: -165840.0, realizado: 0, projetado: -297429 },
  { item: "10|INFORMÁTICA", mes: 10, previsto: -165840.0, realizado: 0, projetado: -297429 },
  { item: "10|INFORMÁTICA", mes: 11, previsto: -165840.0, realizado: 0, projetado: -297429 },
  { item: "10|INFORMÁTICA", mes: 12, previsto: -165840.0, realizado: 0, projetado: -297429 },
  { item: "11|DEMAIS DESPESAS ADMINISTRATIVAS", mes: 7, previsto: -813199.0, realizado: -839752, projetado: -512762 },
  { item: "11|DEMAIS DESPESAS ADMINISTRATIVAS", mes: 8, previsto: -813199.0, realizado: -552130.8, projetado: -512762 },
  { item: "11|DEMAIS DESPESAS ADMINISTRATIVAS", mes: 9, previsto: -813199.0, realizado: 0, projetado: -512762 },
  { item: "11|DEMAIS DESPESAS ADMINISTRATIVAS", mes: 10, previsto: -813199.0, realizado: 0, projetado: -512762 },
  { item: "11|DEMAIS DESPESAS ADMINISTRATIVAS", mes: 11, previsto: -813199.0, realizado: 0, projetado: -512762 },
  { item: "11|DEMAIS DESPESAS ADMINISTRATIVAS", mes: 12, previsto: -813199.0, realizado: 0, projetado: -512762 },
  { item: "12|FINANCEIRO", mes: 7, previsto: 1802053.0, realizado: 1565362, projetado: 1.37829e+06 },
  { item: "12|FINANCEIRO", mes: 8, previsto: 1802053.0, realizado: 1388574.82, projetado: 1.36362e+06 },
  { item: "12|FINANCEIRO", mes: 9, previsto: 1802053.0, realizado: 0, projetado: 1.3491e+06 },
  { item: "12|FINANCEIRO", mes: 10, previsto: 1802053.0, realizado: 0, projetado: 1.33474e+06 },
  { item: "12|FINANCEIRO", mes: 11, previsto: 1802053.0, realizado: 0, projetado: 1.32053e+06 },
  { item: "12|FINANCEIRO", mes: 12, previsto: 1802053.0, realizado: 0, projetado: 1.30648e+06 },
];

/** Une as linhas do banco com as locais (locais só entram em meses ausentes). */
export const mergeOrcamento = (db: OrcamentoLinha[]): OrcamentoLinha[] => {
  const chaves = new Set(db.map((r) => `${r.item}|${r.mes}`));
  return [...db, ...ORCAMENTO_LOCAL.filter((r) => !chaves.has(`${r.item}|${r.mes}`))];
};
