import { describe, expect, it } from "vitest";
import { DEFAULTS_APB, lerDefaultsApb, gravarDefaultsApb } from "./propostaApbDefaults";
const storage = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
};
describe("padrões gravados da Proposta APB", () => {
  it("Gravar preserva as quatro variáveis ao carregar novamente", () => {
    const s = storage();
    const valores = { linEnf: 220, sinPct: 85, copartPct: 30, depBase: 135 };
    gravarDefaultsApb(s, 3, valores);
    expect(lerDefaultsApb(s)[3]).toEqual(valores);
  });
  it("gravar um nível não altera o padrão do outro", () => {
    const s = storage();
    gravarDefaultsApb(s, 4, { linEnf: 210, sinPct: 88, copartPct: 28, depBase: 130 });
    gravarDefaultsApb(s, 3, { linEnf: 250, sinPct: 95, copartPct: 20, depBase: 100 });
    expect(lerDefaultsApb(s)[4]).toEqual({ linEnf: 210, sinPct: 88, copartPct: 28, depBase: 130 });
  });
  it("sem gravação mantém os valores iniciais", () => expect(lerDefaultsApb(storage())).toEqual(DEFAULTS_APB));
});