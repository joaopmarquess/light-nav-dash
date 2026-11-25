import { describe, expect, it } from "vitest";
import { comDefaultUsuario, guardarDefaultUsuario, lerDefaultUsuario } from "./defaultsUsuario";

const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe("Guardar como novo Default", () => {
  it("sem padrão guardado, valem só os digitados", () => {
    expect(comDefaultUsuario("x", { a: 1 }, memoria())).toEqual({ a: 1 });
  });
  it("padrão guardado vale para campos não digitados, e o digitado prevalece", () => {
    const s = memoria();
    guardarDefaultUsuario("x", { a: 5, b: 7 }, s);
    expect(lerDefaultUsuario("x", s)).toEqual({ a: 5, b: 7 });
    expect(comDefaultUsuario("x", { a: 1 }, s)).toEqual({ a: 1, b: 7 });
  });
});
