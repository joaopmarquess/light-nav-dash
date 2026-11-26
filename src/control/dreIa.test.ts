import { describe, expect, it } from "vitest";
import { consultarCuboDre, type ContaIa, type ConsultaDreIa, type CuboDreIa } from "./dreIa";
import { resumoPainelDre } from "./drePainel";

const rows = [
  { ano: 2026, mes: 1, tri: 1, g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "1|FATURAMENTO", valor: 1000 },
  { ano: 2026, mes: 1, tri: 1, g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "3|DESP. ASSISTENCIAL", valor: -600 },
  { ano: 2026, mes: 2, tri: 1, g1: "1|EBITDA", g2: "2|ADMINISTRATIVO", g3: "1|PESSOAL", g4: "", valor: -100 },
];
const cubo: CuboDreIa = { ano: 2026, meses: [1, 2], rows, fonteContabil: "icontabil" };
const q: ConsultaDreIa = { cubo: "dre", ano: null, mesDe: null, mesAte: null, grupo: "g1", texto: null, conta: null, limite: null };
describe("Cubos do chat DRE", () => {
  it("reutiliza o resultado do Painel sem somar níveis repetidos", () => {
    const r = consultarCuboDre(cubo, q);
    expect(r.resultado).toBe(resumoPainelDre(rows).liq);
    expect(r.resultado).toBe(300);
    expect(r.grupos[0].valor).toBe(300);
    expect(r.sinistralidadeOperacional).toBe(60);
  });
  it("separa os meses e informa meses sem fechamento sem inventar valores", () => {
    const r = consultarCuboDre(cubo, { ...q, mesDe: 2, mesAte: 3, grupo: "mes" });
    expect(r.resultado).toBe(-100);
    expect(r.mesesSemFechamento).toEqual([3]);
    expect(r.grupos.map((g) => g.grupo)).toEqual(["2026-02"]);
  });
  it("mantém somente contas analíticas e saldos por posição no cubo Contábil", () => {
    const conta: ContaIa = { ...rows[0], conta: "3.1.1", descricao: "Receita", tipo: "A", debito: 10, credito: 20, saldoInicial: 100, saldoFinal: 110 };
    const r = consultarCuboDre({ ...cubo, contas: [conta, { ...conta, mes: 2, valor: 2000, saldoInicial: 110, saldoFinal: 120 }, { ...conta, tipo: "S", valor: 9999 }] }, { ...q, cubo: "contabil", grupo: "conta" });
    expect(r.totais).toEqual({ realizado: 3000, debitos: 20, creditos: 40, saldoInicial: 100, saldoFinal: 120 });
    expect(r.registros).toBe(2);
  });
  it("filtra classificações sem acentos e não consulta contas pelo cubo DRE", () => {
    expect(consultarCuboDre(cubo, { ...q, texto: "assistencial" }).resultado).toBe(-600);
    expect(() => consultarCuboDre(cubo, { ...q, conta: "311" })).toThrow("cubo Contábil");
  });
  it("usa posições de cada competência nos grupos mensais contábeis", () => {
    const conta: ContaIa = { ...rows[0], conta: "3.1.1", descricao: "Receita", tipo: "A", debito: 10, credito: 20, saldoInicial: 100, saldoFinal: 110 };
    const r = consultarCuboDre({ ...cubo, contas: [conta, { ...conta, mes: 2, saldoInicial: 110, saldoFinal: 120 }] }, { ...q, cubo: "contabil", grupo: "mes" });
    expect(r.grupos).toMatchObject([{ grupo: "2026-01", saldoInicial: 100, saldoFinal: 110 }, { grupo: "2026-02", saldoInicial: 110, saldoFinal: 120 }]);
  });
});