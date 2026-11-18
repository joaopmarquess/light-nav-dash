/** Simular Datas FM (Laboratory, pedido de 18/11/2026): a partir da Competência (mês/ano), cada linha recebe um dia e mostra a data.
 * Arquivo, Dare, DIOPS e Pagamento caem no mês seguinte; Fechamento = Arquivo + REFERÊNCIA dias (De e Até saíram do grid em 18/11/2026).
 * Dia maior que o último dia do mês vira o último dia (ex.: 30 em fevereiro → 28 ou 29).
 * Último Dia (pedido de 18/11/2026): se o mês do Arquivo = mês da competência, dia do Arquivo − 1; senão, último dia útil do mês da competência (ultimoDiaUtil). */
export type IdDataFm = "arquivo" | "fechamento" | "dare" | "diops" | "pagamento";
export type LinhaDataFmDef = { id: IdDataFm; rotulo: string; diaPadrao: number; mesSeguinte: boolean; destaque?: boolean; separadorAntes?: boolean; pedeMes?: boolean; somaAoArquivo?: boolean; fixo?: boolean };

export const LINHAS_DATAS_FM: LinhaDataFmDef[] = [
  // Arquivo logo após a Competência (pedido de 18/11/2026).
  // Arquivo pede dia/mês (pedido de 18/11/2026); sem mês digitado, usa o mês seguinte à competência.
  // Padrão dos cenários (pedido de 18/11/2026): Arquivo 20/competência (dia 20 do mês da competência).
  { id: "arquivo", rotulo: "Arquivo", diaPadrao: 20, mesSeguinte: false, destaque: true, pedeMes: true },
  // De e Até retirados do grid (pedido de 18/11/2026); o Período acima do grid substitui.
  // Fechamento = data do Arquivo + REFERÊNCIA em dias corridos (pedido de 18/11/2026; substitui "dia no mês seguinte ao Arquivo").
  // Padrão dos cenários (pedido de 18/11/2026): Fechamento 25 (dias somados ao Arquivo).
  { id: "fechamento", rotulo: "Fechamento", diaPadrao: 25, mesSeguinte: true, somaAoArquivo: true },
  // Dare, DIOPS e Pagamento com REFERÊNCIA fixa, não editável (pedido de 18/11/2026): valores digitados antes são ignorados.
  { id: "dare", rotulo: "Dare", diaPadrao: 15, mesSeguinte: true, separadorAntes: true, fixo: true },
  { id: "diops", rotulo: "DIOPS", diaPadrao: 30, mesSeguinte: true, fixo: true },
  { id: "pagamento", rotulo: "Pagamento", diaPadrao: 30, mesSeguinte: true, fixo: true },
];
export const COMPETENCIA_PADRAO = { mes: 12, ano: 2026 };

