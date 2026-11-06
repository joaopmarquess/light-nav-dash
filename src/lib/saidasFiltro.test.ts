import { describe, expect, it } from "vitest";
import { FILTRO_SAIDAS_DEFAULT, incluirSaida } from "./saidasFiltro";
const periodo = { de: "2026-01-01", ate: "2026-11-06" };
const incluir = (f: Parameters<typeof incluirSaida>[0], g: string, r: string | null = null) => incluirSaida(f,g,"2026-05-11",r,periodo);
describe("filtros de Saídas", () => {
  it("default Só cancelamentos exclui suspensão, transferência e reativação no período", () => {
    expect(FILTRO_SAIDAS_DEFAULT).toBe("cancelamentos");
    expect(incluir("cancelamentos","Suspensão")).toBe(false);
    expect(incluir("cancelamentos","Transferência")).toBe(false);
    expect(incluir("cancelamentos","A pedido do Beneficiário","2026-06-01")).toBe(false);
    expect(incluir("cancelamentos","Óbito do Beneficiário")).toBe(true);
    expect(incluir("cancelamentos","A pedido do Beneficiário","2011-04-04")).toBe(true);
    expect(incluir("cancelamentos","A pedido do Beneficiário","2026-11-07")).toBe(true);
  });
  it("Transferências seleciona o grupo Transferência", () => {
    expect(incluir("transferencias","Transferência")).toBe(true);
    expect(incluir("transferencias","Suspensão")).toBe(false);
  });
  it("Reativados exige reativação posterior à saída e dentro do período", () => {
    expect(incluir("reativados","A pedido do Beneficiário","2026-11-06")).toBe(true);
    expect(incluir("reativados","A pedido do Beneficiário","2011-04-04")).toBe(false);
    expect(incluir("reativados","A pedido do Beneficiário","2026-11-07")).toBe(false);
  });
  it("Suspensos seleciona o grupo Suspensão", () => {
    expect(incluir("suspensos","Suspensão")).toBe(true);
    expect(incluir("suspensos","Transferência")).toBe(false);
  });
  it("Todos mantém todas as categorias de saída", () => {
    for (const grupo of ["Suspensão","Transferência","A pedido do Beneficiário"]) expect(incluir("todos",grupo,"2026-06-01")).toBe(true);
  });
});