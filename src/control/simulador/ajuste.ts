// Tela "Ajuste" do Simulador: valores fornecidos pelo Dênis em 23/11/2026 (imagem),
// copiados literalmente em centavos. Nenhum valor é recalculado aqui.
export const CENARIOS_AJUSTE = ["pessimista", "realista", "otimista"] as const;
export type CenarioAjuste = (typeof CENARIOS_AJUSTE)[number];
export const ROTULOS_CENARIO_AJUSTE: Record<CenarioAjuste, string> = { pessimista: "PESSIMISTA", realista: "REALISTA", otimista: "OTIMISTA" };

/** grupo = linha de total destacada; item = detalhe recuado; linha = linha simples; resultado = rodapé escuro. */
export type TipoLinhaAjuste = "grupo" | "item" | "linha" | "resultado";
export type ChaveLinhaAjuste =
  | "entradas" | "faturamento" | "coparticipacao"
  | "assistenciais"
  | "demaisOperacionais" | "comercializacao" | "impostosDiretos" | "provisoes" | "secundarias"
  | "administrativas" | "pessoal" | "informatica" | "marketing" | "demaisAdministrativas"
  | "financeiro" | "antesImpostos" | "impostosFederais" | "liquido" | "ebitda";
export interface LinhaAjuste { chave: ChaveLinhaAjuste; rotulo: string; tipo: TipoLinhaAjuste; valores: Record<CenarioAjuste, number> }

const v = (pessimista: number, realista: number, otimista: number) => ({ pessimista, realista, otimista });

export const LINHAS_AJUSTE: readonly LinhaAjuste[] = [
  { chave: "entradas", rotulo: "ENTRADAS OPERACIONAIS", tipo: "grupo", valores: v(47784470385, 50181521236, 52484824613) },
  { chave: "faturamento", rotulo: "FATURAMENTO", tipo: "item", valores: v(43539380761, 45619564759, 47283625778) },
  { chave: "coparticipacao", rotulo: "COPARTICIPAÇÃO", tipo: "item", valores: v(4245089625, 4561956476, 5201198836) },
  { chave: "assistenciais", rotulo: "DESPESAS ASSISTENCIAIS", tipo: "grupo", valores: v(-43961712754, -45118205743, -46711493906) },
  { chave: "demaisOperacionais", rotulo: "DEMAIS OPERACIONAIS", tipo: "grupo", valores: v(-2015873331, -1884088025, -1896073394) },
  { chave: "comercializacao", rotulo: "COMERCIALIZAÇÃO", tipo: "item", valores: v(-422331994, -442509778, -458651170) },
  { chave: "impostosDiretos", rotulo: "IMPOSTOS DIRETOS", tipo: "item", valores: v(-378792613, -396890214, -411367544) },
  { chave: "provisoes", rotulo: "PROVISÕES", tipo: "item", valores: v(-653090712, -456195648, -416095907) },
  { chave: "secundarias", rotulo: "SECUNDÁRIAS", tipo: "item", valores: v(-561658012, -588492386, -609958773) },
  { chave: "administrativas", rotulo: "DESPESAS ADMINISTRATIVAS", tipo: "grupo", valores: v(-3700847364, -3754490180, -3711764623) },
  { chave: "pessoal", rotulo: "PESSOAL", tipo: "item", valores: v(-2264047800, -2258168456, -2269614037) },
  { chave: "informatica", rotulo: "INFORMÁTICA", tipo: "item", valores: v(-435393808, -456195648, -401910819) },
  { chave: "marketing", rotulo: "MARKETING", tipo: "item", valores: v(-348315046, -355832605, -354627193) },
  { chave: "demaisAdministrativas", rotulo: "DEMAIS ADMINISTRATIVAS", tipo: "item", valores: v(-653090712, -684293471, -685612574) },
  { chave: "financeiro", rotulo: "RESULTADO FINANCEIRO", tipo: "linha", valores: v(1985395763, 2080252153, 2364181289) },
  { chave: "antesImpostos", rotulo: "RESULTADO ANTES DOS IMPOSTOS", tipo: "grupo", valores: v(91432699, 1504989441, 2529673979) },
  { chave: "impostosFederais", rotulo: "IMPOSTOS FEDERAIS", tipo: "linha", valores: v(-31087118, -511696410, -860089153) },
  { chave: "liquido", rotulo: "RESULTADO LÍQUIDO", tipo: "resultado", valores: v(60345581, 993293031, 1669584826) },
  { chave: "ebitda", rotulo: "EBITDA", tipo: "resultado", valores: v(-1893963064, -575262712, 165492691) },
];

export const valorAjuste = (chave: ChaveLinhaAjuste, cenario: CenarioAjuste) =>
  LINHAS_AJUSTE.find((l) => l.chave === chave)!.valores[cenario];

/** Centavos em "1.234.567,89" (sinal de menos quando negativo). */
export const formatarAjuste = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Ajuste variável (23/11/2026): cada linha mostra o percentual sobre o FATURAMENTO
// do mesmo cenário. O valor do Faturamento e os percentuais das linhas editáveis
// podem ser alterados; as linhas de total somam a variação das linhas que as compõem
// ao valor fornecido, de modo que, sem alterações, a tela mostra exatamente a imagem.

