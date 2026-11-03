import { describe, it, expect } from "vitest";
import { canAccess, type AxisAccess } from "./axisAccess";
describe("AXIS privileges", () => {
  it("principal administrator can access Configurações", () => expect(canAccess({status:"ok",role:"admin",permissions:[]}, "Configurações")).toBe(true));
  it("master cannot access Configurações even with a grant", () => expect(canAccess({status:"ok",role:"master",permissions:["Configurações"]}, "Configurações")).toBe(false));
  it("master can access other menus without individual grants", () => expect(canAccess({status:"ok",role:"master",permissions:[]}, "Carteira · Painel")).toBe(true));
  it("empty permissions deny common users", () => expect(canAccess({status:"ok",role:"user",permissions:[]}, "Home")).toBe(false));
  it("partial grant does not include sibling submenus", () => { const a: AxisAccess={status:"ok",role:"user",permissions:["Carteira · Consulta"]}; expect(canAccess(a,"Carteira · Consulta")).toBe(true); expect(canAccess(a,"Carteira · Painel")).toBe(false); });
  it("pending and blocked users cannot access menus", () => { for(const status of ["pending","blocked"]) expect(canAccess({status,role:"master",permissions:["Home"]},"Home")).toBe(false); });
  it("Orçamento permission allows its internal simulation but not Control simulator", () => {const a:AxisAccess={status:"ok",role:"user",permissions:["Painel Orçamento"]};expect(canAccess(a,"Simulação")).toBe(true);expect(canAccess(a,"Control · Simulador")).toBe(false);});
});