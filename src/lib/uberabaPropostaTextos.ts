// Textos da Proposta Comercial (tópicos 1 a 5): texto padrão do Dênis (tópicos 1 e 2 fornecidos por ele), revisável na tela;
// a IA só redige os tópicos 3 a 5 a partir das tabelas de Resultados Comerciais. Tudo fica guardado neste navegador.
import {
  FATOR_APARTAMENTO_PADRAO, FRENTES_COMERCIAIS, GRUPOS_FRENTES, blocosIndicadores, parametrosDe, formatarCentavos, formatarFator, formatarPercentual, indiceCheio, tabelaCheia, tabelaReferencia,
  type Fatores, type IndicadoresPorFrente, type Indices, type RotulosPorFrente,
} from "@/lib/uberabaTabelasComerciais";

/**
 * Tópicos da Proposta com texto: Introdução; Tabela Referencial (texto + Tabela Referencial);
 * Produtos com Administradora e Plano Empresarial (cada um com texto, quadros de preços e Indicadores variáveis
 * das suas tabelas — pedido do Dênis em 13/11/2026); Conclusão (encerramento curto). O Glossário vem por último.
 */
export const SECOES_TEXTO = [
  { id: "introducao", titulo: "1. Introdução" },
  { id: "referencia", titulo: "2. Tabela Referencial" },
  { id: "administradora", titulo: `3. ${GRUPOS_FRENTES[0].titulo}` },
  { id: "empresarial", titulo: `4. ${GRUPOS_FRENTES[1].titulo}` },
  { id: "conclusao", titulo: "5. Conclusão" },
] as const;
export const TITULO_GLOSSARIO = "6. Glossário e Notas Explicativas";
export type SecaoTextoId = (typeof SECOES_TEXTO)[number]["id"];
export type TextosSecoes = Record<SecaoTextoId, string>;
export const TEXTO_MAX = 4000;

/** Tópicos com texto fixo do Dênis: a IA nunca os reescreve. */
export const SECOES_FIXAS = ["introducao", "referencia"] as const satisfies readonly SecaoTextoId[];
/** Tópicos que a IA pode redigir. */
export const SECOES_IA = ["administradora", "empresarial", "conclusao"] as const satisfies readonly SecaoTextoId[];

/**
 * Texto padrão da Proposta (o que vai ao PDF enquanto não houver texto revisado). Introdução e Tabela Referencial
 * foram fornecidas pelo Dênis em 13/11/2026; a Tabela Referencial foi resumida a pedido dele para caber na mesma
 * página da tabela, e ambas foram ajustadas aos quatro produtos dos parâmetros que ele forneceu em 13/11/2026
 * (só produtos, vidas, boletagem, distribuidores e nomes das seções). Ainda em 13/11/2026, a lista dos produtos saiu
 * da Introdução e foi para o quadro de parâmetros logo abaixo dela (pedido do Dênis).
 */