/** Linhas que compõem cada total, com o sinal com que entram. */
export const COMPOSICAO_AJUSTE: Partial<Record<ChaveLinhaAjuste, readonly (readonly [ChaveLinhaAjuste, 1 | -1])[]>> = {
  entradas: [["faturamento", 1], ["coparticipacao", 1]],
  demaisOperacionais: [["comercializacao", 1], ["impostosDiretos", 1], ["provisoes", 1], ["secundarias", 1]],
  administrativas: [["pessoal", 1], ["informatica", 1], ["marketing", 1], ["demaisAdministrativas", 1]],
  antesImpostos: [["entradas", 1], ["assistenciais", 1], ["demaisOperacionais", 1], ["administrativas", 1], ["financeiro", 1]],
  liquido: [["antesImpostos", 1], ["impostosFederais", 1]],
  ebitda: [["antesImpostos", 1], ["financeiro", -1]],
};

/** Percentual editável: todas as linhas sem composição, exceto o próprio Faturamento (sempre 100%). */
export const percentualEditavel = (chave: ChaveLinhaAjuste) => chave !== "faturamento" && !COMPOSICAO_AJUSTE[chave];

/** Alterações de um cenário: valor do Faturamento (centavos) e percentuais (ex.: -10,5 = -10,5%). */
export interface AlteracoesCenarioAjuste { faturamento?: number; percentuais?: Partial<Record<ChaveLinhaAjuste, number>> }
export type AlteracoesAjuste = Partial<Record<CenarioAjuste, AlteracoesCenarioAjuste>>;

/** Percentual original da linha sobre o Faturamento fornecido, sem arredondar. */
export const percentualOriginalAjuste = (chave: ChaveLinhaAjuste, cenario: CenarioAjuste) =>
  (valorAjuste(chave, cenario) / valorAjuste("faturamento", cenario)) * 100;

/** Valores (centavos) de todas as linhas de um cenário, aplicando as alterações. */
export function valoresCenarioAjuste(cenario: CenarioAjuste, alt: AlteracoesCenarioAjuste = {}): Record<ChaveLinhaAjuste, number> {
  const fat = alt.faturamento ?? valorAjuste("faturamento", cenario);
  const fatAlterado = alt.faturamento !== undefined && alt.faturamento !== valorAjuste("faturamento", cenario);
  const res = {} as Record<ChaveLinhaAjuste, number>;
  const calc = (chave: ChaveLinhaAjuste): number => {
    if (res[chave] !== undefined) return res[chave];
    const original = valorAjuste(chave, cenario);
    const comp = COMPOSICAO_AJUSTE[chave];
    let valor: number;
    if (chave === "faturamento") valor = fat;
    else if (comp) valor = original + comp.reduce((s, [k, sinal]) => s + sinal * (calc(k) - valorAjuste(k, cenario)), 0);
    else {
      const pct = alt.percentuais?.[chave];
      valor = pct !== undefined ? Math.round((pct / 100) * fat)
        : fatAlterado ? Math.round((percentualOriginalAjuste(chave, cenario) / 100) * fat)
        : original;
    }
    return (res[chave] = valor);
  };
  LINHAS_AJUSTE.forEach((l) => calc(l.chave));
  return res;
}

/** Percentual de um valor sobre o Faturamento (ex.: -96,97). */
export const percentualSobreFaturamento = (valor: number, faturamento: number) => (faturamento === 0 ? 0 : (valor / faturamento) * 100);

/** "-96,97" (2 casas, pt-BR). */
export const formatarPercentualAjuste = (pct: number) =>
  pct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const numeroDigitado = (texto: string) => {
  const t = texto.replace(/[%R$\s]/g, "");
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return t === "" || t === "-" || t === "+" || !Number.isFinite(n) ? null : n;
};

/** Lê o percentual digitado. Sem sinal digitado, segue o sinal do valor original (despesas continuam negativas). */
export function lerPercentualAjuste(texto: string, originalNegativo: boolean): number | null {
  const n = numeroDigitado(texto);
  if (n === null) return null;
  const temSinal = /^\s*[-+]/.test(texto);
  return !temSinal && originalNegativo ? -Math.abs(n) : n;
}

/** Lê um valor em reais ("455.000.000,00") e devolve centavos. */
export function lerValorAjuste(texto: string): number | null {
  const n = numeroDigitado(texto);
  return n === null ? null : Math.round(n * 100);
}

export const CHAVE_ALTERACOES_AJUSTE = "axis-simulador-ajuste-alteracoes-v1";

/** Sinistralidade Operacional (slide 4): Despesas Assistenciais ÷ Entradas Operacionais, em % positivo (ex.: 92,00). */
export const sinistralidadeOperacional = (valores: Record<ChaveLinhaAjuste, number>) =>
  valores.entradas === 0 ? 0 : (Math.abs(valores.assistenciais) / valores.entradas) * 100;
