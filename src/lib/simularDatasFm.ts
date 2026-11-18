/** Simular Datas FM (Laboratory, pedido de 18/11/2026): a partir da Competência (mês/ano), cada linha recebe um dia e mostra a data.
 * De e Até caem no próprio mês da competência; Arquivo, Fechamento, Dare, DIOPS e Pagamento, no mês seguinte.
 * Dia maior que o último dia do mês vira o último dia (ex.: 30 em fevereiro → 28 ou 29).
 * Último Dia (pedido de 18/11/2026) = último dia útil do mês da competência, calculado por ultimoDiaUtil. */
export type IdDataFm = "de" | "ate" | "arquivo" | "fechamento" | "dare" | "diops" | "pagamento";
export type LinhaDataFmDef = { id: IdDataFm; rotulo: string; diaPadrao: number; mesSeguinte: boolean; destaque?: boolean; separadorAntes?: boolean; pedeMes?: boolean };

export const LINHAS_DATAS_FM: LinhaDataFmDef[] = [
  // Arquivo logo após a Competência (pedido de 18/11/2026).
  // Arquivo pede dia/mês (pedido de 18/11/2026); sem mês digitado, usa o mês seguinte à competência.
  { id: "arquivo", rotulo: "Arquivo", diaPadrao: 5, mesSeguinte: true, destaque: true, pedeMes: true },
  { id: "de", rotulo: "De", diaPadrao: 1, mesSeguinte: false },
  { id: "ate", rotulo: "Até", diaPadrao: 30, mesSeguinte: false },
  { id: "fechamento", rotulo: "Fechamento", diaPadrao: 10, mesSeguinte: true },
  { id: "dare", rotulo: "Dare", diaPadrao: 15, mesSeguinte: true, separadorAntes: true },
  { id: "diops", rotulo: "DIOPS", diaPadrao: 30, mesSeguinte: true },
  { id: "pagamento", rotulo: "Pagamento", diaPadrao: 30, mesSeguinte: true },
];
export const COMPETENCIA_PADRAO = { mes: 12, ano: 2026 };

/** arquivoMes: mês (1–12) digitado no Arquivo; ausente → mês seguinte à competência. */
export type EntradaDatasFm = { mes: number; ano: number; dias: Partial<Record<IdDataFm, number>>; arquivoMes?: number };

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

/** Data de um dia/mês informado: mês igual ou posterior ao da competência fica no mesmo ano; anterior, no ano seguinte. */
export function dataDiaMes(mesCompetencia: number, anoCompetencia: number, dia: number, mes: number) {
  const a = mes >= mesCompetencia ? anoCompetencia : anoCompetencia + 1;
  const fim = ultimoDia(a, mes);
  const d = Math.min(Math.max(1, dia), fim);
  return { data: `${dd(d)}/${dd(mes)}/${a}`, ajustado: d !== dia };
}

export function simularDatasFm({ mes, ano, dias, arquivoMes }: EntradaDatasFm) {
  return LINHAS_DATAS_FM.map((l) => {
    const dia = dias[l.id] ?? l.diaPadrao;
    if (l.pedeMes) {
      const m = arquivoMes ?? (mes === 12 ? 1 : mes + 1);
      return { ...l, dia, mesLinha: m, diaMes: `${dd(dia)}/${dd(m)}`, ...dataDiaMes(mes, ano, dia, m) };
    }
    return { ...l, dia, mesLinha: undefined, diaMes: undefined, ...dataDaLinha(mes, ano, dia, l.mesSeguinte) };
  });
}

/** Dia/mês digitado como DD/MM (ex.: "05/01"); vazio → undefined (restaura o padrão); inválido → null. */
export function lerDiaMes(texto: string): { dia: number; mes: number } | undefined | null {
  const t = texto.trim();
  if (t === "") return undefined;
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(t);
  if (!m) return null;
  const dia = Number(m[1]), mes = Number(m[2]);
  return dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 ? { dia, mes } : null;
}

/** Competência digitada como MM/AAAA (ex.: "12/2026"); inválida → null. */
export function lerCompetencia(texto: string): { mes: number; ano: number } | null {
  const m = /^(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const mes = Number(m[1]), ano = Number(m[2]);
  return mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100 ? { mes, ano } : null;
}
export const formatarCompetencia = (mes: number, ano: number) => `${dd(mes)}/${ano}`;

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), em UTC. */
function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(ano, mes - 1, dia);
}
const DIA_MS = 86400000;
/** Feriados nacionais (calendário de dias úteis bancários/ANBIMA): fixos, Carnaval (seg. e ter.), Sexta-feira Santa e Corpus Christi. */
export function feriadosNacionais(ano: number): Set<string> {
  const fixos = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"].map((md) => `${ano}-${md}`);
  const p = pascoa(ano);
  const moveis = [-48, -47, -2, 60].map((d) => new Date(p + d * DIA_MS).toISOString().slice(0, 10));
  return new Set([...fixos, ...moveis]);
}
/** Último dia útil do mês da competência: recua do último dia, pulando sábados, domingos e feriados nacionais. */
export function ultimoDiaUtil(mes: number, ano: number) {
  const feriados = feriadosNacionais(ano);
  for (let dia = ultimoDia(ano, mes); dia >= 1; dia--) {
    const t = new Date(Date.UTC(ano, mes - 1, dia));
    const semana = t.getUTCDay();
    if (semana !== 0 && semana !== 6 && !feriados.has(t.toISOString().slice(0, 10))) return { dia, data: `${dd(dia)}/${dd(mes)}/${ano}` };
  }
  throw new Error("Mês sem dia útil.");
}

/** Período (pedido de 18/11/2026): De = Último Dia − 30 dias corridos; Até = Último Dia (último dia útil da competência). */
export function periodoFm(mes: number, ano: number) {
  const ultimo = ultimoDiaUtil(mes, ano);
  const inicio = new Date(Date.UTC(ano, mes - 1, ultimo.dia) - 30 * DIA_MS);
  return { de: `${dd(inicio.getUTCDate())}/${dd(inicio.getUTCMonth() + 1)}/${inicio.getUTCFullYear()}`, ate: ultimo.data };
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
    const arquivoMes = Number.isInteger(b?.arquivoMes) && b.arquivoMes >= 1 && b.arquivoMes <= 12 ? b.arquivoMes : undefined;
    return {
      ...(arquivoMes ? { arquivoMes } : {}),
      mes: Number.isInteger(b?.mes) && b.mes >= 1 && b.mes <= 12 ? b.mes : COMPETENCIA_PADRAO.mes,
      ano: Number.isInteger(b?.ano) && b.ano >= 2000 && b.ano <= 2100 ? b.ano : COMPETENCIA_PADRAO.ano,
      dias,
    };
  } catch { return { ...COMPETENCIA_PADRAO, dias: {} }; }
}
export function salvarDatasFm(v: EntradaDatasFm) {
  try { localStorage.setItem(CHAVE_DATAS_FM, JSON.stringify(v)); } catch { /* navegador sem armazenamento */ }
}
