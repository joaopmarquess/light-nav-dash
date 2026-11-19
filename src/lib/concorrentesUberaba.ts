import { CONCORRENTES_UBERABA } from "@/data/concorrentesUberaba";
import { FAIXAS } from "@/lib/uberabaTabelasComerciais";

export type LinhaConcorrentes = { faixa: string; centavos: number[] };

/** Tabela Concorrentes transposta: uma linha por faixa (mesmas faixas das Tabelas do Proj. Uberaba), uma coluna por produto. */
export const linhasConcorrentesPorFaixa = (): LinhaConcorrentes[] =>
  FAIXAS.map((faixa, i) => ({ faixa, centavos: CONCORRENTES_UBERABA.map((c) => c.centavos[i]) }));

export const colunasConcorrentes = () => CONCORRENTES_UBERABA.map((c) => ({ numero: c.numero, produto: c.produto }));
