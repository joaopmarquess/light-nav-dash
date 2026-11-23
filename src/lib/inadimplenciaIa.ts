// Financeiro › Inadimplência › IA: a consulta que a IA pede é executada aqui, no navegador, sobre os mesmos
// títulos carregados na tela (mesmas regras de medir/agrupar), para que as respostas batam com o grid.
import {
  agrupar, faixaAtraso, medir, pctInadimplencia, pctRecebido, rotuloCompetencia, SITUACOES, total,
  type Dimensao, type Filtros, type Medido, type Metricas, type No, type Titulo,
} from "./inadimplencia";
import { faixaSinistralidade, sinistralidade, sinistralidadeItens } from "./inadimplenciaSinistralidade";

export const DIMENSOES_IA = [
  "competencia", "vencimento", "faixaAtraso", "tipoPlano", "coparticipativo", "plano", "planoInterno", "banco",
  "situacao", "sinistralidade", "beneficiario", "contrato", "responsavel",
] as const satisfies readonly Dimensao[];

/** Argumentos da ferramenta consultar_titulos (todos os campos presentes; null = não usar). */
export type ConsultaIa = {
  posicao: string | null;
  filtros: {
    competenciaDe: string | null; competenciaAte: string | null; tipoPlano: string | null; plano: string | null;
    planoInterno: string | null; contratoInterno: string | null; coparticipativo: "S" | "N" | null; banco: string | null;
    situacao: string | null; faixaSinistralidade: string | null; faixaAtraso: string | null; somenteEmAberto: boolean | null;
    incluirCancelados: boolean | null; nome: string | null;
  } | null;
  agruparPor: (typeof DIMENSOES_IA)[number][] | null;
  limiteGrupos: number | null;
  listarTitulos: number | null;
};

const r4 = (n: number | null) => (n == null ? null : Math.round(n * 10000) / 10000);
const sem = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const comp = (v: string | null) => (v ? v.replace(/\D/g, "").slice(0, 6) || undefined : undefined);

function resumo(m: Metricas, itens: Medido[]) {
  const s = sinistralidadeItens(itens);
  return {
    titulos: m.titulos, aReceber: m.aReceber, recebido: m.recebido, emAberto: m.emAberto,
    pctRecebido: r4(pctRecebido(m)), pctInadimplencia: r4(pctInadimplencia(m)), inadimplentes: m.inadimplentes,
    recebidoEmAtraso: m.recebidoAtraso, acrescimos: m.acrescimos, sinistralidade12m: r4(s.valor), contratosComSinistralidade: s.contratos,
  };
}

type GrupoIa = ReturnType<typeof resumo> & { grupo: string; subgrupos?: GrupoIa[]; gruposOmitidos?: number };
function grupos(nos: No[], limite: number): { lista: GrupoIa[]; omitidos: number } {
  const lista = nos.slice(0, limite).map((n) => {
    const g: GrupoIa = { grupo: n.rotulo, ...resumo(n.metricas, n.itens) };
    if (n.filhos.length) { const f = grupos(n.filhos, limite); g.subgrupos = f.lista; if (f.omitidos) g.gruposOmitidos = f.omitidos; }
    return g;
  });
  return { lista, omitidos: Math.max(0, nos.length - limite) };
}

