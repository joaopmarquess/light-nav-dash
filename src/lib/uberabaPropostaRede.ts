// Proposta de Credenciamento e Gestão de Rede (Proj. Uberaba, pedido de 18/11/2026), destinada à Siga Soluções.
// Tópicos (títulos do Dênis, 18/11/2026): 1 Contexto e Objeto da Proposta; 2 Estruturação da Rede Assistencial ( quadro da seção Credenciamento e, antes do tópico 3, o quadro da seção Resultado — pedido de 18/11/2026);
// 3 Modelo de Gestão da Rede (quadro dos Parâmetros de Resultados Rede); 4 Condições Gerais (texto fixo do Dênis, nunca redigido pela IA).
// A IA redige os textos dos tópicos 1 a 3 só com estes dados;
// o PDF usa o texto padrão até o usuário aprovar a revisão ("Incluir no PDF"). Tudo fica guardado neste navegador.
import { moedaCredenciamento } from "@/lib/uberabaCredenciamento";
import { ANO_RESULTADO_REDE, lerVidasSimulacao, resultadoRede, vidasEstimadasRede, type VidasSimulacao } from "@/lib/uberabaResultadoRede";
import {
  carregarAutorizados, carregarQuantidadesItens, carregarValores, itensExibidos, linhasQuantidadeCredenciamentos, quantidadeItem, type QuantidadesItens,
} from "@/lib/uberabaQuantidadeCredenciamentos";
import type { ParametrosRede } from "@/lib/uberabaParametrosRede";
import { REDE_UBERABA } from "@/lib/uberabaFrentes";

export const DESTINATARIO_PROPOSTA_REDE = "Siga Soluções";

export const SECOES_REDE = [
  { id: "introducao", titulo: "1. Contexto e Objeto da Proposta" },
  { id: "condicoes", titulo: "2. Estruturação da Rede Assistencial" },
  { id: "gestao", titulo: "3. Modelo de Gestão da Rede" },
] as const;
export type SecaoRedeId = (typeof SECOES_REDE)[number]["id"];

/** Tópico 4 (textos do Dênis, 18/11/2026): texto de abertura e condições fixas, sem texto da IA. */
export const TITULO_CONDICOES_GERAIS_REDE = "4. Condições Gerais";
export const TEXTO_CONDICOES_GERAIS_REDE =
  "As condições a seguir delimitam as responsabilidades e o período de atuação previsto para esta etapa do Projeto Bensaúde|Uberaba, especialmente quanto à execução dos serviços durante o ano de implantação e à posterior internalização das atividades pelo Bensaúde.";
export const CONDICOES_GERAIS_REDE: readonly { item: string; valor: string }[] = [
  { item: "Contratada", valor: "A contratação será formalizada com a Siga Soluções, responsável pela composição e disponibilização da equipe necessária à execução dos serviços, incluindo médico auditor." },
  { item: "Período de atuação", valor: "Os serviços objeto desta proposta serão prestados durante o ano de 2027." },
  { item: "Vigência financeira", valor: "As condições financeiras desta proposta, incluindo os valores de credenciamento e a remuneração pela gestão da rede, aplicam-se exclusivamente ao ano de 2027 e não se estendem a períodos posteriores." },
  { item: "Transição da gestão", valor: "A partir de 2028, a gestão da rede assistencial e o acompanhamento da sinistralidade passarão a ser conduzidos diretamente pelo Bensaúde." },
];

/** Subtítulo e texto antes do quadro Resultado, no tópico 2 (textos do Dênis, 18/11/2026). */
export const SUBTITULO_PROJECAO_REDE = "Projeção financeira";
export const TEXTO_PROJECAO_REDE =
  "Considerando o cronograma previsto para formação da rede e o início da gestão, apresenta-se a seguir a projeção mensal da remuneração ao longo de 2027, contemplando os valores relativos ao credenciamento e à gestão da rede.";
export type TextosRede = Record<SecaoRedeId, string>;
export const TEXTO_REDE_MAX = 4000;

