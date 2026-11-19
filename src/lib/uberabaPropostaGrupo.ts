// Propostas por grupo de produtos (pedido do Dênis em 19/11/2026): "Administrados" (Produtos da Administradora) e
// "Empresariais" (Planos Coletivos Empresariais), ao lado da Proposta Comercial original ("Original").
// Estrutura fixa: 1. Tabela Net · 2. Sugestão de Venda · 3. Distribuidores · 4. Promoção e Metas.
// Preços vêm das tabelas atuais de Resultados Comerciais (Venda = tabelaVenda; Net = Venda × participação da OPERADORA).
import {
  FATORES_PADRAO, INDICES_PADRAO, formatarCentavos, indicadoresPadrao, operadoraDe, parametrosDe, rotulosPadrao, tabelaNet, tabelaVenda, vidasTexto,
  type Fatores, type FrenteId, type IndicadoresPorFrente, type Indices, type RotulosPorFrente,
} from "@/lib/uberabaTabelasComerciais";
import { FRENTE_DO_PRODUTO } from "@/lib/uberabaSimulacao";
import { ANO_RESULTADO_REDE, vidasSimulacaoPadrao, type VidasSimulacao } from "@/lib/uberabaResultadoRede";

export type PropostaGrupoId = "administrados" | "empresariais";

/** Botões da barra: rótulo curto no botão, nome completo só na dica. */
export const BOTOES_PROPOSTA_COMERCIAL: { id: PropostaGrupoId | "original"; rotulo: string; nome: string }[] = [
  { id: "administrados", rotulo: "Administrados", nome: "Produtos da Administradora" },
  { id: "empresariais", rotulo: "Empresariais", nome: "Planos Coletivos Empresariais" },
  { id: "original", rotulo: "Original", nome: "Proposta Original" },
];

export const TOPICOS_PROPOSTA_GRUPO = ["Tabela Net", "Sugestão de Venda", "Distribuidores", "Promoção e Metas"] as const;

/** Tópicos numerados da proposta: a Introdução (quando houver) vem antes e desloca a numeração. */
export function topicosGrupo(id: PropostaGrupoId): string[] {
  const nomes = PROPOSTAS_GRUPO[id].introducao ? ["Introdução", ...TOPICOS_PROPOSTA_GRUPO] : [...TOPICOS_PROPOSTA_GRUPO];
  return nomes.map((t, i) => `${i + 1}. ${t}`);
}

/** Textos fornecidos pelo Dênis (19/11/2026), sem reescrever. */
type DefinicaoGrupo = { nome: string; introducao?: string[]; produtos: [FrenteId, FrenteId]; distribuidores: string[]; definicoes?: Record<string, string>; promocao: string; arquivo: string };
export const PROPOSTAS_GRUPO: Record<PropostaGrupoId, DefinicaoGrupo> = {
  administrados: {
    nome: "Produtos da Administradora",
    // Introdução fornecida pelo Dênis em 19/11/2026, sem reescrever.
    introducao: [
      "A presente proposta é destinada à LANCERS ADMINISTRADORA, conforme os entendimentos iniciais entre as partes.",
      "Assim como já ocorre com os produtos Bensaúde em sua área de atuação local, caberá à LANCERS estruturar e coordenar, em Uberaba, a rede de distribuição dos produtos por ela administrados, incluindo plataformas e parceiros locais, como a SIGA, que também atua na comercialização dos produtos empresariais da Operadora.",
    ],
    produtos: ["pcaAdm", "pmeAdm"],
    distribuidores: ["Rede de Distribuição da Lancers", "SDR Bensaúde"],
    // Definição proposta em 19/11/2026, a confirmar pelo Dênis.
    definicoes: {
      "SDR Bensaúde": "SDR (Sales Development Representative) é a equipe de pré-vendas do Bensaúde, responsável por prospectar e qualificar potenciais clientes dos produtos administrados, e por encaminhar as oportunidades qualificadas para a conclusão da venda pelos canais de distribuição.",
    },
    promocao: "Comissionamento Promocional por 6 meses renováveis por mais 6 meses com batimento das seguintes Metas:",
    arquivo: "Proposta_Administrados_Bensaude_Uberaba.pdf",
  },
  empresariais: {
    nome: "Planos Coletivos Empresariais",
    produtos: ["pceAdm", "pce100"],
    distribuidores: ["Siga Soluções (Exclusividade por 6 meses)", "Hunter Bensaúde após 6 meses"],
    promocao: "Comissionamento Promocional por 6 meses renováveis por mais 6 meses com batimento das seguintes Metas:",
    arquivo: "Proposta_Empresariais_Bensaude_Uberaba.pdf",
  },
};

