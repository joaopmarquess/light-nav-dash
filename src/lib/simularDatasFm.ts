/** Simular Datas FM (Laboratory, pedido de 18/11/2026): a partir da Competência (mês/ano), cada linha recebe um dia e mostra a data.
 * Arquivo, Fechamento, Dare, DIOPS e Pagamento caem no mês seguinte (De e Até saíram do grid em 18/11/2026).
 * Dia maior que o último dia do mês vira o último dia (ex.: 30 em fevereiro → 28 ou 29).
 * Último Dia (pedido de 18/11/2026): se o mês do Arquivo = mês da competência, dia do Arquivo − 1; senão, último dia útil do mês da competência (ultimoDiaUtil). */
export type IdDataFm = "arquivo" | "fechamento" | "dare" | "diops" | "pagamento";
export type LinhaDataFmDef = { id: IdDataFm; rotulo: string; diaPadrao: number; mesSeguinte: boolean; destaque?: boolean; separadorAntes?: boolean; pedeMes?: boolean; mesDoArquivo?: boolean };

export const LINHAS_DATAS_FM: LinhaDataFmDef[] = [
  // Arquivo logo após a Competência (pedido de 18/11/2026).
  // Arquivo pede dia/mês (pedido de 18/11/2026); sem mês digitado, usa o mês seguinte à competência.
  { id: "arquivo", rotulo: "Arquivo", diaPadrao: 5, mesSeguinte: true, destaque: true, pedeMes: true },
  // De e Até retirados do grid (pedido de 18/11/2026); o Período acima do grid substitui.
  // Fechamento: dia indicado no mês subsequente ao do Arquivo (pedido de 18/11/2026).
  { id: "fechamento", rotulo: "Fechamento", diaPadrao: 10, mesSeguinte: true, mesDoArquivo: true },
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

const utcDe = (data: string) => { const [d, m, a] = data.split("/").map(Number); return Date.UTC(a, m - 1, d); };

/** Coluna PRAZO, antes DIAS (pedidos de 18/11/2026), em dias corridos: Dare, DIOPS e Pagamento = data − Fechamento; Arquivo e Fechamento = data − Arquivo. */
const DIAS_DESDE_FECHAMENTO: IdDataFm[] = ["dare", "diops", "pagamento"];
export function simularDatasFm(e: EntradaDatasFm) {
  const linhas = linhasDatasFm(e);
  const base = (id: IdDataFm) => utcDe(linhas.find((l) => l.id === id)!.data);
  const arquivo = base("arquivo"), fechamento = base("fechamento");
  return linhas.map((l) => {
    const desdeFechamento = DIAS_DESDE_FECHAMENTO.includes(l.id);
    return { ...l, diasBase: Math.round((utcDe(l.data) - (desdeFechamento ? fechamento : arquivo)) / 86400000), base: desdeFechamento ? "Fechamento" : "Arquivo" };
  });
}

function linhasDatasFm({ mes, ano, dias, arquivoMes }: EntradaDatasFm) {
  const mesArquivo = arquivoMes ?? (mes === 12 ? 1 : mes + 1);
  return LINHAS_DATAS_FM.map((l) => {
    const dia = dias[l.id] ?? l.diaPadrao;
    if (l.pedeMes) {
      return { ...l, dia, mesLinha: mesArquivo, diaMes: `${dd(dia)}/${dd(mesArquivo)}`, ...dataDiaMes(mes, ano, dia, mesArquivo) };
    }
    if (l.mesDoArquivo) {
      const anoArquivo = mesArquivo >= mes ? ano : ano + 1;
      const m = mesArquivo === 12 ? 1 : mesArquivo + 1, a = mesArquivo === 12 ? anoArquivo + 1 : anoArquivo;
      const d = Math.min(Math.max(1, dia), ultimoDia(a, m));
      return { ...l, dia, mesLinha: m, diaMes: undefined, data: `${dd(d)}/${dd(m)}/${a}`, ajustado: d !== dia };
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

const dataUtc = (t: Date) => `${dd(t.getUTCDate())}/${dd(t.getUTCMonth() + 1)}/${t.getUTCFullYear()}`;
/** Último Dia da simulação: Arquivo no mês da competência → dia do Arquivo − 1 (dia 1 recua ao mês anterior); senão, último dia útil da competência. */
export function ultimoDiaFm(e: EntradaDatasFm): { data: string; utc: number } {
  const arquivo = simularDatasFm(e).find((l) => l.id === "arquivo")!;
  if (arquivo.mesLinha === e.mes) {
    const [d, m, a] = arquivo.data.split("/").map(Number);
    const utc = Date.UTC(a, m - 1, d) - DIA_MS;
    return { data: dataUtc(new Date(utc)), utc };
  }
  const u = ultimoDiaUtil(e.mes, e.ano);
  return { data: u.data, utc: Date.UTC(e.ano, e.mes - 1, u.dia) };
}
/** Período (pedido de 18/11/2026): De = dia seguinte ao Último Dia, um mês antes (Arquivo 20/12 → 20/11 a 19/12); dia além do fim do mês vira o último dia. */
export function periodoFm(e: EntradaDatasFm) {
  const ultimo = ultimoDiaFm(e);
  const seguinte = new Date(ultimo.utc + DIA_MS);
  const m = seguinte.getUTCMonth() === 0 ? 12 : seguinte.getUTCMonth();
  const a = seguinte.getUTCMonth() === 0 ? seguinte.getUTCFullYear() - 1 : seguinte.getUTCFullYear();
  const d = Math.min(seguinte.getUTCDate(), ultimoDia(a, m));
  return { de: `${dd(d)}/${dd(m)}/${a}`, ate: ultimo.data };
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

/** IMPACTOS (pedido de 18/11/2026): PEONA = dias do Período fora do mês da competência; DARE e DIOPS = coluna DIAS dessas linhas. */
export function impactosFm(e: EntradaDatasFm) {
  const p = periodoFm(e);
  let peona = 0;
  for (let t = utcDe(p.de), fim = utcDe(p.ate); t <= fim; t += DIA_MS) {
    const d = new Date(t);
    if (d.getUTCMonth() + 1 !== e.mes || d.getUTCFullYear() !== e.ano) peona++;
  }
  const linhas = simularDatasFm(e);
  const dias = (id: IdDataFm) => linhas.find((l) => l.id === id)!.diasBase;
  return { peona, dare: dias("dare"), diops: dias("diops") };
}

/** Premissas dos IMPACTOS (pedido de 18/11/2026):
 * PEONA — quanto mais dias do Período fora da competência, maior o impacto (aumento do valor do PEONA);
 * DARE — entregue sempre no dia 15; menos de 5 dias para fechar é crítico, o ideal é 10 ou mais;
 * DIOPS — entregue sempre no dia 30; o ideal é ter pelo menos 15 dias. */
export const DARE_MINIMO = 5, DARE_IDEAL = 10, DIOPS_IDEAL = 15;
export type NivelImpactoFm = "ok" | "atencao" | "critico";
export type ImpactoFm = { id: "peona" | "dare" | "diops"; rotulo: string; dias: number; nivel: NivelImpactoFm; status: string; descricao: string };
const plural = (n: number) => `${n} ${Math.abs(n) === 1 ? "dia" : "dias"}`;
export function avaliarImpactosFm(e: EntradaDatasFm): ImpactoFm[] {
  const { peona, dare, diops } = impactosFm(e);
  return [
    peona > 0
      ? { id: "peona", rotulo: "PEONA", dias: peona, nivel: "atencao", status: "Com impacto",
          descricao: `${plural(peona)} do Período fora do mês da competência aumentam o valor do PEONA; quanto mais dias, maior o impacto.` }
      : { id: "peona", rotulo: "PEONA", dias: peona, nivel: "ok", status: "Sem impacto", descricao: "Todo o Período está no mês da competência." },
    dare < DARE_MINIMO
      ? { id: "dare", rotulo: "DARE", dias: dare, nivel: "critico", status: "Crítico",
          descricao: `${plural(dare)} para fechar o Dare (entrega no dia 15); o mínimo é ${DARE_MINIMO} e o ideal, ${DARE_IDEAL}.` }
      : dare < DARE_IDEAL
        ? { id: "dare", rotulo: "DARE", dias: dare, nivel: "atencao", status: "Abaixo do ideal",
            descricao: `${plural(dare)} para fechar o Dare (entrega no dia 15): atende ao mínimo de ${DARE_MINIMO}, mas fica abaixo do ideal de ${DARE_IDEAL}.` }
        : { id: "dare", rotulo: "DARE", dias: dare, nivel: "ok", status: "Ideal",
            descricao: `${plural(dare)} para fechar o Dare (entrega no dia 15), dentro do ideal de ${DARE_IDEAL}.` },
    diops < DIOPS_IDEAL
      ? { id: "diops", rotulo: "DIOPS", dias: diops, nivel: "atencao", status: "Abaixo do ideal",
          descricao: `${plural(diops)} até a entrega do DIOPS (dia 30); o ideal é ter pelo menos ${DIOPS_IDEAL}.` }
      : { id: "diops", rotulo: "DIOPS", dias: diops, nivel: "ok", status: "Ideal",
          descricao: `${plural(diops)} até a entrega do DIOPS (dia 30), dentro do ideal de ${DIOPS_IDEAL}.` },
  ];
}

