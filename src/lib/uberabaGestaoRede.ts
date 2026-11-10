/** Variáveis e quadro Antecipação × Mensal da Gestão Rede (Estudo Uberaba), editados na tela e gravados neste navegador. */
export type ChaveGestaoRede =
  | "valorVidaPaulo" | "valorVidaAdeir"
  | "tetoPaulo" | "tetoAdeir"
  | "numeroVidasTotal"
  | "adiantamentoPaulo" | "adiantamentoAdeir";

export type VariaveisGestaoRede = Record<ChaveGestaoRede, number>;

export type CampoGestaoRede = { chave: ChaveGestaoRede; label: string; tipo: "moeda" | "inteiro" };

export const CAMPOS_GESTAO_REDE: CampoGestaoRede[] = [
  { chave: "valorVidaPaulo", label: "Valor Vida Paulo", tipo: "moeda" },
  { chave: "valorVidaAdeir", label: "Valor Vida Adeir", tipo: "moeda" },
  { chave: "tetoPaulo", label: "Teto Paulo", tipo: "moeda" },
  { chave: "tetoAdeir", label: "Teto Adeir", tipo: "moeda" },
  { chave: "numeroVidasTotal", label: "Número Vidas total", tipo: "inteiro" },
  { chave: "adiantamentoPaulo", label: "Adiantamento Paulo", tipo: "moeda" },
  { chave: "adiantamentoAdeir", label: "Adiantamento Adeir", tipo: "moeda" },
];

/** Valores iniciais definidos em 10/11/2026: teto 15.000, adiantamento 7.500, valor por vida 1,00 e 10.000 vidas ao longo do ano. */
export const GESTAO_REDE_PADRAO: VariaveisGestaoRede = {
  valorVidaPaulo: 1, valorVidaAdeir: 1,
  tetoPaulo: 15000, tetoAdeir: 15000,
  numeroVidasTotal: 10000,
  adiantamentoPaulo: 7500, adiantamentoAdeir: 7500,
};

export const MESES_GESTAO_REDE = 12;
/** Meses iniciais pagos com o adiantamento; o mesmo número de meses finais abate esses adiantamentos. */
export const MESES_ADIANTAMENTO = 2;

/**
 * Distribui o Número Vidas total em entradas iguais ao longo dos meses (diferença de arredondamento espalhada),
 * retornando as vidas acumuladas no fim de cada mês; o último mês alcança exatamente o total.
 */
export function distribuirVidas(total: number, meses = MESES_GESTAO_REDE): { entradas: number[]; vidas: number[] } {
  const t = Math.max(0, Math.round(total));
  const vidas = Array.from({ length: meses }, (_, i) => Math.round((t * (i + 1)) / meses));
  const entradas = vidas.map((v, i) => v - (i ? vidas[i - 1] : 0));
  return { entradas, vidas };
}

export type TipoMes = "adiantamento" | "mensal" | "recuperacao";
export type LinhaGestaoRede = {
  mes: number; entradas: number; vidas: number;
  antecipacaoPaulo: number; antecipacaoAdeir: number; antecipacaoTotal: number;
  mensalPaulo: number; mensalAdeir: number; mensalTotal: number;
  tipoPaulo: TipoMes; tipoAdeir: TipoMes;
  tetoPaulo: boolean; tetoAdeir: boolean;
};

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Antecipação de uma pessoa: os primeiros meses pagam o adiantamento; os seguintes pagam o mensal; os últimos meses
 * (mesma quantidade dos adiantados) pagam o mensal menos o que foi adiantado além do mensal, em partes iguais.
 * Assim o total antecipado é igual ao total mensal.
 */
export function antecipacaoPessoa(mensal: number[], adiantamento: number): { valores: number[]; tipos: TipoMes[] } {
  const n = mensal.length;
  const nAd = Math.min(MESES_ADIANTAMENTO, Math.floor(n / 2));
  const tipos: TipoMes[] = mensal.map((_, i) => (i < nAd ? "adiantamento" : i >= n - nAd ? "recuperacao" : "mensal"));
  const valores = mensal.map((m, i) => (i < nAd ? adiantamento : m));
  if (nAd) {
    const excesso = mensal.slice(0, nAd).reduce((s, m) => s + (adiantamento - m), 0);
    const base = mensal.slice(n - nAd).reduce((s, m) => s + m, 0);
    const parte = (base - excesso) / nAd;
    for (let i = n - nAd; i < n; i++) valores[i] = parte;
  }
  return { valores: valores.map(r2), tipos };
}

