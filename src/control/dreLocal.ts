/**
 * Dados de DRE Gerencial embutidos localmente (competências ainda não carregadas no banco).
 * São mesclados com o retorno do Supabase; se a competência existir no banco, o banco tem prioridade.
 */
export type DreLocalRow = {
  ano: number;
  mes: number;
  tri: number;
  g1: string;
  g2: string;
  g3: string;
  g4: string;
  valor: number;
};

const JUL_2026: Array<[string, string, string, string, number]> = [
  ["1|EBITDA", "1|OPERACIONAL", "1|PRINCIPAL", "1|FATURAMENTO", 31969483],
  ["1|EBITDA", "1|OPERACIONAL", "1|PRINCIPAL", "2|COPARTICIPAÇÃO", 3179945],
  ["1|EBITDA", "1|OPERACIONAL", "1|PRINCIPAL", "3|DESP. ASSISTENCIAL", -33419348],
  ["1|EBITDA", "1|OPERACIONAL", "2|SECUNDÁRIA", "", -269067],
  ["1|EBITDA", "1|OPERACIONAL", "3|PROVISÕES", "", -753940],
  ["1|EBITDA", "1|OPERACIONAL", "4|COMERCIALIZAÇÃO", "", -353566],
  ["1|EBITDA", "1|OPERACIONAL", "5|IMPOSTOS DIRETOS", "", -605457],
  ["1|EBITDA", "2|ADMINISTRATIVO", "01|PESSOAL", "", -1470196],
  ["1|EBITDA", "2|ADMINISTRATIVO", "02|SERVIÇOS DE TERCEIROS", "", -71094],
  ["1|EBITDA", "2|ADMINISTRATIVO", "03|TECNOLOGIA DA INFORMAÇÃO", "", -136409],
  ["1|EBITDA", "2|ADMINISTRATIVO", "04|MARKETING", "", -260837],
  ["1|EBITDA", "2|ADMINISTRATIVO", "05|DEPRECIAÇÕES E AMORTIZAÇÕES", "", -42568],
  ["1|EBITDA", "2|ADMINISTRATIVO", "05|MANUTENÇÃO PREDIAL/VEICULAR", "", -88552],
  ["1|EBITDA", "2|ADMINISTRATIVO", "06|DESPESAS JUDICIAIS", "", -171191],
  ["1|EBITDA", "2|ADMINISTRATIVO", "09|DEMAIS DESPESAS ADMINISTRATIVAS", "", -466347],
  ["2|FINANCEIRO", "3|FINANCEIRO", "1|RENDIMENTO DE APLICAÇÕES", "", 1387583],
  ["2|FINANCEIRO", "3|FINANCEIRO", "2|RECEBIMENTOS EM ATRASO", "", 174232],
  ["2|FINANCEIRO", "3|FINANCEIRO", "4|DEMAIS RECEITAS FINANCEIRAS", "", 4141],
  ["2|FINANCEIRO", "3|FINANCEIRO", "5|DEMAIS DESPESAS FINANCEIRAS", "", -594],
];

const AGO_2026: Array<[string, string, string, string, number]> = [
  ["1|EBITDA", "1|OPERACIONAL", "1|PRINCIPAL", "1|FATURAMENTO", 32038265],
  ["1|EBITDA", "1|OPERACIONAL", "1|PRINCIPAL", "2|COPARTICIPAÇÃO", 3480586],
  ["1|EBITDA", "1|OPERACIONAL", "1|PRINCIPAL", "3|DESP. ASSISTENCIAL", -29890040],
  ["1|EBITDA", "1|OPERACIONAL", "2|SECUNDÁRIA", "", -76364],
  ["1|EBITDA", "1|OPERACIONAL", "3|PROVISÕES", "", -315054],
  ["1|EBITDA", "1|OPERACIONAL", "4|COMERCIALIZAÇÃO", "", -360848],
  ["1|EBITDA", "1|OPERACIONAL", "5|IMPOSTOS DIRETOS", "", -202124],
  ["1|EBITDA", "2|ADMINISTRATIVO", "01|PESSOAL", "", -1485434],
  ["1|EBITDA", "2|ADMINISTRATIVO", "02|SERVIÇOS DE TERCEIROS", "", -71094],
  ["1|EBITDA", "2|ADMINISTRATIVO", "03|TECNOLOGIA DA INFORMAÇÃO", "", -328429],
  ["1|EBITDA", "2|ADMINISTRATIVO", "04|MARKETING", "", -134347],
  ["1|EBITDA", "2|ADMINISTRATIVO", "05|DEPRECIAÇÕES E AMORTIZAÇÕES", "", -42487],
  ["1|EBITDA", "2|ADMINISTRATIVO", "05|MANUTENÇÃO PREDIAL/VEICULAR", "", -100177],
  ["1|EBITDA", "2|ADMINISTRATIVO", "06|DESPESAS JUDICIAIS", "", -141143],
  ["1|EBITDA", "2|ADMINISTRATIVO", "09|DEMAIS DESPESAS ADMINISTRATIVAS", "", -197231],
  ["2|FINANCEIRO", "3|FINANCEIRO", "1|RENDIMENTO DE APLICAÇÕES", "", 1236674],
  ["2|FINANCEIRO", "3|FINANCEIRO", "2|RECEBIMENTOS EM ATRASO", "", 153276],
  ["2|FINANCEIRO", "3|FINANCEIRO", "4|DEMAIS RECEITAS FINANCEIRAS", "", 17],
  ["2|FINANCEIRO", "3|FINANCEIRO", "5|DEMAIS DESPESAS FINANCEIRAS", "", -1392],
];

function toRows(ano: number, mes: number, tri: number) {
  return (rows: Array<[string, string, string, string, number]>): DreLocalRow[] =>
    rows.map(([g1, g2, g3, g4, valor]) => ({ ano, mes, tri, g1, g2, g3, g4, valor }));
}

export const DRE_LOCAL_ROWS: DreLocalRow[] = [
  ...toRows(2026, 7, 3)(JUL_2026),
  ...toRows(2026, 8, 3)(AGO_2026),
];

/** Renomeia "Custas judiciais" para "Despesas judiciais" em qualquer nível da hierarquia. */
function renameCustasJudiciais<T extends DreLocalRow>(row: T): T {
  const fix = (s: string) => s.replace(/custas judiciais/i, "DESPESAS JUDICIAIS");
  return { ...row, g1: fix(row.g1), g2: fix(row.g2), g3: fix(row.g3), g4: fix(row.g4) };
}

/** Mescla os dados do banco com os locais; competências já presentes no banco prevalecem. */
export function mergeDre<T extends DreLocalRow>(dbRows: T[]): T[] {
  const presentes = new Set(dbRows.map((r) => `${r.ano}-${r.mes}`));
  const extras = DRE_LOCAL_ROWS.filter((r) => !presentes.has(`${r.ano}-${r.mes}`)) as T[];
  return [...dbRows, ...extras].map(renameCustasJudiciais);
}
