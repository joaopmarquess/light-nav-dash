// Proposta de Credenciamento e Gestão de Rede (Proj. Uberaba, pedido de 18/11/2026), destinada à Siga Soluções.
// Modelo do Dênis (Proposta_Rede_Uberaba_v1.docx, 19/11/2026): 1 Introdução; 2 Credenciamento por Captação (Quadro 1);
// 3 Gestão da Rede (Quadro 2 dos Parâmetros, Projeção financeira com o Quadro 3 do Resultado); 4 Condições Gerais (subtópicos fixos do Dênis, nunca redigidos pela IA).
// A IA redige os textos dos tópicos 1 a 3 só com estes dados;
// o PDF usa o texto padrão até o usuário aprovar a revisão ("Incluir no PDF"). Tudo fica guardado neste navegador.
import { moedaCredenciamento } from "@/lib/uberabaCredenciamento";
import { ANO_RESULTADO_REDE, lerVidasSimulacao, resultadoRede, vidasEstimadasRede, type VidasSimulacao } from "@/lib/uberabaResultadoRede";
import {
  carregarAutorizados, carregarQuantidadesItens, carregarValores, itensExibidos, linhasQuantidadeCredenciamentos, quantidadeItem, type QuantidadesItens,
} from "@/lib/uberabaQuantidadeCredenciamentos";
import type { ParametrosRede } from "@/lib/uberabaParametrosRede";
import { REDE_UBERABA } from "@/lib/uberabaFrentes";
import { paragrafosDe } from "@/lib/uberabaPropostaTextos";

export const DESTINATARIO_PROPOSTA_REDE = "Siga Soluções";

export const SECOES_REDE = [
  { id: "introducao", titulo: "1. Introdução" },
  { id: "condicoes", titulo: "2. Credenciamento por Captação" },
  { id: "gestao", titulo: "3. Gestão da Rede" },
] as const;
export type SecaoRedeId = (typeof SECOES_REDE)[number]["id"];

/** Tópico 4 (textos do Dênis, 18/11/2026): texto de abertura e condições fixas, sem texto da IA. */
export const TITULO_CONDICOES_GERAIS_REDE = "4. Condições Gerais";
/** Definição da Contratada (pedido de 18/11/2026): a mesma frase abre a proposta (fim do tópico 1) e define a Contratada nas Condições Gerais. */
export const TEXTO_CONTRATADA_REDE =
  "A contratação será formalizada com a Siga Soluções, responsável pela composição e disponibilização da equipe necessária à execução dos serviços, incluindo o profissional médico responsável pelo relacionamento com a rede credenciada, pela avaliação da qualidade dos profissionais, pela auditoria e pelo controle de desperdícios.";
export const CONDICOES_GERAIS_REDE: readonly { item: string; valor: string }[] = [
  { item: "Contratada", valor: TEXTO_CONTRATADA_REDE },
  { item: "Subordinação", valor: "A gestão da rede pela Siga Soluções será subordinada à Diretoria de Operações do Bensaúde, sob responsabilidade de Fabiana Matos, e contará com o suporte das equipes internas do Bensaúde." },
  { item: "Abrangência", valor: "Esta proposta refere-se exclusivamente à gestão da rede assistencial da cidade de Uberaba (MG), não se aplicando às demais novas praças do Triângulo Mineiro, nem às atuais praças de atuação do Bensaúde." },
  { item: "Período de atuação e vigência financeira", valor: "As condições financeiras desta proposta, incluindo os valores de credenciamento e a remuneração pela gestão da rede, aplicam-se exclusivamente ao ano de 2027 e não se estendem a períodos posteriores." },
  { item: "Investimento do Bensaúde", valor: "O valor excedente aos R$ 200,00 por captação (primeira proposta) e as parcelas mensais fixas da gestão foram considerados investimento do Bensaúde nesta operação. Assim, o sucesso do projeto e o consequente retorno desse investimento dependem da qualidade dos serviços prestados e do empenho no cumprimento das metas." },
  { item: "Transição da gestão", valor: "A partir de 2028, a gestão da rede assistencial passará a ser conduzida diretamente pelo Bensaúde." },
];

/** Subtítulo e texto antes do quadro Resultado, no tópico 2 (textos do Dênis, 18/11/2026). */
export const SUBTITULO_PROJECAO_REDE = "Projeção financeira";
/** Texto abaixo do Quadro 3 (modelo do Dênis, 19/11/2026, redação dele sem alteração). */
export const NOTA_PROJECAO_REDE =
  "O total do credenciamento é estimado conforme a quantidade efetiva de credenciamentos, respeitado o limite da coluna “ATÉ” do Tópico 2. Seu pagamento será realizado em duas etapas: 30% na assinatura do contrato e os outros 70% quando toda a rede mínima estiver credenciada. As seis parcelas mensais fixas terão início no mês subsequente à assinatura do contrato.";
