/** Parâmetros de Resultados Rede (Estudo Uberaba, pedido de 18/11/2026): variáveis editadas na tela e gravadas neste navegador; vazio restaura o padrão. */
export type CampoParametroRede = "parcelasFixas" | "iniciarEm" | "valorParcela" | "valorPorVida";
export type ParametrosRede = Record<CampoParametroRede, number>;

// Padrões do Dênis (19/11/2026): 3 parcelas fixas de R$ 15.000,00 a partir do mês 3 e R$ 2,00 por vida.
export const PARAMETROS_REDE_PADRAO: ParametrosRede = { parcelasFixas: 3, iniciarEm: 3, valorParcela: 15000, valorPorVida: 2 };
export const CAMPOS_PARAMETROS_REDE: { campo: CampoParametroRede; rotulo: string; moeda: boolean; inteiro: boolean }[] = [
  { campo: "parcelasFixas", rotulo: "Parcelas fixas", moeda: false, inteiro: true },
  // Mês (1 = 01/2027) em que começam as parcelas fixas da Mensalidade (pedido de 18/11/2026); antes dele, Mensalidade 0.
  { campo: "iniciarEm", rotulo: "Iniciar em", moeda: false, inteiro: true },
  { campo: "valorParcela", rotulo: "Valor Parcela", moeda: true, inteiro: false },
  { campo: "valorPorVida", rotulo: "Valor por vida", moeda: true, inteiro: false },
];
export const CHAVE_PARAMETROS_REDE = "uberaba.resultadosRede.parametros.v1";

/** Texto digitado em pt-BR ("15.000", "1,50"): vazio → undefined (restaura o padrão); inválido, negativo ou fração em campo inteiro → null (recusado). */
export function lerParametroRede(texto: string, inteiro: boolean): number | undefined | null {
  const t = texto.trim();
  if (t === "") return undefined;
  const ok = inteiro ? /^\d{1,3}(\.\d{3})*$|^\d+$/ : /^\d{1,3}(\.\d{3})*(,\d{0,2})?$|^\d+(,\d{0,2})?$/;
  if (!ok.test(t)) return null;
  return Number(t.replace(/\./g, "").replace(",", "."));
}

/** Valores efetivos: o digitado prevalece sobre o padrão. */
export function parametrosRede(digitados: Partial<ParametrosRede> = {}): ParametrosRede {
  return { ...PARAMETROS_REDE_PADRAO, ...digitados };
}

export function carregarParametrosRede(): Partial<ParametrosRede> {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_PARAMETROS_REDE) ?? "{}");
    const saida: Partial<ParametrosRede> = {};
    for (const { campo, inteiro } of CAMPOS_PARAMETROS_REDE) {
      const v = bruto?.[campo];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0 && (!inteiro || Number.isInteger(v))) saida[campo] = v;
    }
    return saida;
  } catch { return {}; }
}

/** Avisado a cada gravação, para o Resultado de Resultados Rede reler os parâmetros. */
export const EVENTO_PARAMETROS_REDE = "uberaba-parametros-rede-alterados";
export function salvarParametrosRede(valores: Partial<ParametrosRede>) {
  try { localStorage.setItem(CHAVE_PARAMETROS_REDE, JSON.stringify(valores)); } catch { /* navegador sem armazenamento */ }
  try { globalThis.dispatchEvent?.(new Event(EVENTO_PARAMETROS_REDE)); } catch { /* sem janela */ }
}

/** Ícone "Restaurar padrão" (19/11/2026): apaga os valores digitados; os Parâmetros voltam a PARAMETROS_REDE_PADRAO. */
export function restaurarParametrosRede() {
  salvarParametrosRede({});
}
