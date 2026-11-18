/** Simular Datas FM (Laboratory, pedido de 18/11/2026): a partir da Competência (mês/ano), cada linha recebe um dia e mostra a data.
 * De e Até caem no próprio mês da competência; Arquivo, Fechamento, Dare, DIOPS e Pagamento, no mês seguinte.
 * Dia maior que o último dia do mês vira o último dia (ex.: 30 em fevereiro → 28 ou 29). */
export type IdDataFm = "de" | "ate" | "arquivo" | "fechamento" | "dare" | "diops" | "pagamento";
export type LinhaDataFmDef = { id: IdDataFm; rotulo: string; diaPadrao: number; mesSeguinte: boolean; destaque?: boolean; separadorAntes?: boolean };

export const LINHAS_DATAS_FM: LinhaDataFmDef[] = [
  // Arquivo logo após a Competência (pedido de 18/11/2026).
  { id: "arquivo", rotulo: "Arquivo", diaPadrao: 5, mesSeguinte: true, destaque: true },
  { id: "de", rotulo: "De", diaPadrao: 1, mesSeguinte: false },
  { id: "ate", rotulo: "Até", diaPadrao: 30, mesSeguinte: false },
  { id: "fechamento", rotulo: "Fechamento", diaPadrao: 10, mesSeguinte: true },
  { id: "dare", rotulo: "Dare", diaPadrao: 15, mesSeguinte: true, separadorAntes: true },
  { id: "diops", rotulo: "DIOPS", diaPadrao: 30, mesSeguinte: true },
  { id: "pagamento", rotulo: "Pagamento", diaPadrao: 30, mesSeguinte: true },
];
export const COMPETENCIA_PADRAO = { mes: 12, ano: 2026 };

/** "Último Dia" (pedido de 18/11/2026; antes "Dias"): variável numérica própria, padrão 1, exibida logo antes de Arquivo; ainda sem efeito nas datas. */
export const DIAS_PADRAO = 1;
export type EntradaDatasFm = { mes: number; ano: number; dias: Partial<Record<IdDataFm, number>>; qtdDias?: number };

const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
const dd = (n: number) => String(n).padStart(2, "0");

/** Data da linha (dd/mm/aaaa) e se o dia foi limitado ao fim do mês. */
export function dataDaLinha(mes: number, ano: number, dia: number, mesSeguinte: boolean) {
  const m = mesSeguinte ? (mes === 12 ? 1 : mes + 1) : mes;
  const a = mesSeguinte && mes === 12 ? ano + 1 : ano;
  const fim = ultimoDia(a, m);
  const d = Math.min(Math.max(1, dia), fim);
  return { data: `${dd(d)}/${dd(m)}/${a}`, ajustado: d !== dia };
}

export function simularDatasFm({ mes, ano, dias }: EntradaDatasFm) {
  return LINHAS_DATAS_FM.map((l) => {
    const dia = dias[l.id] ?? l.diaPadrao;
    return { ...l, dia, ...dataDaLinha(mes, ano, dia, l.mesSeguinte) };
  });
}

/** Inteiro digitado dentro do intervalo; vazio → undefined (restaura o padrão); inválido → null (recusado). */
export function lerInteiro(texto: string, min: number, max: number): number | undefined | null {
  const t = texto.trim();
  if (t === "") return undefined;
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
}

export const CHAVE_DATAS_FM = "laboratory.simularDatasFm.v1";
export function carregarDatasFm(): EntradaDatasFm {
  try {
    const b = JSON.parse(localStorage.getItem(CHAVE_DATAS_FM) ?? "{}");
    const dias: EntradaDatasFm["dias"] = {};
    for (const l of LINHAS_DATAS_FM) if (Number.isInteger(b?.dias?.[l.id]) && b.dias[l.id] >= 1 && b.dias[l.id] <= 31) dias[l.id] = b.dias[l.id];
    return {
      mes: Number.isInteger(b?.mes) && b.mes >= 1 && b.mes <= 12 ? b.mes : COMPETENCIA_PADRAO.mes,
      ano: Number.isInteger(b?.ano) && b.ano >= 2000 && b.ano <= 2100 ? b.ano : COMPETENCIA_PADRAO.ano,
      dias,
      ...(Number.isInteger(b?.qtdDias) && b.qtdDias >= 0 && b.qtdDias <= 365 ? { qtdDias: b.qtdDias } : {}),
    };
  } catch { return { ...COMPETENCIA_PADRAO, dias: {} }; }
}
export function salvarDatasFm(v: EntradaDatasFm) {
  try { localStorage.setItem(CHAVE_DATAS_FM, JSON.stringify(v)); } catch { /* navegador sem armazenamento */ }
}