/** Total de vidas da Simulação de resultados para a tabela (modalidade correspondente). */
export function vidasDaFrente(f: FrenteId, vidas: VidasSimulacao): number {
  const codigo = Object.keys(FRENTE_DO_PRODUTO).find((c) => FRENTE_DO_PRODUTO[c] === f);
  return codigo ? vidas[codigo] ?? 0 : 0;
}

/**
 * Batimento de metas (pedido de 19/11/2026): meta do ano = soma do Total de vidas dos dois produtos nos parâmetros
 * da Simulação de resultados; cada semestre = meta do ano / 2 (ano ímpar: o 2º semestre fica com a vida restante).
 */
export function metasGrupo(id: PropostaGrupoId, vidas: VidasSimulacao): string[] {
  const total = PROPOSTAS_GRUPO[id].produtos.reduce((s, f) => s + vidasDaFrente(f, vidas), 0);
  const primeiro = Math.floor(total / 2);
  const n = (v: number) => v.toLocaleString("pt-BR");
  const rotulo = BOTOES_PROPOSTA_COMERCIAL.find((b) => b.id === id)!.rotulo.toUpperCase();
  return [`${rotulo}: ${n(total)} em ${ANO_RESULTADO_REDE}`, `1º Semestre: ${n(primeiro)}`, `2º Semestre: ${n(total - primeiro)}`];
}

export type TabelaProdutoGrupo = { id: FrenteId; titulo: string; subtitulo: string; linhas: [string, string, string][] };
export type PropostaGrupo = {
  id: PropostaGrupoId; nome: string; topicos: string[]; introducao: string[]; net: TabelaProdutoGrupo[]; venda: TabelaProdutoGrupo[];
  distribuidores: string[]; definicoes: Record<string, string>; promocao: string; metas: string[]; arquivo: string;
};

/** Conteúdo da proposta do grupo, sobre os índices, indicadores, nomes e fatores atuais de Resultados Comerciais. */
export function propostaGrupo(id: PropostaGrupoId, indices: Indices = INDICES_PADRAO, indicadores: IndicadoresPorFrente = indicadoresPadrao(), rotulos: RotulosPorFrente = rotulosPadrao(), fatores: Fatores = FATORES_PADRAO, vidas: VidasSimulacao = vidasSimulacaoPadrao()): PropostaGrupo {
  const d = PROPOSTAS_GRUPO[id];
  const cabecalho = (f: FrenteId) => ({
    id: f,
    titulo: rotulos[f].titulo,
    subtitulo: [parametrosDe(f).sigla, vidasTexto(parametrosDe(f))?.toUpperCase()].filter(Boolean).join(" · "),
  });
  const linhas = (t: { faixa: string; enfermariaCentavos: number; apartamentoCentavos: number }[]) =>
    t.map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos), formatarCentavos(l.apartamentoCentavos)] as [string, string, string]);
  return {
    id, nome: d.nome, topicos: topicosGrupo(id), introducao: d.introducao ?? [], distribuidores: d.distribuidores, definicoes: d.definicoes ?? {}, promocao: d.promocao, metas: metasGrupo(id, vidas), arquivo: d.arquivo,
    net: d.produtos.map((f) => ({ ...cabecalho(f), linhas: linhas(tabelaNet(indices[f], operadoraDe(f, indicadores[f]), fatores[f])) })),
    venda: d.produtos.map((f) => ({ ...cabecalho(f), linhas: linhas(tabelaVenda(indices[f], fatores[f])) })),
  };
}