export const TEXTOS_PADRAO: TextosSecoes = {
  introducao:
    "É com satisfação que apresentamos esta proposta comercial de quatro produtos em Uberaba (MG), cujas nomenclaturas, contratação, vidas, boletagem, distribuidores e fator sobre a Tabela Referencial estão no quadro abaixo. Os produtos com boletagem pela Lancers Administradora serão comercializados por suas Plataformas Associadas, em parceria com a Siga Soluções. Os percentuais de spread (valores atribuídos à Administradora), comissionamento (agenciamento) e vitaliciedade (valores atribuídos à Agenciadora, no Plano Empresarial) estão nas seções 3 e 4.",
  referencia:
    "Matriz referencial de preços para Uberaba, no padrão atuarial do Bensaúde e calibrada para o mercado local, base das tabelas dos quatro produtos.",
  administradora:
    "A seguir, apresentamos as tabelas de preços e as condições comerciais de remuneração dos produtos com boletagem pela Administradora (PCA, PME ADM. e PCE ADM.), distribuídos por meio das Plataformas Associadas.",
  empresarial:
    "A seguir, apresentamos a tabela de preços e as condições comerciais de remuneração do Plano Empresarial (PJ+), para empresas com 100 ou mais vidas, com boletagem pela operadora e distribuição por meio de Agenciadoras e Corretoras Autorizadas.",
  conclusao:
    "Com esta proposta, o Bensaúde reafirma o compromisso de levar a Uberaba produtos de saúde com preço justo e qualidade assistencial. Contamos com a parceria da Lancers Administradora e de suas Plataformas Associadas, das Agenciadoras e Corretoras Autorizadas e da Siga Soluções para construir, juntos, uma operação sólida e duradoura, e permanecemos à disposição para os próximos passos.",
};
/** Introdução e Tabela Referencial antes de resumidas para os tópicos 1 e 2 caberem na página 1 (13/11/2026): passam para a versão atual. */
export const INTRODUCAO_LONGA = "É com satisfação que apresentamos a presente proposta comercial para a comercialização de nossos produtos em Uberaba (Minas Gerais). O escopo desta oferta contempla as tabelas de preços estruturadas para quatro formatos distintos de produtos, cujas nomenclaturas, contratação, vidas, boletagem, distribuidores e fator sobre a Tabela Referencial estão no quadro abaixo. Para garantir uma operação eficiente e alinhada ao mercado regional, os produtos com boletagem pela Lancers Administradora serão comercializados por meio de suas Plataformas Associadas, contando com a valiosa parceria da Siga Soluções. Detalhes operacionais como os percentuais de spread (valores atribuídos à Administradora), comissionamento (agenciamento), vitaliciedade (valores atribuídos à Agenciadora, no Plano Empresarial) e demais diretrizes de remuneração encontram-se especificados nas seções \"Produtos com Administradora\" e \"Plano Empresarial\" ao longo deste documento.";
export const REFERENCIA_LONGA = "Matriz referencial de preços para Uberaba, no padrão atuarial do Bensaúde, calibrada para a realidade competitiva do mercado local com excelência em qualidade assistencial. É a base da qual derivam as tabelas dos quatro produtos desta proposta.";
/** Versão anterior (longa) do texto da Tabela Referencial: em textos guardados no navegador, passa para a versão atual. */
export const REFERENCIA_ANTERIOR =
  "Esta tabela funciona como uma matriz de referencial de preços para Uberaba, já desenhada com o padrão de formatação atuarial do Bensaúde. O modelo foi estrategicamente calibrado para a realidade competitiva do mercado local, unindo a atratividade de praça ao padrão de excelência em qualidade assistencial — servindo como a base oficial a partir da qual foram derivadas as tabelas dos três produtos que compõem esta proposta.";
/** Introdução sem a explicação de spread/comissionamento/vitaliciedade (até 13/11/2026): passa para a versão atual. */
export const INTRODUCAO_SEM_ATRIBUICAO = "É com satisfação que apresentamos a presente proposta comercial para a comercialização de nossos produtos em Uberaba (Minas Gerais). O escopo desta oferta contempla as tabelas de preços estruturadas para quatro formatos distintos de produtos, cujas nomenclaturas, contratação, vidas, boletagem, distribuidores e fator sobre a Tabela Referencial estão no quadro abaixo. Para garantir uma operação eficiente e alinhada ao mercado regional, os produtos com boletagem pela Lancers Administradora serão comercializados por meio de suas Plataformas Associadas, contando com a valiosa parceria da Siga Soluções. Detalhes operacionais como os percentuais de spread, comissionamento, vitaliciedade e demais diretrizes de remuneração encontram-se especificados nas seções \"Produtos com Administradora\" e \"Plano Empresarial\" ao longo deste documento.";
/** Introdução anterior, com a lista dos produtos no texto: em textos guardados no navegador, passa para a versão atual. */
export const INTRODUCAO_ANTERIOR =
  "É com satisfação que apresentamos a presente proposta comercial para a comercialização de nossos produtos em Uberaba (Minas Gerais). O escopo desta oferta contempla as tabelas de preços estruturadas para quatro formatos distintos de produtos, sendo eles: a) o Plano Coletivo por Adesão (PCA), b) o Plano Coletivo Empresarial de 03 a 29 vidas (PME ADM.), c) o Plano Coletivo Empresarial de 30 a 99 vidas (PCE ADM.) e d) o Plano Coletivo Empresarial com 100 ou mais vidas (PJ+). Para garantir uma operação eficiente e alinhada ao mercado regional, os modelos de distribuição foram definidos de forma estratégica: os planos PCA, PME ADM. e PCE ADM. terão boletagem pela Lancers Administradora e serão comercializados por meio de suas Plataformas Associadas, contando com a valiosa parceria da Siga Soluções; já o Plano Empresarial (PJ+) terá boletagem pela operadora e distribuição por meio de Corretoras. Detalhes operacionais como os percentuais de spread, comissionamento, vitaliciedade e demais diretrizes de remuneração encontram-se especificados nas seções \"Produtos com Administradora\" e \"Plano Empresarial\" ao longo deste documento.";
