// Tabelas comerciais do Modelo de Atuação: cada frente = Referência × índice da frente.
export const FAIXAS = ["00 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 ou +"] as const;

/** Enfermaria da tabela Referência, em centavos. */
export const REFERENCIA_ENFERMARIA_CENTAVOS = [17500, 20422, 23832, 26262, 30646, 35027, 42907, 53504, 70999, 104970];

export type FrenteId = "pcaAdm" | "pceAdm" | "pce100";
export type Indices = Record<FrenteId, number>;

/** Índices padrão (% da Referência). */
export const INDICES_PADRAO: Indices = { pcaAdm: 90, pceAdm: 80, pce100: 70 };

export type LinhaTabela = { faixa: string; enfermariaCentavos: number; apartamentoCentavos: number };

/** Apartamento = TRUNCAR(Enfermaria × 1,25; 2). */
export const apartamentoDe = (enfermariaCentavos: number) => Math.floor((enfermariaCentavos * 125) / 100);

/** Enfermaria = ARRED(Referência × índice; 2); Apartamento = TRUNCAR(Enfermaria × 1,25; 2). */
export function tabelaIndexada(indicePercentual: number): LinhaTabela[] {
  return FAIXAS.map((faixa, i) => {
    const enf = Math.round((REFERENCIA_ENFERMARIA_CENTAVOS[i] * Math.round(indicePercentual * 100)) / 10000);
    return { faixa, enfermariaCentavos: enf, apartamentoCentavos: apartamentoDe(enf) };
  });
}

export const tabelaReferencia = () => tabelaIndexada(100);

export const formatarCentavos = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Aceita "90", "87,5" ou "87.5"; devolve null fora de 0–200. */
export function parseIndice(texto: string): number | null {
  const t = texto.trim().replace("%", "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 200) return null;
  return Math.round(n * 100) / 100;
}

const CHAVE = "uberaba-tabelas-comerciais-indices-v1";

export function lerIndices(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): Indices {
  try {
    const salvo = JSON.parse(storage?.getItem(CHAVE) ?? "null");
    if (!salvo || typeof salvo !== "object") return { ...INDICES_PADRAO };
    const out = { ...INDICES_PADRAO };
    (Object.keys(out) as FrenteId[]).forEach((k) => {
      const v = salvo[k];
      if (typeof v === "number" && v >= 0 && v <= 200) out[k] = v;
    });
    return out;
  } catch {
    return { ...INDICES_PADRAO };
  }
}

export function gravarIndices(indices: Indices, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try { storage?.setItem(CHAVE, JSON.stringify(indices)); } catch { /* armazenamento indisponível */ }
}
