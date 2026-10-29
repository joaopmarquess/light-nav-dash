export interface VariaveisApb { linEnf: number; sinPct: number; copartPct: number; depBase: number }
export type DefaultsApb = Record<3 | 4, VariaveisApb>;
export const DEFAULTS_APB: DefaultsApb = {
  3: { linEnf: 249.17, sinPct: 99, copartPct: 25, depBase: 110 },
  4: { linEnf: 199.99, sinPct: 90, copartPct: 25, depBase: 125 },
};
const KEY = "apb-variaveis-default-v1";
type StorageApb = Pick<Storage, "getItem" | "setItem">;
export function lerDefaultsApb(storage: StorageApb): DefaultsApb {
  const out: DefaultsApb = { 3: { ...DEFAULTS_APB[3] }, 4: { ...DEFAULTS_APB[4] } };
  try {
    const saved = JSON.parse(storage.getItem(KEY) ?? "null");
    for (const n of [3, 4] as const) {
      const v = saved?.[n];
      if (v && Object.keys(DEFAULTS_APB[n]).every((k) => typeof v[k] === "number" && Number.isFinite(v[k]) && v[k] >= 0)) out[n] = { linEnf: v.linEnf, sinPct: v.sinPct, copartPct: v.copartPct, depBase: v.depBase };
    }
  } catch { /* Manter padrões iniciais se armazenamento indisponível ou inválido. */ }
  return out;
}
export function gravarDefaultsApb(storage: StorageApb, nivel: 3 | 4, valores: VariaveisApb): DefaultsApb {
  if (!Object.values(valores).every((v) => Number.isFinite(v) && v >= 0)) throw new Error("Valores inválidos");
  const defaults = { ...lerDefaultsApb(storage), [nivel]: { ...valores } };
  storage.setItem(KEY, JSON.stringify(defaults));
  return defaults;
}