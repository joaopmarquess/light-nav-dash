import { describe, expect, it } from "vitest";
import { axisPermissionGroups } from "./axisNavigation";
import { canAccess, type AxisAccess } from "./axisAccess";

describe("Home shortcut permissions", () => {
  const items = axisPermissionGroups.find(g => g.label === "Home")?.items ?? [];
  it.each([
    ["Movimentação", "Carteira · Movimentação"],
    ["Área Geográfica", "Carteira · Área Geográfica"],
    ["Período", "Sinistralidade · Períodos"],
    ["Controladoria", "Control · DRE Gerencial PE"],
    ["Projeto Bensaúde|Uberaba", "Uberaba Timeline"],
    ["Laboratory", "Laboratory"],
    ["Proposta APB", "Proposta APB"],
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