/** Textos padrão dos tópicos 4 e 5 antes do PJ+ passar a ser distribuído por Agenciadoras e Corretoras Autorizadas (13/11/2026). */
export const EMPRESARIAL_SO_CORRETORAS = "A seguir, apresentamos a tabela de preços e as condições comerciais de remuneração do Plano Empresarial (PJ+), para empresas com 100 ou mais vidas, com boletagem pela operadora e distribuição por meio de Corretoras.";
export const CONCLUSAO_SO_CORRETORAS = "Com esta proposta, o Bensaúde reafirma o compromisso de levar a Uberaba produtos de saúde com preço justo e qualidade assistencial. Contamos com a parceria da Lancers Administradora e de suas Plataformas Associadas, das Corretoras e da Siga Soluções para construir, juntos, uma operação sólida e duradoura, e permanecemos à disposição para os próximos passos.";
const atualizarReferencia = (t: TextosSecoes): TextosSecoes => ({
  ...t,
  ...([REFERENCIA_ANTERIOR, REFERENCIA_LONGA].includes(t.referencia.trim()) ? { referencia: TEXTOS_PADRAO.referencia } : {}),
  ...([INTRODUCAO_ANTERIOR, INTRODUCAO_SEM_ATRIBUICAO, INTRODUCAO_LONGA].includes(t.introducao.trim()) ? { introducao: TEXTOS_PADRAO.introducao } : {}),
  ...(t.empresarial.trim() === EMPRESARIAL_SO_CORRETORAS ? { empresarial: TEXTOS_PADRAO.empresarial } : {}),
  ...(t.conclusao.trim() === CONCLUSAO_SO_CORRETORAS ? { conclusao: TEXTOS_PADRAO.conclusao } : {}),
});

export const textosPadrao = (): TextosSecoes => ({ ...TEXTOS_PADRAO });

/** Dados enviados à IA: somente o que está nas tabelas da tela, já formatado como aparece no PDF. */
export type FaixaRascunho = { faixa: string; enfermaria: string; apartamento: string };
export type DadosRascunho = {
  referencia: { fatorApartamento: string; regraApartamento: string; faixas: FaixaRascunho[] };
  tabelas: {
    nome: string;
    segmento: string;
    sigla: string;
    secao: string;
    vidas: string;
    boletagem: string;
    distribuidores: string;
    indiceSobreReferencia: string;
    fatorApartamento: string;
    regraApartamento: string;
    faixas: FaixaRascunho[];
    indicadores: { bloco: string; item: string; valor: string; formula: string | null }[];
  }[];
};

export function dadosRascunho(indices: Indices, indicadores: IndicadoresPorFrente, rotulos: RotulosPorFrente, fatores: Fatores): DadosRascunho {
  return {
    referencia: {
      fatorApartamento: formatarFator(FATOR_APARTAMENTO_PADRAO),
      regraApartamento: `Apartamento = TRUNCAR(Enfermaria × ${formatarFator(FATOR_APARTAMENTO_PADRAO)}; 2)`,
      faixas: tabelaReferencia().map((l) => ({ faixa: l.faixa, enfermaria: formatarCentavos(l.enfermariaCentavos), apartamento: formatarCentavos(l.apartamentoCentavos) })),
    },
    tabelas: FRENTES_COMERCIAIS.map(({ id }) => {
      const p = parametrosDe(id);
      return {
      nome: rotulos[id].titulo,
      segmento: rotulos[id].segmento,
      sigla: p.sigla,
      secao: GRUPOS_FRENTES.find((g) => g.id === p.grupo)!.titulo,
      vidas: p.vidas,
      boletagem: p.boletagem,
      distribuidores: p.distribuidores,
      indiceSobreReferencia: formatarPercentual(indices[id]),
      fatorApartamento: formatarFator(fatores[id]),
      regraApartamento: `Apartamento = TRUNCAR(Enfermaria × ${formatarFator(fatores[id])}; 2)`,
      precoCheio: `Enfermaria = Referência × (${formatarPercentual(indices[id])} + ${formatarPercentual(indicadores[id].spread)} de participação) = ${formatarPercentual(indiceCheio(indices[id], indicadores[id].spread))}`,
      faixas: tabelaCheia(indices[id], indicadores[id].spread, fatores[id]).map((l) => ({
        faixa: l.faixa, enfermaria: formatarCentavos(l.enfermariaCentavos), apartamento: formatarCentavos(l.apartamentoCentavos),
      })),
      indicadores: blocosIndicadores(id, indicadores[id]).flatMap((b) =>
        b.linhas.map((l) => ({ bloco: b.titulo, item: l.rotulo, valor: formatarPercentual(l.valor), formula: l.formula ?? null }))),
      };
    }),
  };
}

