import { describe, expect, it } from "vitest";
import { filtrarGruposPermissao } from "./filtroPermissoes";

const grupos = [
  { label: "Control", items: [{ id: "a", label: "Orçamento · Simulador 2027" }, { id: "b", label: "Demonstrações" }] },
  { label: "Carteira", items: [{ id: "c", label: "Entradas" }, { id: "d", label: "Movimentação" }] },
];

describe("filtrarGruposPermissao", () => {
  it("sem texto devolve todos os grupos", () => {
    expect(filtrarGruposPermissao(grupos, "  ")).toBe(grupos);
  });
  it("mostra só os submenus que contêm o pedaço digitado, sem diferenciar acento ou maiúscula", () => {
    const r = filtrarGruposPermissao(grupos, "MOVIMENTACAO");
    expect(r.map(g => g.label)).toEqual(["Carteira"]);
    expect(r[0].items.map(i => i.id)).toEqual(["d"]);
  });
  it("quando o nome do menu contém o texto, mostra todos os seus submenus", () => {
    const r = filtrarGruposPermissao(grupos, "contr");
    expect(r[0].items.map(i => i.id)).toEqual(["a", "b"]);
  });
  it("encontra por pedaço no meio do nome", () => {
    expect(filtrarGruposPermissao(grupos, "mula").flatMap(g => g.items.map(i => i.id))).toEqual(["a"]);
  });
});