export const TEXTO_PROJECAO_REDE =
  "Apresentam-se a seguir os valores e as condições de pagamento do credenciamento por captação/adesão e das parcelas fixas de gestão da rede:";
export type TextosRede = Record<SecaoRedeId, string>;
export const TEXTO_REDE_MAX = 4000;

/** Textos dos tópicos 1 a 3 do modelo do Dênis (19/11/2026), usados no PDF e no Word até uma revisão ser aprovada. */
export const TEXTOS_REDE_PADRAO: TextosRede = {
  introducao:
    "Esta proposta integra o Projeto Bensaúde|Uberaba e estabelece as condições para o credenciamento e a gestão inicial da rede assistencial necessária à implantação e ao desenvolvimento da operação do Bensaúde em Uberaba (MG). A contratação será formalizada com a Siga Soluções, responsável pela composição e disponibilização da equipe necessária à execução dos serviços, incluindo o profissional médico responsável pelo relacionamento, avaliação e auditoria da rede credenciada. A contratação ocorrerá para o decorrer do ano de 2027, encerrando-se ao final do exercício.",
  condicoes:
    "A estruturação da rede assistencial foi definida considerando as necessidades previstas para o início da operação do Bensaúde em Uberaba. Esta etapa será remunerada pelo valor definido para a adesão à captação realizada e dependerá da conclusão, aprovação e formalização de cada credenciamento pelo Bensaúde. A composição da rede será definida, conforme detalhamento a seguir:",
  gestao:
    "A gestão da rede destina-se a acompanhar e sustentar a operação da rede credenciada durante o período de implantação do Projeto. A remuneração dessa etapa será composta por seis parcelas mensais fixas, com início no mês subsequente à assinatura do contrato, conforme detalhamento a seguir:",
};

/** Condição de pagamento do Credenciamento: desde o modelo de 19/11/2026 faz parte do texto do tópico 2; segue só nos dados da IA. */
export const NOTA_CONDICOES_REDE = "O pagamento dependerá da conclusão, aprovação e formalização de cada credenciamento pelo Bensaúde.";

/** Quadro de quantidades do tópico 2 (pedido de 18/11/2026): montado a partir da seção Credenciamento, mesmas colunas da tela. */
export const COLUNAS_CONDICOES_REDE = ["TIPO CREDENCIADO", "ATÉ", "POR ADESÃO", "TOTAL"] as const; // "ATÉ" = quantidade máxima a credenciar; colunas do modelo de 19/11/2026
/** Nomes curtos dos tipos na proposta (modelo de 19/11/2026); a tela de Credenciamento mantém os nomes completos. */
export const ROTULOS_TIPOS_REDE: Readonly<Record<string, string>> = { diagnostico: "Serviços Aux. Diagnóstico", "nao-medicos": "Serviços Aux. Terapias" };
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
      { celulas: [ROTULOS_TIPOS_REDE[l.id] ?? l.tipo, inteiro(l.autorizado), moedaCredenciamento(l.valor), moedaCredenciamento(l.adesao)], item: false },
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

/** Proposal-only payment terms; simulator parameters and monthly results remain independent. */
export function pagamentosPropostaRede(p: ParametrosRede, q: QuantidadesRede = quantidadesRedeAtuais()) {
  const totalCredenciamento = q.total.adesao;
  const assinatura = Math.round(totalCredenciamento * 0.3 * 100) / 100;
  return {
    totalCredenciamento, assinatura, redeMinima: Math.round((totalCredenciamento - assinatura) * 100) / 100,
    parcelasFixas: 6, inicioAposAssinatura: 1, valorParcela: p.valorParcela, totalParcelas: p.valorParcela * 6,
  };
}

/** Quadro 2: condições da proposta, sem remuneração por vida. */
export function linhasParametrosRede(p: ParametrosRede): [string, string][] {
  return [
    ["Parcelas fixas", "6"],
    ["Início das parcelas", "Mês subsequente à assinatura do contrato"],
    ["Valor da parcela", moedaCredenciamento(p.valorParcela)],
  ];
}