/** Assinatura curta dos dados: muda sempre que um preço, nome, fator ou indicador muda. */
export function assinaturaDados(d: DadosRascunho): string {
  const s = JSON.stringify(d);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const NUMERO = /\d+(?:[.,]\d+)*/g;
const textosDe = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(textosDe) : v && typeof v === "object" ? Object.values(v).flatMap(textosDe) : [];

/**
 * Números do texto que não aparecem, com a mesma grafia, em nenhum dado das tabelas
 * (os números dos tópicos 1 a 6 são aceitos). Servem de alerta na revisão: a IA não pode criar valores.
 */
export function numerosForaDasTabelas(texto: string, dados: DadosRascunho): string[] {
  const permitidos = new Set<string>(["1", "2", "3", "4", "5", "6"]);
  textosDe(dados).forEach((t) => (t.match(NUMERO) ?? []).forEach((n) => permitidos.add(n)));
  const fora = (texto.match(NUMERO) ?? []).filter((n) => !permitidos.has(n));
  return [...new Set(fora)];
}

/** Marcadores "[A definir: …]" que a IA deixa quando falta informação. */
export const pendencias = (texto: string): string[] => texto.match(/\[A definir[^\]]*\]/gi) ?? [];

export const textosVazios = (): TextosSecoes =>
  Object.fromEntries(SECOES_TEXTO.map((s) => [s.id, ""])) as TextosSecoes;

/** Limpa o texto vindo da IA ou da tela: sem espaços nas pontas, no máximo uma linha em branco entre parágrafos. */
export function normalizarTextos(v: unknown): TextosSecoes {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return Object.fromEntries(SECOES_TEXTO.map(({ id }) => {
    const t = typeof o[id] === "string" ? (o[id] as string) : "";
    return [id, t.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, TEXTO_MAX)];
  })) as TextosSecoes;
}

/** Parágrafos de uma seção: cada quebra de linha do texto revisado inicia um parágrafo (linhas em branco são ignoradas). */
export const paragrafosDe = (texto: string): string[] =>
  texto.split(/\n+/).map((p) => p.trim()).filter(Boolean);

export type EstadoTextos = {
  rascunho: TextosSecoes | null;
  assinaturaRascunho: string | null;
  geradoEm: string | null;
  aprovado: TextosSecoes | null;
  assinaturaAprovado: string | null;
  aprovadoEm: string | null;
};
export const estadoVazio = (): EstadoTextos => ({ rascunho: null, assinaturaRascunho: null, geradoEm: null, aprovado: null, assinaturaAprovado: null, aprovadoEm: null });

/** v4: quatro produtos e tópicos 3/4 por seção (Administradora e Empresarial); rascunhos das versões anteriores são ignorados. */
export const CHAVE_TEXTOS = "uberaba-proposta-textos-v4";
const str = (v: unknown) => (typeof v === "string" ? v : null);

export function lerTextos(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): EstadoTextos {
  try {
    const o = JSON.parse(storage?.getItem(CHAVE_TEXTOS) ?? "null");
    if (!o || typeof o !== "object") return estadoVazio();
    return {
      rascunho: o.rascunho ? atualizarReferencia(normalizarTextos(o.rascunho)) : null,
      assinaturaRascunho: str(o.assinaturaRascunho),
      geradoEm: str(o.geradoEm),
      aprovado: o.aprovado ? atualizarReferencia(normalizarTextos(o.aprovado)) : null,
      assinaturaAprovado: str(o.assinaturaAprovado),
      aprovadoEm: str(o.aprovadoEm),
    };
  } catch {
    return estadoVazio();
  }
}

export function gravarTextos(v: EstadoTextos, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try { storage?.setItem(CHAVE_TEXTOS, JSON.stringify(v)); } catch { /* armazenamento indisponível */ }
}

/** Revisão aprovada: o rascunho atual passa a ser o texto do PDF. */
export const aprovarTextos = (e: EstadoTextos, textos: TextosSecoes, quando: Date = new Date()): EstadoTextos =>
  ({ ...e, rascunho: normalizarTextos(textos), aprovado: normalizarTextos(textos), assinaturaAprovado: e.assinaturaRascunho, aprovadoEm: quando.toISOString() });

/** Texto que o PDF usa: somente o aprovado; sem aprovação (null), o PDF usa o texto padrão. */
export const textosParaPdf = (e: EstadoTextos): TextosSecoes | null => e.aprovado;

/** Junta o retorno da IA ao texto em revisão: só os tópicos 3 a 5 mudam; os tópicos fixos ficam como estão. */
export function mesclarRascunhoIa(atual: TextosSecoes, ia: unknown): TextosSecoes {
  const novo = normalizarTextos(ia);
  return normalizarTextos({ ...atual, ...Object.fromEntries(SECOES_IA.map((id) => [id, novo[id]])) });
}
