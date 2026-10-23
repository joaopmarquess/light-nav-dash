import { describe, it, expect } from "vitest";
import { normalizarVendedor } from "./vendedorTransferencia";

describe("normalizarVendedor", () => {
  it("274 com nome de pessoa vira TRANSFERENCIA DE CONTRATO", () => {
    expect(normalizarVendedor({ cd_vendedor: 274, nm_vendedor: "ANDRE DOS SANTOS GARCIA" }).nm_vendedor).toBe("TRANSFERENCIA DE CONTRATO");
  });
  it("código 87 mantém o nome", () => {
    expect(normalizarVendedor({ cd_vendedor: 87, nm_vendedor: "ANDRE DOS SANTOS GARCIA" }).nm_vendedor).toBe("ANDRE DOS SANTOS GARCIA");
  });
});