/** Textos dos tópicos 1 a 3 fornecidos pelo Dênis (18/11/2026), usados no PDF até uma revisão ser aprovada. */
export const TEXTOS_REDE_PADRAO: TextosRede = {
  introducao:
    "Esta proposta integra o Projeto Bensaúde|Uberaba e estabelece as condições para o credenciamento e a gestão inicial da rede assistencial necessária à implantação e ao desenvolvimento da operação do Bensaúde em Uberaba (MG). O documento contempla a composição prevista da rede, as condições comerciais para sua formação, o modelo de remuneração pela gestão e as demais condições aplicáveis à prestação dos serviços.",
  condicoes:
    "A estruturação da rede assistencial foi definida considerando as necessidades previstas para o início da operação do Bensaúde em Uberaba. A composição contempla especialidades médicas, hospitais, serviços de apoio diagnóstico e terapêutico, além de profissionais e serviços assistenciais complementares, conforme detalhamento a seguir.",
  gestao:
    "Concluída a etapa inicial de estruturação da rede, inicia-se a fase de gestão assistencial, destinada a acompanhar e sustentar a operação da rede credenciada durante o período de implantação do Projeto Bensaúde|Uberaba. A remuneração dessa etapa será composta inicialmente por parcelas mensais fixas e, posteriormente, passará a acompanhar a evolução da carteira de beneficiários.",
};

/** Nota do quadro de quantidades: só a condição de pagamento da nota das Condições Rede, que vale para o Credenciamento
 * (o restante falava da disponibilidade das redes de referência, que não é mais o que o quadro mostra). */
export const NOTA_CONDICOES_REDE = "O pagamento dependerá da conclusão, aprovação e formalização de cada credenciamento pelo Bensaúde.";

/** Quadro de quantidades do tópico 2 (pedido de 18/11/2026): montado a partir da seção Credenciamento, mesmas colunas da tela. */
export const COLUNAS_CONDICOES_REDE = ["TIPO CREDENCIADO", "ATÉ", "VALOR", "ADESÃO"] as const; // "ATÉ" no lugar de "QTDE." (pedido de 18/11/2026): quantidade máxima a credenciar
const inteiro = (n: number) => n.toLocaleString("pt-BR");
export type QuantidadesRede = ReturnType<typeof linhasQuantidadeCredenciamentos>;
export const quantidadesRedeAtuais = (): QuantidadesRede => linhasQuantidadeCredenciamentos(carregarAutorizados(), carregarValores());

/** Tipos abertos item a item no quadro (pedido de 18/11/2026): todos, exceto Especialidades médicas. */
export const TIPOS_FECHADOS_REDE: readonly string[] = ["medicos"];
export type LinhaCondicaoRede = { celulas: string[]; item: boolean };
/** Tópico 2: uma linha por tipo do Credenciamento (Qtde., Valor e Adesão da tela), seguida dos itens dos tipos abertos
 * (quantidade digitada na tela ou o padrão; Valor e Adesão ficam no tipo), e a linha TOTAL. */
export function quadroCondicoesRede(q: QuantidadesRede = quantidadesRedeAtuais(), itens: QuantidadesItens = lerQuantidadesItens()): LinhaCondicaoRede[] {
  return [
    ...q.linhas.flatMap((l) => [
      { celulas: [l.tipo, inteiro(l.autorizado), moedaCredenciamento(l.valor), moedaCredenciamento(l.adesao)], item: false },
      ...(TIPOS_FECHADOS_REDE.includes(l.id) ? [] : itensExibidos(l.id).map((i) => ({ celulas: [i.nome, inteiro(quantidadeItem(l.id, i.nome, itens)), "", ""], item: true }))),
    ]),
    { celulas: ["TOTAL", inteiro(q.total.autorizado), "", moedaCredenciamento(q.total.adesao)], item: false },
  ];
}
export const linhasCondicoesRede = (q: QuantidadesRede = quantidadesRedeAtuais(), itens: QuantidadesItens = lerQuantidadesItens()): string[][] =>
  quadroCondicoesRede(q, itens).map((l) => l.celulas);
const lerQuantidadesItens = (): QuantidadesItens => (typeof localStorage === "undefined" ? {} : carregarQuantidadesItens());

