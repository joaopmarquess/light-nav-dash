/** Variáveis da Gestão Rede (Estudo Uberaba), editadas na tela e gravadas neste navegador. Sem fórmulas até novas instruções. */
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

export const GESTAO_REDE_PADRAO: VariaveisGestaoRede = Object.fromEntries(CAMPOS_GESTAO_REDE.map((c) => [c.chave, 0])) as VariaveisGestaoRede;

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
  } catch { /* Manter zeros se o armazenamento estiver indisponível ou inválido. */ }
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
