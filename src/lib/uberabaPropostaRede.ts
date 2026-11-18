// Proposta de Credenciamento e Gestão de Rede (Proj. Uberaba, pedido de 18/11/2026), destinada à Siga Soluções.
// Tópicos: 1 Introdução; 2 Rede (antes "Condições de Credenciamento"; quadro da seção Credenciamento e, antes do tópico 3, o quadro da seção Resultado — pedido de 18/11/2026);
// 3 Gestão de Rede (quadro dos Parâmetros de Resultados Rede); 4 Condições Gerais (texto fixo do Dênis, nunca redigido pela IA).
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
  { id: "introducao", titulo: "1. Introdução" },
  { id: "condicoes", titulo: "2. Rede" },
  { id: "gestao", titulo: "3. Gestão de Rede" },
] as const;
export type SecaoRedeId = (typeof SECOES_REDE)[number]["id"];

/** Tópico 4 (pedidos do Dênis em 18/11/2026): condições fixas, sem texto da IA. */
export const TITULO_CONDICOES_GERAIS_REDE = "4. Condições Gerais";
export const CONDICOES_GERAIS_REDE: readonly { item: string; valor: string }[] = [
  { item: "Contratada", valor: "O Contrato será celebrado com a Siga Soluções, que se responsabiliza por montar o time, que inclui médico auditor" },
  { item: "Prazo do Contrato", valor: "Ano de 2027" },
  { item: "A partir de 2028", valor: "A gestão de rede e a Sinistralidade estarão a cargo do Bensaúde" },
];
export type TextosRede = Record<SecaoRedeId, string>;
export const TEXTO_REDE_MAX = 4000;

/** Texto padrão (provisório, até a revisão do Dênis): só descreve o que os quadros mostram, sem condições novas. */
export const TEXTOS_REDE_PADRAO: TextosRede = {
  introducao:
    "Apresentamos à Siga Soluções a proposta de credenciamento e gestão da rede assistencial do Bensaúde em Uberaba (MG), no âmbito do projeto Bensaúde|Uberaba. A rede a credenciar está na seção 2, as condições da gestão de rede, na seção 3, e as condições gerais, na seção 4.",
  condicoes:
    "O quadro abaixo apresenta, por tipo de credenciado, a quantidade, o valor por credenciamento e o valor de adesão. Em seguida, o quadro do Resultado mostra, mês a mês, a adesão, a mensalidade e o total.",
  gestao:
    "O quadro abaixo apresenta os parâmetros da remuneração mensal pela gestão de rede: parcelas fixas a partir do mês de início e, em seguida, valor por vida sobre as vidas vendidas acumuladas.",
};

/** Nota do quadro de quantidades: só a condição de pagamento da nota das Condições Rede, que vale para o Credenciamento
 * (o restante falava da disponibilidade das redes de referência, que não é mais o que o quadro mostra). */
export const NOTA_CONDICOES_REDE = "O pagamento dependerá da conclusão, aprovação e formalização de cada credenciamento pelo Bensaúde.";

/** Quadro de quantidades do tópico 2 (pedido de 18/11/2026): montado a partir da seção Credenciamento, mesmas colunas da tela. */
export const COLUNAS_CONDICOES_REDE = ["TIPO CREDENCIADO", "QTDE.", "VALOR", "ADESÃO"] as const;
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

/** Regra da Mensalidade, a mesma do Resultado de Resultados Rede, escrita com os parâmetros atuais. */
export function regraMensalidadeRede(p: ParametrosRede): string {
  return `Mensalidade: ${inteiro(p.parcelasFixas)} parcelas fixas de ${moedaCredenciamento(p.valorParcela)} a partir de ${mesInicioRede(p.iniciarEm)}; depois, ${moedaCredenciamento(p.valorPorVida)} × vidas vendidas acumuladas.`;
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

export const CHAVE_TEXTOS_REDE = "uberaba-proposta-rede-textos-v1";
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
