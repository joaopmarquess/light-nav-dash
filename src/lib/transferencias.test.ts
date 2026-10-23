import { describe, expect, it } from "vitest";
import { classificarTransferencias } from "./transferencias";

const de = "2026-10-01", ate = "2026-10-23";

describe("classificarTransferencias", () => {
  it("liga por CPF ignorando zeros à esquerda e classifica chegadas", () => {
    const r = classificarTransferencias(
      [
        { cpf: "01", mat: "N1", nome: "A", data: "2026-10-01" },
        { cpf: "2", mat: "N2", nome: "B", data: "2026-10-01" },
        { cpf: "3", mat: "N3", nome: "C", data: "2026-10-10" },
      ],
      [],
      [
        { cpf: "1", mat: "A1", vig: "2020-01-01", desl: "2026-09-30" },
        { cpf: "2", mat: "A2", vig: "2020-01-01", desl: "2026-10-01" },
      ],
      de, ate,
    );
    expect(r.grupos.veioAntes.map((i) => i.matAnterior)).toEqual(["A1"]);
    expect(r.grupos.dentroChegada.map((i) => i.matAnterior)).toEqual(["A2"]);
    expect(r.grupos.semAnterior.map((i) => i.matNova)).toEqual(["N3"]);
  });

  it("classifica partidas e calcula o saldo sem contar trocas dentro do período", () => {
    const r = classificarTransferencias(
      [{ cpf: "9", mat: "X", nome: "Z", data: "2026-10-05" }],
      [
        { cpf: "1", mat: "A1", nome: "A", data: "2026-10-01" },
        { cpf: "2", mat: "A2", nome: "B", data: "2026-10-20" },
        { cpf: "3", mat: "A3", nome: "C", data: "2026-10-01" },
      ],
      [
        { cpf: "1", mat: "N1", vig: "2026-10-01", desl: "" },
        { cpf: "2", mat: "N2", vig: "2026-11-01", desl: "" },
      ],
      de, ate,
    );
    expect(r.grupos.dentro).toHaveLength(1);
    expect(r.grupos.depois).toHaveLength(1);
    expect(r.grupos.semNova).toHaveLength(1);
    expect(r.saldo).toBe(1 - 2);
  });
});