/** Quadro 3: resumo financeiro por obrigação e marco contratual, sem calendário presumido. */
export function linhasPagamentosPropostaRede(p: ParametrosRede, q: QuantidadesRede = quantidadesRedeAtuais()): string[][] {
  const v = pagamentosPropostaRede(p, q);
  return [
    ["TOTAL DO CREDENCIAMENTO CAPTAÇÃO/ADESÃO", moedaCredenciamento(v.totalCredenciamento),
      `30% (${moedaCredenciamento(v.assinatura)}) na assinatura do contrato e os outros 70% (${moedaCredenciamento(v.redeMinima)}) quando toda a rede mínima estiver credenciada.`],
    ["PARCELAS FIXAS", moedaCredenciamento(v.totalParcelas),
      `6 parcelas mensais de ${moedaCredenciamento(v.valorParcela)}, a iniciar no mês subsequente à assinatura do contrato.`],
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
export const CHAVE_TEXTOS_REDE = "uberaba-proposta-rede-textos-v4"; // v4 (19/11/2026): textos do modelo do Dênis substituem revisões aprovadas antes
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

/** Sequência do documento (modelo do Dênis, 19/11/2026), comum ao PDF e ao Word para os dois nunca divergirem:
 * tópicos 1–3 com seus quadros numerados (Quadro 1, 2, 3), Projeção financeira e Condições Gerais em subtópicos sem número. */
export type BlocoPropostaRede =
  | { tipo: "topico"; texto: string }
  | { tipo: "subtopico"; texto: string }
  | { tipo: "rotulo"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | {
    tipo: "quadro"; cabecalho: string[]; linhas: string[][]; larguras: number[]; alinhamentos: ("left" | "center" | "right" | "justify")[];
    /** Quadro 1: tipos em negrito separados por traço forte, itens abaixo de cada tipo; letra menor. */
    grupos: boolean; itens: number[]; negritoUltima: boolean;
    /** Começa e termina na mesma página, com o seu rótulo. */
    juntos: boolean;
  };

/** Texto do Dênis (24/11/2026), logo após o Quadro 1. */
export const NOTA_QUANTIDADE_CREDENCIAMENTO_REDE = "A quantidade de credenciamentos deverá ser aquela definida no Quadro 1. Entretanto, no tipo de credenciamento “Especialidades”, o total não deverá ser inferior ao total ali definido, sendo necessário que cada especialidade básica tenha pelo menos 2 (dois) credenciados.";

export function blocosPropostaRede(
  parametros: ParametrosRede, textos: TextosRede | null = null, quantidades: QuantidadesRede = quantidadesRedeAtuais(),
): BlocoPropostaRede[] {
  const t = textos ?? TEXTOS_REDE_PADRAO;
  const b: BlocoPropostaRede[] = [];
  let n = 0;
  const rotulo = () => b.push({ tipo: "rotulo", texto: `Quadro ${++n}` });
  SECOES_REDE.forEach((s) => {
    b.push({ tipo: "topico", texto: s.titulo });
    paragrafosDe(t[s.id]).forEach((p) => b.push({ tipo: "paragrafo", texto: p }));
    if (s.id === "condicoes") {
      const quadro = quadroCondicoesRede(quantidades);
      rotulo();
      b.push({ tipo: "quadro", cabecalho: [...COLUNAS_CONDICOES_REDE], linhas: quadro.map((l) => l.celulas), larguras: [4820, 686, 2065, 2295],
        alinhamentos: ["justify", "center", "center", "center"], grupos: true, itens: quadro.flatMap((l, k) => (l.item ? [k] : [])), negritoUltima: true, juntos: false });
      b.push({ tipo: "paragrafo", texto: NOTA_QUANTIDADE_CREDENCIAMENTO_REDE });
    }
    if (s.id === "gestao") {
      rotulo();
      b.push({ tipo: "quadro", cabecalho: ["PARÂMETRO", "VALOR"], linhas: linhasParametrosRede(parametros), larguras: [6998, 2868],
        alinhamentos: ["justify", "center"], grupos: false, itens: [], negritoUltima: false, juntos: false });
      b.push({ tipo: "subtopico", texto: SUBTITULO_PROJECAO_REDE }, { tipo: "paragrafo", texto: TEXTO_PROJECAO_REDE });
      rotulo();
      b.push({ tipo: "quadro", cabecalho: ["REMUNERAÇÃO", "VALOR TOTAL", "CONDIÇÕES DE PAGAMENTO"], linhas: linhasPagamentosPropostaRede(parametros, quantidades), larguras: [3100, 1800, 4966],
        alinhamentos: ["left", "center", "left"], grupos: false, itens: [], negritoUltima: false, juntos: true });
      b.push({ tipo: "paragrafo", texto: NOTA_PROJECAO_REDE });
    }
  });
  b.push({ tipo: "topico", texto: TITULO_CONDICOES_GERAIS_REDE });
  CONDICOES_GERAIS_REDE.forEach((c) => b.push({ tipo: "subtopico", texto: c.item }, { tipo: "paragrafo", texto: c.valor }));
  return b;
}