/** arquivoMes: mês (1–12) digitado no Arquivo; ausente → mês da competência (padrão 20/competência, pedido de 18/11/2026). */
/** O campo "Referência de Último Dia" foi retirado (pedido de 18/11/2026); valores guardados antes são descartados ao ler. */
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
/** Contagem de dias (PRAZO e IMPACTOS) com dois dígitos, "0#" (pedidos de 18/11/2026): 9 → "09", −5 → "−05". */
export const formatarPrazo = (n: number) => `${n < 0 ? "−" : ""}${String(Math.abs(n)).padStart(2, "0")}`;
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
  const mesArquivo = arquivoMes ?? mes;
  const diaArquivo = dias.arquivo ?? LINHAS_DATAS_FM.find((l) => l.id === "arquivo")!.diaPadrao;
  const dataArquivo = dataDiaMes(mes, ano, diaArquivo, mesArquivo).data;
  return LINHAS_DATAS_FM.map((l) => {
    const dia = l.fixo ? l.diaPadrao : dias[l.id] ?? l.diaPadrao;
    if (l.pedeMes) {
      return { ...l, dia, mesLinha: mesArquivo, diaMes: `${dd(dia)}/${dd(mesArquivo)}`, ...dataDiaMes(mes, ano, dia, mesArquivo) };
    }
    if (l.somaAoArquivo) {
      const t = new Date(utcDe(dataArquivo) + dia * 86400000);
      return { ...l, dia, mesLinha: t.getUTCMonth() + 1, diaMes: undefined, data: `${dd(t.getUTCDate())}/${dd(t.getUTCMonth() + 1)}/${t.getUTCFullYear()}`, ajustado: false };
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

/** Chave da simulação única anterior ao Controle de Simulações; lida só para migrar para a lista. */
export const CHAVE_DATAS_FM = "laboratory.simularDatasFm.v1";
/** Valida uma entrada guardada (campos inválidos voltam ao padrão; REFERÊNCIA fixa é ignorada). */
export function normalizarEntradaFm(b: unknown): EntradaDatasFm {
  const o = (b && typeof b === "object" ? b : {}) as Record<string, any>;
  const dias: EntradaDatasFm["dias"] = {};
  for (const l of LINHAS_DATAS_FM) if (!l.fixo && Number.isInteger(o?.dias?.[l.id]) && o.dias[l.id] >= 1 && o.dias[l.id] <= 31) dias[l.id] = o.dias[l.id];
  const arquivoMes = Number.isInteger(o.arquivoMes) && o.arquivoMes >= 1 && o.arquivoMes <= 12 ? o.arquivoMes : undefined;
  return {
    ...(arquivoMes ? { arquivoMes } : {}),
    mes: Number.isInteger(o.mes) && o.mes >= 1 && o.mes <= 12 ? o.mes : COMPETENCIA_PADRAO.mes,
    ano: Number.isInteger(o.ano) && o.ano >= 2000 && o.ano <= 2100 ? o.ano : COMPETENCIA_PADRAO.ano,
    dias,
  };
}
/** Controle de Simulações (pedido de 18/11/2026): lista de simulações, cada uma com o Cenário (campo descricao, antes "Descrição") e as entradas da tela Simulação.
 * numero: enumeração do Cenário por ordem de inserção (pedido de 18/11/2026), fixa — excluir não renumera os demais. */
export type SimulacaoFm = { id: string; numero: number; descricao: string; criadaEm: string; atualizadaEm: string; entrada: EntradaDatasFm };
export const CHAVE_SIMULACOES_FM = "laboratory.simularDatasFm.simulacoes.v1";
export const DESCRICAO_FM_MAX = 200;

/** Lê a lista guardada; sem lista, a simulação única anterior (legado) vira a primeira, para nada se perder. */
export function lerSimulacoesFm(bruto: string | null, legado: string | null, agora: string, novoId: () => string): SimulacaoFm[] {
  try {
    if (bruto !== null) {
      const lista = JSON.parse(bruto);
      if (!Array.isArray(lista)) return [];
      const validas = lista.filter((s) => s && typeof s.id === "string" && s.id);
      // Sem número (guardadas antes da enumeração): numera na ordem da lista, depois do maior número existente.
      let proximo = Math.max(0, ...validas.map((s) => Number.isInteger(s.numero) && s.numero > 0 ? s.numero : 0));
      const usados = new Set<number>();
      return validas.map((s) => {
        const numero = Number.isInteger(s.numero) && s.numero > 0 && !usados.has(s.numero) ? s.numero : ++proximo;
        usados.add(numero);
        return {
        id: s.id,
        numero,
        descricao: typeof s.descricao === "string" ? s.descricao.slice(0, DESCRICAO_FM_MAX) : "",
        criadaEm: typeof s.criadaEm === "string" ? s.criadaEm : agora,
        atualizadaEm: typeof s.atualizadaEm === "string" ? s.atualizadaEm : (typeof s.criadaEm === "string" ? s.criadaEm : agora),
        entrada: normalizarEntradaFm(s.entrada),
      }; });
    }
    if (legado !== null) return [novaSimulacaoFm(novoId(), agora, 1, normalizarEntradaFm(JSON.parse(legado)))];
  } catch { /* conteúdo inválido */ }
  return [];
}
/** Próximo número de Cenário: maior número já usado (na lista ou no último gravado, ainda que excluído) + 1, para nunca reaproveitar números. */
export const proximoNumeroFm = (lista: SimulacaoFm[], ultimo = 0) => Math.max(0, ultimo, ...lista.map((s) => s.numero)) + 1;
/** Número do Cenário com dois dígitos ("01", "02"…). */
export const formatarNumeroFm = (n: number) => String(n).padStart(2, "0");
export function novaSimulacaoFm(id: string, agora: string, numero: number, entrada: EntradaDatasFm = { ...COMPETENCIA_PADRAO, dias: {} }, descricao = ""): SimulacaoFm {
  return { id, numero, descricao, criadaEm: agora, atualizadaEm: agora, entrada };
}
export function duplicarSimulacaoFm(s: SimulacaoFm, id: string, agora: string, numero: number): SimulacaoFm {
  return novaSimulacaoFm(id, agora, numero, { ...s.entrada, dias: { ...s.entrada.dias } }, `${s.descricao || `Cenário ${formatarNumeroFm(s.numero)}`} (cópia)`.slice(0, DESCRICAO_FM_MAX));
}
/** Botão Gravar da tela Simulação (pedido de 18/11/2026): substitui o Cenário de mesmo id ou insere o novo no fim, marcando a data de alteração (Cenário limitado a DESCRICAO_FM_MAX). */
export function gravarSimulacaoFm(lista: SimulacaoFm[], rascunho: SimulacaoFm, agora: string): SimulacaoFm[] {
  const gravada: SimulacaoFm = { ...rascunho, descricao: rascunho.descricao.slice(0, DESCRICAO_FM_MAX), atualizadaEm: agora };
  return lista.some((s) => s.id === rascunho.id) ? lista.map((s) => s.id === rascunho.id ? gravada : s) : [...lista, { ...gravada, criadaEm: agora }];
}
/** Há algo a gravar? Cenário novo (sem original) sempre; existente quando o Cenário ou as entradas mudaram. */
export function simulacaoAlteradaFm(original: SimulacaoFm | undefined, rascunho: SimulacaoFm) {
  if (!original) return true;
  return original.descricao !== rascunho.descricao || JSON.stringify(normalizarEntradaFm(original.entrada)) !== JSON.stringify(normalizarEntradaFm(rascunho.entrada));
}
/** Lista na ordem de inserção (número do Cenário). */
export const ordenarSimulacoesFm = (lista: SimulacaoFm[]) => [...lista].sort((a, b) => a.numero - b.numero);
export function carregarSimulacoesFm(): SimulacaoFm[] {
  try {
    const novoId = () => (globalThis.crypto?.randomUUID?.() ?? `fm-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    return lerSimulacoesFm(localStorage.getItem(CHAVE_SIMULACOES_FM), localStorage.getItem(CHAVE_DATAS_FM), new Date().toISOString(), novoId);
  } catch { return []; }
}
export const CHAVE_ULTIMO_NUMERO_FM = "laboratory.simularDatasFm.ultimoNumero.v1";
export function carregarUltimoNumeroFm() {
  try { const n = Number(localStorage.getItem(CHAVE_ULTIMO_NUMERO_FM)); return Number.isInteger(n) && n > 0 ? n : 0; } catch { return 0; }
}
export function salvarUltimoNumeroFm(n: number) {
  try { localStorage.setItem(CHAVE_ULTIMO_NUMERO_FM, String(n)); } catch { /* navegador sem armazenamento */ }
}
export function salvarSimulacoesFm(lista: SimulacaoFm[]) {
  try { localStorage.setItem(CHAVE_SIMULACOES_FM, JSON.stringify(lista)); } catch { /* navegador sem armazenamento */ }
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
  return { peona, fechamento: dias("fechamento"), dare: dias("dare"), diops: dias("diops"), pagamento: dias("pagamento") };
}

/** Premissas dos IMPACTOS (pedidos de 18/11/2026), classificadas em apenas três níveis: Crítico, Moderado e Ideal.
 * PEONA — dias do Período fora da competência aumentam o valor do PEONA (pedido de 18/11/2026): 0 a 4 Ideal; 5 a 12 Aceito (verde); 13 a 15 Moderado; acima de 15 Crítico;
 * FECHAMENTO — dias desde o Arquivo: menos de 10 Crítico; 10 a 19 Moderado; 20 ou mais Ideal;
 * DARE — entregue sempre no dia 15 (pedido de 18/11/2026): até 2 dias Crítico; 3 a 4 Moderado; 5 ou mais Ideal;
 * DIOPS — entregue sempre no dia 30: menos de 15 dias Moderado; 15 ou mais Ideal;
 * PAGAMENTO — sempre no dia 30, quanto mais perto do Fechamento, pior: menos de 15 dias Moderado; 15 ou mais Ideal. */
export const PEONA_IDEAL_ATE = 4, PEONA_ACEITO_ATE = 12, PEONA_MODERADO_ATE = 15, FECHAMENTO_MINIMO = 10, FECHAMENTO_IDEAL = 20, DARE_MINIMO = 3, DARE_IDEAL = 5, DIOPS_IDEAL = 15, PAGAMENTO_IDEAL = 15;
export type NivelImpactoFm = "ideal" | "aceito" | "moderado" | "critico";
export const STATUS_IMPACTO_FM: Record<NivelImpactoFm, string> = { ideal: "Ideal", aceito: "Aceito", moderado: "Moderado", critico: "Crítico" };
export type ImpactoFm = { id: "peona" | "fechamento" | "dare" | "diops" | "pagamento"; rotulo: string; dias: number; nivel: NivelImpactoFm; status: string; descricao: string };
// Toda contagem de dias com zero à esquerda, "0#" (pedido de 18/11/2026).
const plural = (n: number) => `${formatarPrazo(n)} ${Math.abs(n) === 1 ? "dia" : "dias"}`;
/** Lista de Simulações, depois de FECHAMENTO (pedido de 18/11/2026): dias entre o Arquivo e o Fechamento, ex.: "05 dias para Fechar a Folha". */
export const prazoFolhaFm = (e: EntradaDatasFm) => `${plural(simularDatasFm(e).find((l) => l.id === "fechamento")!.diasBase)} para Fechar a Folha`;
export function avaliarImpactosFm(e: EntradaDatasFm): ImpactoFm[] {
  const { peona, fechamento, dare, diops, pagamento } = impactosFm(e);
  const item = (id: ImpactoFm["id"], rotulo: string, dias: number, nivel: NivelImpactoFm, descricao: string): ImpactoFm =>
    ({ id, rotulo, dias, nivel, status: STATUS_IMPACTO_FM[nivel], descricao });
  return [
    peona === 0
      ? item("peona", "PEONA", peona, "ideal", "Todo o Período está no mês da competência.")
      : item("peona", "PEONA", peona,
          peona <= PEONA_IDEAL_ATE ? "ideal" : peona <= PEONA_ACEITO_ATE ? "aceito" : peona <= PEONA_MODERADO_ATE ? "moderado" : "critico",
          `${plural(peona)} do Período fora do mês da competência aumentam o valor do PEONA; até ${formatarPrazo(PEONA_IDEAL_ATE)} é ideal, até ${formatarPrazo(PEONA_ACEITO_ATE)} é aceito e acima de ${formatarPrazo(PEONA_MODERADO_ATE)} dias é crítico.`),
    // FECHAMENTO no quadro (pedido de 18/11/2026): dias desde o Arquivo.
    fechamento < FECHAMENTO_MINIMO
      ? item("fechamento", "FECHAMENTO", fechamento, "critico", `${plural(fechamento)} entre o Arquivo e o Fechamento; o mínimo é ${formatarPrazo(FECHAMENTO_MINIMO)} e o ideal, ${formatarPrazo(FECHAMENTO_IDEAL)}.`)
      : fechamento < FECHAMENTO_IDEAL
        ? item("fechamento", "FECHAMENTO", fechamento, "moderado", `${plural(fechamento)} entre o Arquivo e o Fechamento: atende ao mínimo de ${formatarPrazo(FECHAMENTO_MINIMO)}, mas fica abaixo do ideal de ${formatarPrazo(FECHAMENTO_IDEAL)}.`)
        : item("fechamento", "FECHAMENTO", fechamento, "ideal", `${plural(fechamento)} entre o Arquivo e o Fechamento, dentro do ideal de ${formatarPrazo(FECHAMENTO_IDEAL)}.`),
    dare < DARE_MINIMO
      ? item("dare", "DARE", dare, "critico", `${plural(dare)} para fechar o Dare (entrega no dia 15); o mínimo é ${formatarPrazo(DARE_MINIMO)} e o ideal, ${formatarPrazo(DARE_IDEAL)}.`)
      : dare < DARE_IDEAL
        ? item("dare", "DARE", dare, "moderado", `${plural(dare)} para fechar o Dare (entrega no dia 15): atende ao mínimo de ${formatarPrazo(DARE_MINIMO)}, mas fica abaixo do ideal de ${formatarPrazo(DARE_IDEAL)}.`)
        : item("dare", "DARE", dare, "ideal", `${plural(dare)} para fechar o Dare (entrega no dia 15), dentro do ideal de ${formatarPrazo(DARE_IDEAL)}.`),
    diops < DIOPS_IDEAL
      ? item("diops", "DIOPS", diops, "moderado", `${plural(diops)} até a entrega do DIOPS (dia 30); o ideal é ter pelo menos ${formatarPrazo(DIOPS_IDEAL)}.`)
      : item("diops", "DIOPS", diops, "ideal", `${plural(diops)} até a entrega do DIOPS (dia 30), dentro do ideal de ${formatarPrazo(DIOPS_IDEAL)}.`),
    pagamento < PAGAMENTO_IDEAL
      ? item("pagamento", "PAGAMENTO", pagamento, "moderado", `${plural(pagamento)} entre o Fechamento e o Pagamento (dia 30); quanto mais perto do Fechamento, pior. O ideal é ter pelo menos ${formatarPrazo(PAGAMENTO_IDEAL)}.`)
      : item("pagamento", "PAGAMENTO", pagamento, "ideal", `${plural(pagamento)} entre o Fechamento e o Pagamento (dia 30), dentro do ideal de ${formatarPrazo(PAGAMENTO_IDEAL)}.`),
  ];
}