/** Executa a consulta pedida pela IA; posição padrão = a da tela. */
export function executarConsultaIa(titulos: Titulo[], a: ConsultaIa, posicaoTela: string) {
  const posicao = a.posicao && /^\d{4}-\d{2}-\d{2}$/.test(a.posicao) ? a.posicao : posicaoTela;
  const f = a.filtros;
  const filtros: Filtros = {
    competenciaDe: comp(f?.competenciaDe ?? null), competenciaAte: comp(f?.competenciaAte ?? null),
    tipoPlano: f?.tipoPlano || undefined, plano: f?.plano || undefined, coparticipativo: f?.coparticipativo || undefined,
    banco: f?.banco || undefined, situacao: f?.situacao || undefined, faixaSinistralidade: f?.faixaSinistralidade || undefined,
    incluirCancelados: !!f?.incluirCancelados,
  };
  const planoInterno = f?.planoInterno?.replace(/\D/g, "").padStart(4, "0").slice(-4) || null;
  const contrato = f?.contratoInterno?.replace(/\D/g, "").padStart(10, "0").slice(-10) || null;
  const nome = f?.nome ? sem(f.nome) : null;
  const itens = medir(titulos, posicao, filtros).filter(({ t, m }) =>
    (!planoInterno || t.cd_contrato_interno?.startsWith(planoInterno))
    && (!contrato || t.cd_contrato_interno === contrato)
    && (!nome || sem(`${t.nm_responsavel_financeiro ?? ""} ${t.beneficiario?.nome ?? ""}`).includes(nome))
    && (!f?.somenteEmAberto || m.emAberto > 0.005)
    && (!f?.faixaAtraso || faixaAtraso(t, m, posicao).startsWith(f.faixaAtraso)));
  const niveis = (a.agruparPor ?? []).filter((d) => (DIMENSOES_IA as readonly string[]).includes(d)).slice(0, 2);
  const limite = Math.min(100, Math.max(1, a.limiteGrupos ?? 30));
  const g = niveis.length ? grupos(agrupar(itens, niveis, posicao), limite) : null;
  const nLista = Math.min(50, Math.max(0, a.listarTitulos ?? 0));
  const lista = nLista ? [...itens].sort((x, y) => y.m.emAberto - x.m.emAberto || y.t.valor - x.t.valor).slice(0, nLista).map(({ t, m }) => ({
    titulo: t.cd_itcon_rec, competencia: rotuloCompetencia(t.dt_competencia), vencimento: t.dt_vencimento, quitacao: SITUACOES[t.tp_quitacao ?? ""] ?? t.tp_quitacao,
    contratoInterno: t.cd_contrato_interno, plano: t.cd_plano, matricula: t.beneficiario?.matricula ?? null, beneficiario: t.beneficiario?.nome ?? null,
    responsavelFinanceiro: t.nm_responsavel_financeiro, valor: t.valor, recebido: m.recebido, emAberto: m.emAberto,
    faixaAtraso: faixaAtraso(t, m, posicao).slice(4), sinistralidade12m: r4(sinistralidade(t.sinistralidade)),
    faixaSinistralidade: faixaSinistralidade(t.sinistralidade, !!t.cd_contrato_interno).rotulo,
  })) : undefined;
  return {
    posicao, titulosNaBase: titulos.length,
    regra: "Entram só títulos vencidos (dia útil) até a posição; cancelados ficam fora salvo incluirCancelados; recebido = principal até a posição.",
    totais: resumo(total(itens), itens),
    ...(g ? { agrupadoPor: niveis, grupos: g.lista, gruposOmitidos: g.omitidos } : {}),
    ...(lista ? { titulos: lista, titulosOmitidos: Math.max(0, itens.length - lista.length) } : {}),
  };
}

/** Valores disponíveis na base, enviados à IA como contexto. */
export function contextoBaseIa(titulos: Titulo[], posicaoTela: string, fonte: string, periodo: string | null) {
  const u = (f: (t: Titulo) => string | null | undefined) => [...new Set(titulos.map(f).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  return [
    `Fonte: ${fonte}. Títulos na base: ${titulos.length}. Posição na tela: ${posicaoTela}.`,
    `Sinistralidade: ${periodo ?? "ainda carregando"}.`,
    `Competências (AAAAMM): ${u((t) => t.dt_competencia).join(", ")}.`,
    `Tipos de plano: ${u((t) => t.tp_plano).join(", ")}.`,
    `Planos (cd_plano): ${u((t) => t.cd_plano).join(", ")}.`,
    `Planos de 4 dígitos (início do contrato interno): ${u((t) => t.cd_contrato_interno?.slice(0, 4)).join(", ")}.`,
    `Bancos: ${u((t) => t.ds_con_cor).join(", ")}.`,
    `Quitação: ${u((t) => t.tp_quitacao).map((s) => `${s} = ${SITUACOES[s] ?? s}`).join(", ")}.`,
  ].join("\n");
}
