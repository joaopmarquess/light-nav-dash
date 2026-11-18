/** Resultado de Resultados Rede (Estudo Uberaba, pedido de 18/11/2026): meses 01/2027–12/2027 com
 * Adesão = total de Adesão do Credenciamento dividido igualmente nos 2 primeiros meses (demais 0) e
 * Mensalidade = 0 antes do mês "Iniciar em", Valor Parcela nos meses das Parcelas fixas a partir dele; depois, Valor por vida × vidas vendidas acumuladas até o mês
; Total = Adesão + Mensalidade
 * (vidas projetadas da Simulação de resultados, mesma distribuição mensal da simulação). */
import { distribuirResidual, fontesSimulacao } from "@/lib/uberabaSimulacao";
import type { ParametrosRede } from "@/lib/uberabaParametrosRede";

export const ANO_RESULTADO_REDE = 2027;
export const MESES_ADESAO_REDE = 2;
export const MESES_RESULTADO_REDE = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, "0")}/${ANO_RESULTADO_REDE}`);

/** Total de vidas por modalidade da simulação (padrão: o mesmo da Simulação de resultados ao abrir). */
export type VidasSimulacao = Record<string, number>;
export const vidasSimulacaoPadrao = (): VidasSimulacao => Object.fromEntries(fontesSimulacao.padroes.map((c) => [c.produto_codigo, c.total_vidas]));

/** Vidas vendidas por mês: cada modalidade distribuída pela distribuição mensal da simulação, somadas. */
export function vidasVendidasPorMes(vidas: VidasSimulacao): number[] {
  const percentuais = [...fontesSimulacao.meses].sort((a, b) => a.mes_numero - b.mes_numero).map((m) => m.percentual_anual);
  return Object.values(vidas).reduce((soma, total) => {
    const mes = distribuirResidual(total, percentuais);
    return soma.map((v, i) => v + mes[i]);
  }, percentuais.map(() => 0));
}

const centavos = (v: number) => Math.round(v * 100) / 100;
/** Adesão distribuída igualmente nos primeiros meses; o resíduo dos centavos fica no último deles. */
export function distribuirAdesao(total: number, meses = MESES_ADESAO_REDE, quantidade = 12): number[] {
  const parcela = Math.floor((total / meses) * 100) / 100;
  return Array.from({ length: quantidade }, (_, i) => (i < meses - 1 ? parcela : i === meses - 1 ? centavos(total - parcela * (meses - 1)) : 0));
}

export type LinhaResultadoRede = { mes: string; vidasMes: number; vidasAcumuladas: number; adesao: number; mensalidade: number; total: number; parcelaFixa: boolean; antesInicio: boolean };
export function resultadoRede(adesaoTotal: number, parametros: ParametrosRede, vidas: VidasSimulacao) {
  const vendidas = vidasVendidasPorMes(vidas);
  const adesoes = distribuirAdesao(adesaoTotal);
  let acumuladas = 0;
  const linhas: LinhaResultadoRede[] = MESES_RESULTADO_REDE.map((mes, i) => {
    acumuladas += vendidas[i];
    // Mensalidade começa no mês "Iniciar em" (1 = 01/2027): antes dele 0; depois, as Parcelas fixas e, em seguida, Valor por vida × vidas acumuladas.
    const inicio = Math.max(1, parametros.iniciarEm) - 1;
    const antesInicio = i < inicio;
    const parcelaFixa = !antesInicio && i < inicio + parametros.parcelasFixas;
    const mensalidade = antesInicio ? 0 : parcelaFixa ? parametros.valorParcela : centavos(parametros.valorPorVida * acumuladas);
    return { mes, vidasMes: vendidas[i], vidasAcumuladas: acumuladas, adesao: adesoes[i], mensalidade, total: centavos(adesoes[i] + mensalidade), parcelaFixa, antesInicio };
  });
  const total = { adesao: centavos(linhas.reduce((s, l) => s + l.adesao, 0)), mensalidade: centavos(linhas.reduce((s, l) => s + l.mensalidade, 0)), total: centavos(linhas.reduce((s, l) => s + l.total, 0)) };
  return { linhas, total };
}

/** Vidas atuais da Simulação de resultados nesta sessão: a simulação publica a cada alteração; sem publicação, os padrões. */
export const EVENTO_VIDAS_SIMULACAO = "uberaba-vidas-simulacao-alteradas";
let vidasPublicadas: VidasSimulacao | null = null;
export const lerVidasSimulacao = (): VidasSimulacao => vidasPublicadas ?? vidasSimulacaoPadrao();
export function publicarVidasSimulacao(configs: { produto_codigo: string; total_vidas: number }[]) {
  const proximo = Object.fromEntries(configs.map((c) => [c.produto_codigo, c.total_vidas]));
  if (vidasPublicadas && JSON.stringify(vidasPublicadas) === JSON.stringify(proximo)) return;
  vidasPublicadas = proximo;
  try { globalThis.dispatchEvent?.(new Event(EVENTO_VIDAS_SIMULACAO)); } catch { /* sem janela */ }
}
