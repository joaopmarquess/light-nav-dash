import { describe, expect, it } from "vitest";
import { periodoHomeCelular } from "./homeCelularPeriodo";

describe("Período da Home celular", () => {
  it("começa em 01/01/2026", () => {
    expect(periodoHomeCelular(new Date("2026-11-26T20:28:00Z")).de).toBe("2026-01-01");
  });
  it("termina na data atual, sem recuar para o mês fechado", () => {
    expect(periodoHomeCelular(new Date("2026-11-26T20:28:00Z")).ate).toBe("2026-11-26");
    expect(periodoHomeCelular(new Date("2026-12-03T12:00:00Z")).ate).toBe("2026-12-03");
  });
});