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

/** Valores iniciais do quadro fornecido em 10/11/2026 (Teto 7.500 inferido do mês em que a recuperação começa). */
export const GESTAO_REDE_PADRAO: VariaveisGestaoRede = {
  valorVidaPaulo: 1, valorVidaAdeir: 1,
  tetoPaulo: 7500, tetoAdeir: 7500,
  numeroVidasTotal: 10000,
  adiantamentoPaulo: 7500, adiantamentoAdeir: 7500,
};

/** Vidas por mês do quadro fornecido (meses 1 a 12). */
export const VIDAS_MES_PADRAO = [300, 600, 1200, 2000, 2800, 3600, 4400, 5200, 6000, 6800, 7500, 10000];
/** Meses iniciais pagos com o adiantamento. */
export const MESES_ADIANTAMENTO = 2;

export type LinhaGestaoRede = {
  mes: number; vidas: number;
  antecipacaoPaulo: number; antecipacaoAdeir: number; antecipacaoTotal: number;
  mensalPaulo: number; mensalAdeir: number; mensalTotal: number;
  tipoPaulo: TipoMes; tipoAdeir: TipoMes;
};
export type TipoMes = "adiantamento" | "mensal" | "recuperacao";

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Antecipação de uma pessoa: nos primeiros meses paga o adiantamento; depois paga o mensal (vidas × valor por vida);
 * o que foi adiantado além do mensal é descontado, em partes iguais, nos meses em que o mensal alcança o teto
 * (se nenhum mês alcançar, no último). Assim o total antecipado é igual ao total mensal.
 */
export function antecipacaoPessoa(mensal: number[], adiantamento: number, teto: number): { valores: number[]; tipos: TipoMes[] } {
  const n = mensal.length;
  const nAd = Math.min(MESES_ADIANTAMENTO, n);
  const tipos: TipoMes[] = mensal.map((_, i) => (i < nAd ? "adiantamento" : "mensal"));
  const valores = mensal.map((m, i) => (i < nAd ? adiantamento : m));
  const excesso = mensal.slice(0, nAd).reduce((s, m) => s + (adiantamento - m), 0);
  let recup = mensal.map((m, i) => (i >= nAd && m >= teto ? i : -1)).filter((i) => i >= 0);
  if (!recup.length && n > nAd) recup = [n - 1];
  if (recup.length) {
    const base = recup.reduce((s, i) => s + mensal[i], 0);
    const parte = (base - excesso) / recup.length;
    for (const i of recup) { valores[i] = r2(parte); tipos[i] = "recuperacao"; }
  }
  return { valores: valores.map(r2), tipos };
}

export function calcularGestaoRede(v: VariaveisGestaoRede, vidas: number[]): LinhaGestaoRede[] {
  const mp = vidas.map((q) => r2(q * v.valorVidaPaulo));
  const ma = vidas.map((q) => r2(q * v.valorVidaAdeir));
  const ap = antecipacaoPessoa(mp, v.adiantamentoPaulo, v.tetoPaulo);
  const aa = antecipacaoPessoa(ma, v.adiantamentoAdeir, v.tetoAdeir);
  return vidas.map((q, i) => ({
    mes: i + 1, vidas: q,
    antecipacaoPaulo: ap.valores[i], antecipacaoAdeir: aa.valores[i], antecipacaoTotal: r2(ap.valores[i] + aa.valores[i]),
    mensalPaulo: mp[i], mensalAdeir: ma[i], mensalTotal: r2(mp[i] + ma[i]),
    tipoPaulo: ap.tipos[i], tipoAdeir: aa.tipos[i],
  }));
}

export function totaisGestaoRede(linhas: LinhaGestaoRede[]) {
  const soma = (k: keyof LinhaGestaoRede) => r2(linhas.reduce((s, l) => s + (l[k] as number), 0));
  return {
    antecipacaoPaulo: soma("antecipacaoPaulo"), antecipacaoAdeir: soma("antecipacaoAdeir"), antecipacaoTotal: soma("antecipacaoTotal"),
    mensalPaulo: soma("mensalPaulo"), mensalAdeir: soma("mensalAdeir"), mensalTotal: soma("mensalTotal"), vidas: soma("vidas"),
  };
}

const KEY_VIDAS = "uberaba-gestao-rede-vidas-v1";
export function lerVidasMes(storage: Pick<Storage, "getItem">): number[] {
  try {
    const saved = JSON.parse(storage.getItem(KEY_VIDAS) ?? "null");
    if (Array.isArray(saved) && saved.length === VIDAS_MES_PADRAO.length && saved.every((x) => typeof x === "number" && Number.isFinite(x) && x >= 0)) return saved.map(Math.round);
  } catch { /* usar o quadro fornecido */ }
  return [...VIDAS_MES_PADRAO];
}
export function gravarVidasMes(storage: Pick<Storage, "setItem">, vidas: number[]): number[] {
  if (vidas.length !== VIDAS_MES_PADRAO.length || !vidas.every((x) => Number.isFinite(x) && x >= 0)) throw new Error("Vidas por mês inválidas");
  const out = vidas.map(Math.round);
  storage.setItem(KEY_VIDAS, JSON.stringify(out));
  return out;
}

const KEY = "uberaba-gestao-rede-v1";
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
