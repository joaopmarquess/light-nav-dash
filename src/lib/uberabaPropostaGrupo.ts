// Propostas por grupo de produtos (pedido do Dênis em 19/11/2026): "Administrados" (Produtos da Administradora) e
// "Empresariais" (Planos Coletivos Empresariais), ao lado da Proposta Comercial original ("Original").
// Estrutura fixa: 1. Tabela Net · 2. Sugestão de Venda · 3. Distribuidores · 4. Promoção e Metas.
// Preços vêm das tabelas atuais de Resultados Comerciais (Venda = tabelaVenda; Net = Venda × participação da OPERADORA).
import {
  FATORES_PADRAO, INDICES_PADRAO, formatarCentavos, indicadoresPadrao, operadoraDe, parametrosDe, rotulosPadrao, tabelaNet, tabelaVenda, vidasTexto,
  type Fatores, type FrenteId, type IndicadoresPorFrente, type Indices, type RotulosPorFrente,
} from "@/lib/uberabaTabelasComerciais";

export type PropostaGrupoId = "administrados" | "empresariais";

/** Botões da barra: rótulo curto no botão, nome completo só na dica. */
export const BOTOES_PROPOSTA_COMERCIAL: { id: PropostaGrupoId | "original"; rotulo: string; nome: string }[] = [
  { id: "administrados", rotulo: "Administrados", nome: "Produtos da Administradora" },
  { id: "empresariais", rotulo: "Empresariais", nome: "Planos Coletivos Empresariais" },
  { id: "original", rotulo: "Original", nome: "Proposta Original" },
];

export const TOPICOS_PROPOSTA_GRUPO = ["1. Tabela Net", "2. Sugestão de Venda", "3. Distribuidores", "4. Promoção e Metas"] as const;

/** Textos fornecidos pelo Dênis (19/11/2026), sem reescrever. */
type DefinicaoGrupo = { nome: string; produtos: [FrenteId, FrenteId]; distribuidores: string[]; promocao: string; metas: string[]; arquivo: string };
export const PROPOSTAS_GRUPO: Record<PropostaGrupoId, DefinicaoGrupo> = {
  administrados: {
    nome: "Produtos da Administradora",
    produtos: ["pcaAdm", "pmeAdm"],
    distribuidores: ["Rede de Distribuição da Lancers", "SDR Bensaúde"],
    promocao: "Comissionamento Promocional por 6 meses renováveis por mais 6 meses com batimento das seguintes Metas:",
    metas: ["Venda de 2.000 + 2.000 vidas em 2027"],
    arquivo: "Proposta_Administrados_Bensaude_Uberaba.pdf",
  },
  empresariais: {
    nome: "Planos Coletivos Empresariais",
    produtos: ["pceAdm", "pce100"],
    distribuidores: ["Siga Soluções (Exclusividade por 6 meses)", "Hunter Bensaúde após 6 meses"],
    promocao: "Comissionamento Promocional por 6 meses renováveis por mais 6 meses com batimento das seguintes Metas:",
    metas: ["Venda de 3.000 + 3.000 vidas em 2027"],
    arquivo: "Proposta_Empresariais_Bensaude_Uberaba.pdf",
  },
};

export type TabelaProdutoGrupo = { id: FrenteId; titulo: string; subtitulo: string; linhas: [string, string, string][] };
export type PropostaGrupo = {
  id: PropostaGrupoId; nome: string; net: TabelaProdutoGrupo[]; venda: TabelaProdutoGrupo[];
  distribuidores: string[]; promocao: string; metas: string[]; arquivo: string;
};

/** Conteúdo da proposta do grupo, sobre os índices, indicadores, nomes e fatores atuais de Resultados Comerciais. */
export function propostaGrupo(id: PropostaGrupoId, indices: Indices = INDICES_PADRAO, indicadores: IndicadoresPorFrente = indicadoresPadrao(), rotulos: RotulosPorFrente = rotulosPadrao(), fatores: Fatores = FATORES_PADRAO): PropostaGrupo {
  const d = PROPOSTAS_GRUPO[id];
  const cabecalho = (f: FrenteId) => ({
    id: f,
    titulo: rotulos[f].titulo,
    subtitulo: [parametrosDe(f).sigla, vidasTexto(parametrosDe(f))?.toUpperCase()].filter(Boolean).join(" · "),
  });
  const linhas = (t: { faixa: string; enfermariaCentavos: number; apartamentoCentavos: number }[]) =>
    t.map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos), formatarCentavos(l.apartamentoCentavos)] as [string, string, string]);
  return {
    id, nome: d.nome, distribuidores: d.distribuidores, promocao: d.promocao, metas: d.metas, arquivo: d.arquivo,
    net: d.produtos.map((f) => ({ ...cabecalho(f), linhas: linhas(tabelaNet(indices[f], operadoraDe(f, indicadores[f]), fatores[f])) })),
    venda: d.produtos.map((f) => ({ ...cabecalho(f), linhas: linhas(tabelaVenda(indices[f], fatores[f])) })),
  };
}
