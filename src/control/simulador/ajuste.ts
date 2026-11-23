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