/** Mensal de cada pessoa = vidas acumuladas × valor por vida, limitado ao teto. */
export function calcularGestaoRede(v: VariaveisGestaoRede): LinhaGestaoRede[] {
  const { entradas, vidas } = distribuirVidas(v.numeroVidasTotal);
  const bruto = (valor: number) => vidas.map((q) => r2(q * valor));
  const bp = bruto(v.valorVidaPaulo), ba = bruto(v.valorVidaAdeir);
  const mp = bp.map((m) => Math.min(m, v.tetoPaulo));
  const ma = ba.map((m) => Math.min(m, v.tetoAdeir));
  const ap = antecipacaoPessoa(mp, v.adiantamentoPaulo);
  const aa = antecipacaoPessoa(ma, v.adiantamentoAdeir);
  return vidas.map((q, i) => ({
    mes: i + 1, entradas: entradas[i], vidas: q,
    antecipacaoPaulo: ap.valores[i], antecipacaoAdeir: aa.valores[i], antecipacaoTotal: r2(ap.valores[i] + aa.valores[i]),
    mensalPaulo: mp[i], mensalAdeir: ma[i], mensalTotal: r2(mp[i] + ma[i]),
    tipoPaulo: ap.tipos[i], tipoAdeir: aa.tipos[i],
    tetoPaulo: bp[i] > v.tetoPaulo, tetoAdeir: ba[i] > v.tetoAdeir,
  }));
}

export function totaisGestaoRede(linhas: LinhaGestaoRede[]) {
  const soma = (k: "antecipacaoPaulo" | "antecipacaoAdeir" | "antecipacaoTotal" | "mensalPaulo" | "mensalAdeir" | "mensalTotal" | "entradas") =>
    r2(linhas.reduce((s, l) => s + l[k], 0));
  return {
    antecipacaoPaulo: soma("antecipacaoPaulo"), antecipacaoAdeir: soma("antecipacaoAdeir"), antecipacaoTotal: soma("antecipacaoTotal"),
    mensalPaulo: soma("mensalPaulo"), mensalAdeir: soma("mensalAdeir"), mensalTotal: soma("mensalTotal"), entradas: soma("entradas"),
  };
}

/** v2: novos valores iniciais (teto 15.000) substituem gravações feitas com o padrão anterior. */
const KEY = "uberaba-gestao-rede-v2";
type StorageGR = Pick<Storage, "getItem" | "setItem">;
const valido = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const normalizar = (c: CampoGestaoRede, v: number) => (c.tipo === "inteiro" ? Math.round(v) : Math.round(v * 100) / 100);

/** Converte texto pt-BR ("1.234,56") em número; retorna NaN se inválido. Vazio = 0. */
export function parseNumeroBR(texto: string): number {
  const t = texto.trim().replace(/^R\$\s*/, "");
  if (!t) return 0;
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(t)) return NaN;
  return Number(t.replace(/\./g, "").replace(",", "."));
}

export function formatarCampo(c: CampoGestaoRede, v: number): string {
  return c.tipo === "inteiro"
    ? v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function lerGestaoRede(storage: StorageGR): VariaveisGestaoRede {
  const out = { ...GESTAO_REDE_PADRAO };
  try {
    const saved = JSON.parse(storage.getItem(KEY) ?? "null");
    if (saved && typeof saved === "object") for (const c of CAMPOS_GESTAO_REDE) if (valido(saved[c.chave])) out[c.chave] = normalizar(c, saved[c.chave]);
  } catch { /* Manter os valores iniciais se o armazenamento estiver indisponível ou inválido. */ }
  return out;
}

export function gravarGestaoRede(storage: StorageGR, valores: VariaveisGestaoRede): VariaveisGestaoRede {
  const out = { ...GESTAO_REDE_PADRAO };
  for (const c of CAMPOS_GESTAO_REDE) {
    if (!valido(valores[c.chave])) throw new Error(`Valor inválido em ${c.label}`);
    out[c.chave] = normalizar(c, valores[c.chave]);
  }
  storage.setItem(KEY, JSON.stringify(out));
  return out;
}
