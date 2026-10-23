export type PeriodoMovimentacao = { de: string; ate: string };
export type TotaisMovimentacao = { e: number; s: number; r: number; tp: number; tm: number };
export type VidasMensais = { mes: string; data: string; vidas: number };
export type FluxoMensal = { mes: string; vendas: number; saidas: number; crescimento: number };
export type MovimentoMensalComVidas = FluxoMensal & { vidas: number; data: string };

export function datasVidasIndicadores(periodo: PeriodoMovimentacao): { anterior: string; final: string } {
  const anterior = new Date(`${periodo.de}T00:00:00Z`);
  anterior.setUTCDate(anterior.getUTCDate() - 1);
  return { anterior: anterior.toISOString().slice(0, 10), final: periodo.ate };
}

export function combinarFluxosEVidas(fluxos: FluxoMensal[], vidas: VidasMensais[]): MovimentoMensalComVidas[] {
  return fluxos.flatMap(fluxo => {
    const fechamento = vidas.find(ponto => ponto.mes === fluxo.mes);
    return fechamento ? [{ ...fluxo, vidas: fechamento.vidas, data: fechamento.data }] : [];
  });
}

export function fluxoMensalMovimentacao(mes: string, row: Record<string, unknown>): FluxoMensal {
  const total = somarTotaisMovimentacao([row]);
  return { mes, vendas: total.e, saidas: Math.abs(total.s), crescimento: total.e - total.s + total.r + total.tp - total.tm };
}

export const escalaVidasMensais = {
  dominio: [50000, 80000] as [number, number],
  marcas: Array.from({ length: 16 }, (_, indice) => 50000 + indice * 2000),
};

export function fechamentosMensaisMovimentacao(periodo: PeriodoMovimentacao): string[] {
  return mesesMovimentacao(periodo).map(({ de }) => {
    const [ano, mes] = de.split("-").map(Number);
    return new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
  });
}

export function mesesMovimentacao(periodo: PeriodoMovimentacao): PeriodoMovimentacao[] {
  const meses: PeriodoMovimentacao[] = [];
  for (let de = periodo.de; de <= periodo.ate;) {
    const [ano, mes] = de.split("-").map(Number);
    const proximo = new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);
    const fim = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
    meses.push({ de, ate: fim < periodo.ate ? fim : periodo.ate });
    de = proximo;
  }
  return meses;
}

export function ultimosMesesMovimentacao(periodo: PeriodoMovimentacao): PeriodoMovimentacao[] {
  return janelaMesesMovimentacao(periodo).meses;
}

export function janelaMesesMovimentacao(periodo: PeriodoMovimentacao, pagina = 0) {
  const disponiveis = mesesMovimentacao(periodo);
  const paginas = Math.ceil(disponiveis.length / 12);
  const atual = Math.max(0, Math.min(Math.trunc(pagina), Math.max(0, paginas - 1)));
  const fim = disponiveis.length - atual * 12;
  return { meses: disponiveis.slice(Math.max(0, fim - 12), fim), pagina: atual, anteriores: atual + 1 < paginas, posteriores: atual > 0 };
}

export function somarTotaisMovimentacao(rows: Record<string, unknown>[]): TotaisMovimentacao {
  return rows.reduce<TotaisMovimentacao>((acc, row) => ({
    e: acc.e + Number(row.vendas ?? 0),
    s: acc.s + Number(row.cancelamentos ?? 0),
    r: acc.r + Number(row.reativacoes ?? 0),
    tp: acc.tp + Number(row.entradas_transferencia ?? 0),
    tm: acc.tm + Number(row.saidas_transferencia ?? 0),
  }), { e: 0, s: 0, r: 0, tp: 0, tm: 0 });
}