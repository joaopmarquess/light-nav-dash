import { CONCORRENTES_UBERABA } from "@/data/concorrentesUberaba";
import { FAIXAS } from "@/lib/uberabaTabelasComerciais";
import { NOMES_PLANOS_LANCERS } from "@/data/produtosLancers";
import { produtosLancers, tabelaOcultaLancers, type AcomodacaoLancers, type ProdutoLancers } from "@/lib/produtosLancers";

export type LinhaConcorrentes = { faixa: string; centavos: number[] };

/** Tabela Concorrentes transposta: uma linha por faixa (mesmas faixas das Tabelas do Proj. Uberaba), uma coluna por produto. */
export const linhasConcorrentesPorFaixa = (): LinhaConcorrentes[] =>
  FAIXAS.map((faixa, i) => ({ faixa, centavos: CONCORRENTES_UBERABA.map((c) => c.centavos[i]) }));

export const colunasConcorrentes = () => CONCORRENTES_UBERABA.map((c) => ({ numero: c.numero, produto: c.produto, rotulo: c.rotulo }));

/** Planos do Bensaúde comparados com as Tabelas do Proj. Uberaba (pedido de 19/11/2026). */
export const PLANOS_OUTRAS_BENSAUDE = [3019, 3020] as const;
export type ValorOutrasBensaude = "venda" | "net";
export type ColunaOutrasBensaude = { plano: number; nome: string; acomodacao: AcomodacaoLancers; rotulo: string };
export type LinhaOutrasBensaude = { faixa: string; centavos: (number | null)[] };

const produtoDoPlano = (plano: number, todos: ProdutoLancers[]) => todos.find((p) => p.plano === plano && !tabelaOcultaLancers(p))!;

/** "Outras Bensaúde": Enfermaria (Prata) de 3019 e 3020 e, com a coluna Apartamento aberta, também o Apartamento (Ouro);
 *  venda e net vêm da tela Produtos Lancers, sem recálculo; linhas nas mesmas faixas das Tabelas do Proj. Uberaba. */
export const outrasBensaude = (valor: ValorOutrasBensaude, comApartamento: boolean, todos: ProdutoLancers[] = produtosLancers()) => {
  const acomodacoes: AcomodacaoLancers[] = comApartamento ? ["PRATA", "OURO"] : ["PRATA"];
  const colunas: ColunaOutrasBensaude[] = PLANOS_OUTRAS_BENSAUDE.flatMap((plano) => acomodacoes.map((acomodacao) => ({
    plano,
    nome: NOMES_PLANOS_LANCERS.find((n) => n.plano === plano)?.nome ?? String(plano),
    acomodacao,
    rotulo: comApartamento ? `${plano} ${acomodacao === "PRATA" ? "ENF." : "APTO."}` : String(plano),
  })));
  const linhas: LinhaOutrasBensaude[] = FAIXAS.map((faixa, i) => ({
    faixa,
    centavos: colunas.map((c) => {
      const l = produtoDoPlano(c.plano, todos).porAcomodacao[c.acomodacao][i];
      return l ? Math.round(l[valor] * 100) : null;
    }),
  }));
  return { colunas, linhas };
};
