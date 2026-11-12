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

import { INDICADORES_PADRAO, MODELO_INDICADORES, derivarIndicadores, derivarVitalicio, lerIndicadores, parseIndicador } from "./uberabaTabelasComerciais";

describe("indicadores variáveis Uberaba", () => {
  it("padrão da planilha em PCA Adm. e PCE Adm.", () => {
    expect(INDICADORES_PADRAO).toEqual({ spread: 23, coAdministradora: 4, contratual: 90, promocional: 150, adesao: 99 });
    const t = lerIndicadores({ getItem: () => null });
    expect(t.pcaAdm).toEqual(INDICADORES_PADRAO);
    expect(t.pceAdm).toEqual(INDICADORES_PADRAO);
  });

  it("PCE 100+ usa Vitalício 5%, Contratual 90% e Promocional 100%", () => {
    expect(MODELO_INDICADORES.pce100).toBe("vitalicio");
    const t = lerIndicadores({ getItem: () => null }).pce100;
    expect([t.spread, t.contratual, t.promocional]).toEqual([5, 90, 100]);
  });

  it("PCE 100+: Operadora = 100 − Vitalício e Agenciadora = Vitalício", () => {
    expect(derivarVitalicio({ ...INDICADORES_PADRAO, spread: 5 })).toEqual({ operadora: 95, agenciadora: 5 });
    expect(derivarVitalicio({ ...INDICADORES_PADRAO, spread: 8 })).toEqual({ operadora: 92, agenciadora: 8 });
  });

  it("valores antigos de PCE 100+ não substituem o novo padrão", () => {
    const antigo = JSON.stringify({ pcaAdm: { spread: 30 }, pce100: { spread: 23, promocional: 150 } });
    const t = lerIndicadores({ getItem: (k: string) => (k.endsWith("-v1") ? antigo : null) });
    expect(t.pcaAdm.spread).toBe(30);
    expect([t.pce100.spread, t.pce100.promocional]).toEqual([5, 100]);
  });

  it("Operadora = 100 − Spread e Administradora = Spread − Agenciadora", () => {
    expect(derivarIndicadores(INDICADORES_PADRAO)).toEqual({ operadora: 77, administradora: 19 });
    expect(derivarIndicadores({ ...INDICADORES_PADRAO, spread: 5, coAdministradora: 5 })).toEqual({ operadora: 95, administradora: 0 });
  });

  it("guarda cada frente separadamente", () => {
    const t = lerIndicadores({ getItem: () => JSON.stringify({ pceAdm: { spread: 4 } }) });
    expect(t.pceAdm.spread).toBe(4);
    expect(t.pcaAdm.spread).toBe(23);
  });

  it("rejeita valores fora do limite", () => {
    expect(parseIndicador("spread", "101")).toBeNull();
    expect(parseIndicador("promocional", "150")).toBe(150);
    expect(parseIndicador("coAdministradora", "4,5")).toBe(4.5);
  });
});

import { gravarRotulos, lerRotulos, normalizarRotulo, rotulosPadrao } from "./uberabaTabelasComerciais";

describe("nomes das tabelas (redigitáveis)", () => {
  it("defaults are the current table names and segments", () => {
    const r = rotulosPadrao();
    expect(r.pcaAdm).toEqual({ titulo: "PCA Adm.", segmento: "ADESÃO" });
    expect(r.pceAdm).toEqual({ titulo: "PCE Adm.", segmento: "MÉDIAS EMPRESAS" });
    expect(r.pce100).toEqual({ titulo: "PCE 100+", segmento: "GRANDES EMPRESAS" });
  });
  it("keeps one line and falls back to the default when empty", () => {
    expect(normalizarRotulo("  PCA\n  Novo  ", "PCA Adm.")).toBe("PCA Novo");
    expect(normalizarRotulo("   ", "PCA Adm.")).toBe("PCA Adm.");
  });
  it("stores names per table", () => {
    const mem = new Map<string, string>();
    const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const r = rotulosPadrao();
    r.pce100.titulo = "PJ 100+";
    gravarRotulos(r, st);
    const lido = lerRotulos(st);
    expect(lido.pce100).toEqual({ titulo: "PJ 100+", segmento: "GRANDES EMPRESAS" });
    expect(lido.pcaAdm.titulo).toBe("PCA Adm.");
  });
});
