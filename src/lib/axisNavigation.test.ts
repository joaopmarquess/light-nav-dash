import { describe, expect, it } from "vitest";
import { axisPermissionGroups, homeShortcutGroups, homeShortcuts, menuItems } from "./axisNavigation";
import { canAccess, type AxisAccess } from "./axisAccess";

describe("Home shortcut permissions", () => {
  const items = axisPermissionGroups.find(g => g.label === "Home")?.items ?? [];
  it.each([
    ["Desp. Assistencial", "Assistencial · Análise de Despesas Assistenciais"],
    ["Movimentação", "Carteira · Movimentação"],
    ["Área Geográfica", "Carteira · Área Geográfica"],
    ["Período", "Sinistralidade · Períodos"],
    ["Controladoria", "Control · DRE Gerencial PE"],
    ["Demonstrações", "Control · DRE Gerencial PE"],
    ["Proj. Uberaba", "Uberaba Timeline"],
    ["Proposta Uberaba", "Proj. Uberaba · Resultados Comerciais"],
    ["Laboratory", "Laboratory"],
    ["Proposta APB", "Proposta APB"],
    ["Produtos Lancers", "Produtos Lancers"],
    ["Evolução Produtos", "Evolução Produtos"],
    ["Painel", "Carteira · Painel"],
    ["Bench Vidas", "Carteira · Bench Vidas"],
    ["Bench Contábil", "Control · Bench C"],
  ])("%s grants only its existing destination", (label, destination) => {
    const item = items.find(i => i.label === label);
    expect(item?.id).toBe(destination);
    const access: AxisAccess = { status: "ok", role: "user", permissions: item ? [item.id] : [] };
    expect(canAccess(access, destination)).toBe(true);
    expect(canAccess(access, "Configurações")).toBe(false);
    expect(canAccess(access, "Carteira · Consulta")).toBe(false);
  });
  it("Home alone does not grant its shortcut destinations", () => {
    const access: AxisAccess = { status: "ok", role: "user", permissions: ["Home"] };
    expect(canAccess(access, "Home")).toBe(true);
    for (const item of items.filter(i => i.id !== "Home")) expect(canAccess(access, item.id)).toBe(false);
  });
});

describe("Bench Vidas permission", () => {
  it("provides a dedicated Carteira permission without granting other submenus", () => {
    const items = axisPermissionGroups.find(g => g.label === "Carteira")?.items ?? [];
    expect(items.find(i => i.label === "Bench Vidas")?.id).toBe("Carteira · Bench Vidas");
    const access: AxisAccess = { status: "ok", role: "user", permissions: ["Carteira · Bench Vidas"] };
    expect(canAccess(access, "Carteira · Bench Vidas")).toBe(true);
    expect(canAccess(access, "Carteira · Movimentação")).toBe(false);
  });
});
describe("Sinistralidade submenus", () => {
  const items = axisPermissionGroups.find(g => g.label === "Sinistralidade")?.items ?? [];
  it("lists only Períodos and Evolução Produtos", () => {
    expect(items.map(i => i.label)).toEqual(["Períodos", "Evolução Produtos"]);
  });
  it("Evolução Produtos in Sinistralidade is its own permission, independent of the Home shortcut", () => {
    const access: AxisAccess = { status: "ok", role: "user", permissions: ["Sinistralidade · Evolução Produtos"] };
    expect(canAccess(access, "Sinistralidade · Evolução Produtos")).toBe(true);
    expect(canAccess(access, "Evolução Produtos")).toBe(false);
    expect(canAccess(access, "Sinistralidade · Períodos")).toBe(false);
  });
});

describe("Home shortcut groups", () => {
  it("groups shortcuts under their main menu in sidebar order, Laboratory last", () => {
    expect(homeShortcutGroups().map(g => [g.menu, g.items.map(i => i.label)])).toEqual([
      ["Control", ["Controladoria", "Demonstrações", "Bench Contábil"]],
      ["Assistencial", ["Desp. Assistencial"]],
      ["Carteira", ["Movimentação", "Área Geográfica", "Painel", "Bench Vidas"]],
      ["Sinistralidade", ["Período", "Evolução Produtos"]],
      ["Laboratory", ["Laboratory", "Proj. Uberaba", "Proposta Uberaba", "Proposta APB", "Simular Datas FM", "Produtos Lancers"]],
    ]);
  });
  it("omits a menu with no permitted shortcut", () => {
    const only = homeShortcuts.filter(s => s.menu === "Carteira");
    expect(homeShortcutGroups(only).map(g => g.menu)).toEqual(["Carteira"]);
  });
});

describe("Control › Orçamento submenu", () => {
  it("groups Orçamento 2026, Simulador 2027 and Orçamento 2027 under Orçamento, keeping their permission ids", () => {
    const control = menuItems.find(m => m.label === "Control");
    const grupo = (control?.children ?? []).filter(c => c.grupo === "Orçamento");
    expect(grupo.map(c => [c.label, c.id])).toEqual([
      ["Orçamento 2026", "Control · Orçamento Vigente"],
      ["Simulador 2027", "Control · Simulador"],
      ["Orçamento 2027", "Control · Slides Simulação"],
    ]);
    const items = axisPermissionGroups.find(g => g.label === "Control")?.items ?? [];
    expect(items.find(i => i.id === "Control · Simulador")?.label).toBe("Orçamento · Simulador 2027");
  });
});

describe("Financeiro menu", () => {
  it("sits right after Control with its own Inadimplência permission", () => {
    expect(menuItems.map(m => m.label).slice(0, 3)).toEqual(["Home", "Control", "Financeiro"]);
    const items = axisPermissionGroups.find(g => g.label === "Financeiro")?.items ?? [];
    expect(items).toEqual([{ id: "Financeiro · Inadimplência", label: "Inadimplência" }]);
    const access: AxisAccess = { status: "ok", role: "user", permissions: ["Financeiro · Inadimplência"] };
    expect(canAccess(access, "Financeiro · Inadimplência")).toBe(true);
    expect(canAccess(access, "Control · DRE Gerencial PE")).toBe(false);
  });
});

describe("Assistencial menu", () => {
  it("expõe a análise no menu principal com permissão própria sem liberar outras telas", () => {
    const id = "Assistencial · Análise de Despesas Assistenciais";
    const items = axisPermissionGroups.find(g => g.label === "Assistencial")?.items ?? [];
    expect(items.map(i => i.id)).toEqual([id]);
    const access: AxisAccess = { status: "ok", role: "user", permissions: [id] };
    expect(canAccess(access, id)).toBe(true);
    expect(canAccess(access, "Consulta")).toBe(false);
    expect(canAccess(access, "Control · DRE Gerencial PE")).toBe(false);
  });
});

describe("Laboratory › Slides Simulador 2027", () => {
  it("has its own permission inside the Laboratory Orçamento group", () => {
    const items = axisPermissionGroups.find(g => g.label === "Laboratory")?.items ?? [];
    expect(items.find(i => i.id === "Slides Simulador 2027")?.label).toBe("Orçamento · Slides Simulador 2027");
    const access: AxisAccess = { status: "ok", role: "user", permissions: ["Slides Simulador 2027"] };
    expect(canAccess(access, "Control · Slides Simulação")).toBe(false);
  });
});

import { appsCelular } from "./axisNavigation";
describe("Modo celular", () => {
  it("lista Movimentação e Demonstrações", () => {
    expect(appsCelular.map(a => a.id)).toEqual(["Carteira · Movimentação", "Control · DRE Gerencial PE", "Control · Bench C", "Control · Orçamento Vigente"]);
  });
});