/** Quadro da seção Resultado, no fim do tópico 2 (pedido de 18/11/2026): mesmas colunas e valores da tela, com VIDAS "estimadas". */
export const COLUNAS_RESULTADO_REDE = ["MÊS", "ADESÃO", "MENSALIDADE", "VIDAS", "TOTAL"] as const;
export function linhasResultadoRede(p: ParametrosRede, q: QuantidadesRede = quantidadesRedeAtuais(), vidas: VidasSimulacao = lerVidasSimulacao()): string[][] {
  const { linhas, total } = resultadoRede(q.total.adesao, p, vidas);
  return [
    ...linhas.map((l) => [l.mes, moedaCredenciamento(l.adesao), moedaCredenciamento(l.mensalidade), vidasEstimadasRede(l), moedaCredenciamento(l.total)]),
    ["TOTAL", moedaCredenciamento(total.adesao), moedaCredenciamento(total.mensalidade), "", moedaCredenciamento(total.total)],
  ];
}

/** Mês "Iniciar em" (1 = 01/2027) como MM/AAAA; passa para o ano seguinte depois do mês 12. */
export function mesInicioRede(iniciarEm: number): string {
  const n = Math.max(1, Math.trunc(iniciarEm));
  return `${String(((n - 1) % 12) + 1).padStart(2, "0")}/${ANO_RESULTADO_REDE + Math.floor((n - 1) / 12)}`;
}

/** Tópico 3: os Parâmetros de Resultados Rede, com os valores atuais da tela. */
export function linhasParametrosRede(p: ParametrosRede): [string, string][] {
  return [
    ["Parcelas fixas", inteiro(p.parcelasFixas)],
    ["Início das parcelas", mesInicioRede(p.iniciarEm)],
    ["Valor da parcela", moedaCredenciamento(p.valorParcela)],
    ["Valor por vida (após as parcelas fixas)", moedaCredenciamento(p.valorPorVida)],
  ];
}

