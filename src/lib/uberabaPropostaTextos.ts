// Textos da Proposta Comercial (tópicos 1 a 5): rascunho gerado pela IA a partir das tabelas de Resultados Comerciais,
// revisado pelo usuário e só então incluído no PDF. Tudo fica guardado neste navegador.
import {
  FATOR_APARTAMENTO_PADRAO, FRENTES_COMERCIAIS, blocosIndicadores, formatarCentavos, formatarFator, formatarPercentual, tabelaIndexada, tabelaReferencia,
  type Fatores, type IndicadoresPorFrente, type Indices, type RotulosPorFrente,
} from "@/lib/uberabaTabelasComerciais";

/**
 * Tópicos da Proposta com texto: Introdução; Tabela Referencial (texto + Tabela Referencial);
 * Tabelas (texto + quadros de preços); Proposta de Remuneração (texto + Indicadores variáveis);
 * Descrição da Proposta (produtos, segmentos, acomodações e o que ainda falta definir). O Glossário vem por último.
 */
export const SECOES_TEXTO = [
  { id: "introducao", titulo: "1. Introdução" },
  { id: "referencia", titulo: "2. Tabela Referencial" },
  { id: "tabelas", titulo: "3. Tabelas" },
  { id: "remuneracao", titulo: "4. Proposta de Remuneração" },
  { id: "descricao", titulo: "5. Descrição da Proposta" },
] as const;
export const TITULO_GLOSSARIO = "6. Glossário e Notas Explicativas";
export type SecaoTextoId = (typeof SECOES_TEXTO)[number]["id"];
export type TextosSecoes = Record<SecaoTextoId, string>;
export const TEXTO_MAX = 4000;

/** Dados enviados à IA: somente o que está nas tabelas da tela, já formatado como aparece no PDF. */
export type FaixaRascunho = { faixa: string; enfermaria: string; apartamento: string };
export type DadosRascunho = {
  referencia: { fatorApartamento: string; regraApartamento: string; faixas: FaixaRascunho[] };
  tabelas: {
    nome: string;
    segmento: string;
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
    tabelas: FRENTES_COMERCIAIS.map(({ id }) => ({
      nome: rotulos[id].titulo,
      segmento: rotulos[id].segmento,
      indiceSobreReferencia: formatarPercentual(indices[id]),
      fatorApartamento: formatarFator(fatores[id]),
      regraApartamento: `Apartamento = TRUNCAR(Enfermaria × ${formatarFator(fatores[id])}; 2)`,
      faixas: tabelaIndexada(indices[id], fatores[id]).map((l) => ({
        faixa: l.faixa, enfermaria: formatarCentavos(l.enfermariaCentavos), apartamento: formatarCentavos(l.apartamentoCentavos),
      })),
      indicadores: blocosIndicadores(id, indicadores[id]).flatMap((b) =>
        b.linhas.map((l) => ({ bloco: b.titulo, item: l.rotulo, valor: formatarPercentual(l.valor), formula: l.formula ?? null }))),
    })),
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

export const CHAVE_TEXTOS = "uberaba-proposta-textos-v2";
/** Versão anterior (tópicos Objeto, Produtos, Condições, Rede e Vigência). */
export const CHAVE_TEXTOS_V1 = "uberaba-proposta-textos-v1";
const str = (v: unknown) => (typeof v === "string" ? v : null);

/**
 * Leva o texto da versão anterior para os novos tópicos, só como rascunho (precisa de nova revisão):
 * Condições → Proposta de Remuneração; Objeto, Produtos, Rede e Vigência → Descrição da Proposta.
 */
export function migrarTextosV1(o: unknown): EstadoTextos | null {
  if (!o || typeof o !== "object") return null;
  const v = o as Record<string, unknown>;
  const fonte = (v.rascunho ?? v.aprovado) as Record<string, unknown> | null | undefined;
  if (!fonte || typeof fonte !== "object") return null;
  const t = (k: string) => (typeof fonte[k] === "string" ? (fonte[k] as string).trim() : "");
  return {
    ...estadoVazio(),
    rascunho: normalizarTextos({
      remuneracao: t("condicoes"),
      descricao: ["objeto", "produtos", "rede", "vigencia"].map(t).filter(Boolean).join("\n\n"),
    }),
    geradoEm: str(v.geradoEm),
  };
}

export function lerTextos(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): EstadoTextos {
  try {
    const o = JSON.parse(storage?.getItem(CHAVE_TEXTOS) ?? "null");
    if (!o || typeof o !== "object") return migrarTextosV1(JSON.parse(storage?.getItem(CHAVE_TEXTOS_V1) ?? "null")) ?? estadoVazio();
    return {
      rascunho: o.rascunho ? normalizarTextos(o.rascunho) : null,
      assinaturaRascunho: str(o.assinaturaRascunho),
      geradoEm: str(o.geradoEm),
      aprovado: o.aprovado ? normalizarTextos(o.aprovado) : null,
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

/** Texto que o PDF usa: somente o aprovado; sem aprovação, o PDF continua com o texto provisório. */
export const textosParaPdf = (e: EstadoTextos): TextosSecoes | null => e.aprovado;
