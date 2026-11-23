import { describe, expect, it } from "vitest";
import { catalogoTelas, pesquisarTelas } from "./pesquisaApp";

describe("Pesquisar App", () => {
  it("mostra o caminho de menus até a tela", () => {
    const sim = catalogoTelas().find(t => t.id === "Control · Simulador");
    expect(sim?.caminho).toEqual(["Control", "Orçamento", "Simulador 2027"]);
  });
  it("encontra por pedaço do nome, sem diferenciar acento", () => {
    expect(pesquisarTelas("inadimplencia").map(t => t.id)).toEqual(["Financeiro · Inadimplência"]);
  });
  it("encontra telas do Laboratory com o caminho do grupo", () => {
    const r = pesquisarTelas("lancers");
    expect(r[0].caminho).toEqual(["Laboratory", "Produtos Lancers"]);
  });
  it("aceita várias palavras, combinando nome e caminho", () => {
    expect(pesquisarTelas("carteira painel")[0].id).toBe("Carteira · Painel");
  });
  it("nome do atalho da Home também encontra a tela", () => {
    expect(pesquisarTelas("controladoria").map(t => t.id)).toContain("Control · DRE Gerencial PE");
  });
  it("não lista o mesmo destino duas vezes nem o item interno de configurações do Control", () => {
    const ids = catalogoTelas().map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("__cfg_control__");
  });
  it("texto vazio não lista nada", () => {
    expect(pesquisarTelas("   ")).toEqual([]);
  });
});