const EXTENSO = ["", "primeiro", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze"];
/** Quantidade de parcelas por extenso no texto ("seis primeiros meses"; 1 → "No primeiro mês"). */
const primeirosMeses = (n: number) => (n === 1 ? "No primeiro mês" : `Nos ${EXTENSO[n] ?? inteiro(n)} primeiros meses`);
/** Texto abaixo dos Parâmetros (redação do Dênis, 18/11/2026) com os valores atuais da tela, para nunca divergir do quadro. */
export function regraMensalidadeRede(p: ParametrosRede): string {
  return `${primeirosMeses(p.parcelasFixas)} da gestão, a remuneração mensal será de ${moedaCredenciamento(p.valorParcela)}, com início em ${mesInicioRede(p.iniciarEm)}. Encerrado esse período, a remuneração será calculada à razão de ${moedaCredenciamento(p.valorPorVida)} por vida vendida acumulada.`;
}

export type DadosRascunhoRede = {
  destinatario: string;
  condicoes: { colunas: string[]; linhas: string[][]; nota: string; resultado: { colunas: string[]; linhas: string[][] } };
  gestao: { parametros: { item: string; valor: string }[]; regra: string; frentes: { frente: string; responsaveis: string[] }[] };
  condicoesGerais: { item: string; valor: string }[];
};

export function dadosRascunhoRede(p: ParametrosRede, q: QuantidadesRede = quantidadesRedeAtuais(), vidas: VidasSimulacao = lerVidasSimulacao()): DadosRascunhoRede {
  const gestao = REDE_UBERABA.grupos.find((g) => g.id === "gestao-rede");
  return {
    destinatario: DESTINATARIO_PROPOSTA_REDE,
    condicoes: {
      colunas: [...COLUNAS_CONDICOES_REDE], linhas: linhasCondicoesRede(q), nota: NOTA_CONDICOES_REDE,
      resultado: { colunas: [...COLUNAS_RESULTADO_REDE], linhas: linhasResultadoRede(p, q, vidas) },
    },
    gestao: {
      parametros: linhasParametrosRede(p).map(([item, valor]) => ({ item, valor })),
      regra: regraMensalidadeRede(p),
      frentes: (gestao?.itens ?? []).map((i) => ({ frente: i.titulo, responsaveis: i.subitens?.length ? [...i.subitens] : [i.rotulo ?? ""].filter(Boolean) })),
    },
    condicoesGerais: CONDICOES_GERAIS_REDE.map((c) => ({ ...c })),
  };
}

const textosDe = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(textosDe) : v && typeof v === "object" ? Object.values(v).flatMap(textosDe) : [];

/** Assinatura curta dos dados: muda sempre que um parâmetro ou valor do quadro muda. */
export function assinaturaDadosRede(d: DadosRascunhoRede): string {
  const s = JSON.stringify(d);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const NUMERO = /\d+(?:[.,]\d+)*/g;
/** Números do texto ausentes dos dados (os números dos tópicos 1 a 4 são aceitos): alerta de valor criado pela IA. */
export function numerosForaDosDadosRede(texto: string, dados: DadosRascunhoRede): string[] {
  const permitidos = new Set<string>(["1", "2", "3", "4"]);
  textosDe(dados).forEach((t) => (t.match(NUMERO) ?? []).forEach((n) => permitidos.add(n)));
  return [...new Set((texto.match(NUMERO) ?? []).filter((n) => !permitidos.has(n)))];
}

export const textosRedePadrao = (): TextosRede => ({ ...TEXTOS_REDE_PADRAO });

export function normalizarTextosRede(v: unknown): TextosRede {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return Object.fromEntries(SECOES_REDE.map(({ id }) => {
    const t = typeof o[id] === "string" ? (o[id] as string) : "";
    return [id, t.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, TEXTO_REDE_MAX)];
  })) as TextosRede;
}

/** Junta o retorno da IA ao texto em revisão: tópico vazio na resposta mantém o texto atual. */
export function mesclarRascunhoRede(atual: TextosRede, ia: unknown): TextosRede {
  const novo = normalizarTextosRede(ia);
  return normalizarTextosRede(Object.fromEntries(SECOES_REDE.map(({ id }) => [id, novo[id] || atual[id]])));
}

export type EstadoTextosRede = {
  rascunho: TextosRede | null;
  assinaturaRascunho: string | null;
  geradoEm: string | null;
  aprovado: TextosRede | null;
  assinaturaAprovado: string | null;
  aprovadoEm: string | null;
};
export const estadoRedeVazio = (): EstadoTextosRede => ({ rascunho: null, assinaturaRascunho: null, geradoEm: null, aprovado: null, assinaturaAprovado: null, aprovadoEm: null });

/** v2: os textos do Dênis (18/11/2026) substituem a revisão aprovada antes deles. */
export const CHAVE_TEXTOS_REDE = "uberaba-proposta-rede-textos-v2";
const str = (v: unknown) => (typeof v === "string" ? v : null);

export function lerTextosRede(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): EstadoTextosRede {
  try {
    const o = JSON.parse(storage?.getItem(CHAVE_TEXTOS_REDE) ?? "null");
    if (!o || typeof o !== "object") return estadoRedeVazio();
    return {
      rascunho: o.rascunho ? normalizarTextosRede(o.rascunho) : null,
      assinaturaRascunho: str(o.assinaturaRascunho),
      geradoEm: str(o.geradoEm),
      aprovado: o.aprovado ? normalizarTextosRede(o.aprovado) : null,
      assinaturaAprovado: str(o.assinaturaAprovado),
      aprovadoEm: str(o.aprovadoEm),
    };
  } catch {
    return estadoRedeVazio();
  }
}

export function gravarTextosRede(v: EstadoTextosRede, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try { storage?.setItem(CHAVE_TEXTOS_REDE, JSON.stringify(v)); } catch { /* armazenamento indisponível */ }
}

export const aprovarTextosRede = (e: EstadoTextosRede, textos: TextosRede, quando: Date = new Date()): EstadoTextosRede =>
  ({ ...e, rascunho: normalizarTextosRede(textos), aprovado: normalizarTextosRede(textos), assinaturaAprovado: e.assinaturaRascunho, aprovadoEm: quando.toISOString() });

/** Texto que o PDF usa: o aprovado; sem aprovação, o texto padrão. */
export const textosRedeParaPdf = (e: EstadoTextosRede): TextosRede => e.aprovado ?? TEXTOS_REDE_PADRAO;

/** Tópicos aprovados que citam valores em R$ ou números ausentes dos dados atuais (ex.: parâmetro alterado depois da aprovação). */
export function topicosRedeDesatualizados(e: EstadoTextosRede, dados: DadosRascunhoRede): string[] {
  if (!e.aprovado) return [];
  return SECOES_REDE.filter((s) => numerosForaDosDadosRede(e.aprovado![s.id], dados).length > 0).map((s) => s.titulo);
}
