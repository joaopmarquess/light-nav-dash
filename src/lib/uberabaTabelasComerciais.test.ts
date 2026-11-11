import { describe, expect, it } from "vitest";
import { INDICES_PADRAO, formatarCentavos, lerIndices, parseIndice, tabelaIndexada, tabelaReferencia } from "./uberabaTabelasComerciais";

const enf = (pct: number) => tabelaIndexada(pct).map((l) => formatarCentavos(l.enfermariaCentavos));

describe("tabelas comerciais Uberaba", () => {
  it("usa índices padrão 90%, 80% e 70%", () => {
    expect(INDICES_PADRAO).toEqual({ pcaAdm: 90, pceAdm: 80, pce100: 70 });
  });

  it("Referência mantém Enfermaria e Apartamento = TRUNCAR(Enf × 1,25; 2)", () => {
    const ref = tabelaReferencia();
    expect(formatarCentavos(ref[0].apartamentoCentavos)).toBe("218,75");
    expect(formatarCentavos(ref[1].apartamentoCentavos)).toBe("255,27");
    expect(formatarCentavos(ref[9].apartamentoCentavos)).toBe("1.312,12");
  });

  it("PCA Adm. a 90% reproduz a Enfermaria anterior", () => {
    expect(enf(90)).toEqual(["157,50", "183,80", "214,49", "236,36", "275,81", "315,24", "386,16", "481,54", "638,99", "944,73"]);
  });

  it("PCE Adm. a 80% reproduz a Enfermaria anterior", () => {
    expect(enf(80)).toEqual(["140,00", "163,38", "190,66", "210,10", "245,17", "280,22", "343,26", "428,03", "567,99", "839,76"]);
  });

  it("PCE 100+ a 70% indexa a Referência", () => {
    const t = tabelaIndexada(70);
    expect(formatarCentavos(t[0].enfermariaCentavos)).toBe("122,50");
    expect(formatarCentavos(t[0].apartamentoCentavos)).toBe("153,12");
    expect(formatarCentavos(t[9].enfermariaCentavos)).toBe("734,79");
  });

  it("aceita índice com vírgula e rejeita fora de 0–200", () => {
    expect(parseIndice("87,5")).toBe(87.5);
    expect(parseIndice("250")).toBeNull();
    expect(parseIndice("")).toBeNull();
  });

  it("volta aos padrões quando não há índices gravados", () => {
    expect(lerIndices({ getItem: () => null })).toEqual(INDICES_PADRAO);
    expect(lerIndices({ getItem: () => JSON.stringify({ pce100: 75 }) })).toEqual({ pcaAdm: 90, pceAdm: 80, pce100: 75 });
  });
});
