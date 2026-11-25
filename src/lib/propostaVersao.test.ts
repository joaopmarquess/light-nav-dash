import { describe, expect, it } from "vitest";
import { dataImpressaoProposta, mesAnoVersao, notaVersaoProposta, proximaVersaoProposta, registrarVersaoProposta } from "@/lib/propostaVersao";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe("versão das propostas", () => {
  it("começa em v2 e segue sequencial", () => {
    const s = mem();
    expect(proximaVersaoProposta("x", s)).toBe(2);
    registrarVersaoProposta("x", 2, s);
    expect(proximaVersaoProposta("x", s)).toBe(3);
    expect(proximaVersaoProposta("y", s)).toBe(2);
  });
  it("capa, data e nota como no modelo", () => {
    const f = { versao: 2, nota: "Revisão X", data: new Date("2026-11-25T12:00:00Z") };
    expect(mesAnoVersao(f)).toBe("Novembro de 2026 (v2)");
    expect(dataImpressaoProposta(f.data)).toBe("25/11/2026");
    expect(notaVersaoProposta(f)).toBe("Versão 2 | Revisão X");
  });
});
