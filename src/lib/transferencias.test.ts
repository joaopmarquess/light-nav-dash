import { describe, it, expect } from "vitest";
import { transfSaidas, transfEntradas, mesValido, type TransfMat } from "./transferencias";

const MOT = new Set([6, 208]);
const m = (o: Partial<TransfMat>): TransfMat => ({ cpf: "1", mat: "x", nome: "N", vig: "", desl: "", vendedor: null, motivo: null, ...o });

describe("conceito de transferência", () => {
  it("mesmo mês ou mês seguinte valem; dois meses depois não", () => {
    expect(mesValido("2026-09-30", "2026-09-01")).toBe(true);
    expect(mesValido("2026-09-30", "2026-10-15")).toBe(true);
    expect(mesValido("2026-09-30", "2026-11-01")).toBe(false);
    expect(mesValido("2026-10-01", "2026-09-30")).toBe(false);
  });

  it("saída com motivo de transferência e reentrada pelo vendedor 274 é Pura", () => {
    const s = m({ mat: "a", desl: "2026-10-01", motivo: 208 });
    const r = transfSaidas([s], [s, m({ mat: "b", vig: "2026-10-01", vendedor: 274 })], MOT);
    expect([...r.values()][0].tipo).toBe("Pura");
  });

  it("reentrada por outro vendedor é Revenda", () => {
    const s = m({ mat: "a", desl: "2026-10-01", motivo: 6 });
    const r = transfSaidas([s], [m({ mat: "b", vig: "2026-11-01", vendedor: 87 })], MOT);
    expect([...r.values()][0].tipo).toBe("Revenda");
  });

  it("motivo fora do grupo Transferência não conta", () => {
    const s = m({ mat: "a", desl: "2026-10-01", motivo: 22 });
    expect(transfSaidas([s], [m({ mat: "b", vig: "2026-10-01", vendedor: 274 })], MOT).size).toBe(0);
  });

  it("ligação apenas por CPF", () => {
    const e = m({ cpf: "2", mat: "b", vig: "2026-10-01", vendedor: 274 });
    expect(transfEntradas([e], [m({ cpf: "1", mat: "a", desl: "2026-09-30", motivo: 6 })], MOT).size).toBe(0);
    expect(transfEntradas([e], [m({ cpf: "002", mat: "a", desl: "2026-09-30", motivo: 6 })], MOT).size).toBe(1);
  });
});

import { blocoMes } from "./transferencias";
describe("blocos por mês", () => {
  it("classifica anterior, mesmo e próximo mês", () => {
    expect(blocoMes("T+", { saida: "2026-09-30", entrada: "2026-10-01" })).toBe("anterior");
    expect(blocoMes("T+", { saida: "2026-10-01", entrada: "2026-10-01" })).toBe("mesmo");
    expect(blocoMes("T-", { saida: "2026-10-20", entrada: "2026-11-01" })).toBe("proximo");
    expect(blocoMes("T-", { saida: "2026-10-01", entrada: "2026-10-01" })).toBe(null);
  });
});
