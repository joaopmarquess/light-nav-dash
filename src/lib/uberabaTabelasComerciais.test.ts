import { describe, expect, it } from "vitest";
import { INDICES_PADRAO, formatarCentavos, lerIndices, parseIndice, tabelaIndexada, tabelaReferencia } from "./uberabaTabelasComerciais";

const enf = (pct: number) => tabelaIndexada(pct).map((l) => formatarCentavos(l.enfermariaCentavos));

describe("tabelas comerciais Uberaba", () => {
  it("usa os fatores de referência 0,90 / 0,85 / 0,80 / 0,70 como índices padrão", () => {
    expect(INDICES_PADRAO).toEqual({ pcaAdm: 90, pmeAdm: 85, pceAdm: 80, pce100: 70 });
  });

  it("PME ADM. a 85% indexa a Referência", () => {
    expect(enf(85)[0]).toBe("148,75");
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
    expect(lerIndices({ getItem: () => JSON.stringify({ pce100: 75 }) })).toEqual({ pcaAdm: 90, pmeAdm: 85, pceAdm: 80, pce100: 75 });
  });
});

import { INDICADORES_PADRAO, MODELO_INDICADORES, blocosIndicadores, derivarIndicadores, derivarVitalicio, lerIndicadores, parseIndicador } from "./uberabaTabelasComerciais";

describe("indicadores variáveis Uberaba", () => {
  it("padrão da planilha em PCA Adm. e PCE Adm.", () => {
    expect(INDICADORES_PADRAO).toEqual({ spread: 23, contratual: 90, promocional: 150, adesao: 99 });
    const t = lerIndicadores({ getItem: () => null });
    expect(t.pcaAdm).toEqual(INDICADORES_PADRAO);
    expect(t.pmeAdm).toEqual({ ...INDICADORES_PADRAO, adesao: 50 });
    expect(t.pceAdm).toEqual({ ...INDICADORES_PADRAO, adesao: 50 });
    expect(MODELO_INDICADORES.pmeAdm).toBe("administradora");
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

  it("Operadora = 100 − Spread, sem Administradora nem Agenciadora", () => {
    expect(derivarIndicadores(INDICADORES_PADRAO)).toEqual({ operadora: 77 });
    expect(derivarIndicadores({ ...INDICADORES_PADRAO, spread: 30 })).toEqual({ operadora: 70 });
    expect(blocosIndicadores("pmeAdm", INDICADORES_PADRAO)[0].linhas.map((l) => l.rotulo)).toEqual(["Spread", "Operadora"]);
  });

  it("Taxa de adesão das Administradas volta a 50% mesmo com valor antigo gravado", () => {
    const antigo = JSON.stringify({ pcaAdm: { adesao: 99, spread: 25 }, pmeAdm: { adesao: 99, spread: 20 }, pceAdm: { adesao: 99 } });
    const t = lerIndicadores({ getItem: (k: string) => (k.endsWith("-v2") ? antigo : null) });
    expect([t.pcaAdm.adesao, t.pmeAdm.adesao, t.pceAdm.adesao]).toEqual([99, 50, 50]);
    expect([t.pcaAdm.spread, t.pmeAdm.spread]).toEqual([25, 20]);
  });

  it("guarda cada frente separadamente", () => {
    const t = lerIndicadores({ getItem: () => JSON.stringify({ pceAdm: { spread: 4 } }) });
    expect(t.pceAdm.spread).toBe(4);
    expect(t.pcaAdm.spread).toBe(23);
  });

  it("rejeita valores fora do limite", () => {
    expect(parseIndicador("spread", "101")).toBeNull();
    expect(parseIndicador("promocional", "150")).toBe(150);
    expect(parseIndicador("adesao", "4,5")).toBe(4.5);
  });
});

import { gravarRotulos, lerRotulos, normalizarRotulo, rotulosPadrao } from "./uberabaTabelasComerciais";

describe("nomes das tabelas (redigitáveis)", () => {
  it("defaults are the current table names and segments", () => {
    const r = rotulosPadrao();
    expect(r.pcaAdm).toEqual({ titulo: "ADESÃO", segmento: "PLANO COLETIVO POR ADESÃO" });
    expect(r.pmeAdm).toEqual({ titulo: "PME ADMINISTRADAS", segmento: "PLANO COLETIVO EMPRESARIAL" });
    expect(r.pceAdm).toEqual({ titulo: "PJ ADMINISTRADAS", segmento: "PLANO COLETIVO EMPRESARIAL" });
    expect(r.pce100).toEqual({ titulo: "EMPRESARIAL", segmento: "PLANO COLETIVO EMPRESARIAL" });
  });
  it("names saved before the rename do not hide the new labels", () => {
    const mem = new Map<string, string>([
      ["uberaba-tabelas-comerciais-rotulos-v1", JSON.stringify({ pcaAdm: { titulo: "PCA Adm.", segmento: "ADESÃO" } })],
      ["uberaba-tabelas-comerciais-rotulos-padrao-v1", JSON.stringify({ pce100: { titulo: "PJ 100+", segmento: "GRANDES EMPRESAS" } })],
      ["uberaba-tabelas-comerciais-rotulos-v2", JSON.stringify({ pcaAdm: { titulo: "Plano Coletivo por Adesão", segmento: "ADESÃO" } })],
    ]);
    const st = { getItem: (k: string) => mem.get(k) ?? null };
    expect(lerRotulos(st).pcaAdm.titulo).toBe("ADESÃO");
    expect(lerRotulos(st).pce100.titulo).toBe("EMPRESARIAL");
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
    expect(lido.pce100).toEqual({ titulo: "PJ 100+", segmento: "PLANO COLETIVO EMPRESARIAL" });
    expect(lido.pcaAdm.titulo).toBe("ADESÃO");
  });
});

import { gravarPadraoRotulos, lerPadraoRotulos } from "./uberabaTabelasComerciais";

describe("novo padrão para o nome das tabelas", () => {
  const novoStorage = () => {
    const mem = new Map<string, string>();
    return { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  };
  it("saved default replaces the original name and is what an empty field restores", () => {
    const st = novoStorage();
    const p = lerPadraoRotulos(st);
    p.pce100.titulo = "PJ 100+";
    gravarPadraoRotulos(p, st);
    expect(lerPadraoRotulos(st).pce100.titulo).toBe("PJ 100+");
    expect(lerRotulos(st).pce100.titulo).toBe("PJ 100+");
    expect(normalizarRotulo("", lerPadraoRotulos(st).pce100.titulo)).toBe("PJ 100+");
    expect(lerPadraoRotulos(st).pcaAdm.titulo).toBe("ADESÃO");
  });
});

import { apartamentoDe, lerFatores, gravarFatores, parseFator, FATORES_PADRAO } from "./uberabaTabelasComerciais";

describe("fator Apartamento x Enfermaria", () => {
  it("defaults to 1,25 on all four tables", () => {
    expect(FATORES_PADRAO).toEqual({ pcaAdm: 1.25, pmeAdm: 1.25, pceAdm: 1.25, pce100: 1.25 });
    expect(tabelaIndexada(90)[0].apartamentoCentavos).toBe(19687); // TRUNC(157,50 × 1,25; 2) = 196,87
  });
  it("Apartamento = TRUNC(Enfermaria × fator; 2)", () => {
    expect(apartamentoDe(15750, 1.3)).toBe(20475);   // 157,50 × 1,3 = 204,75
    expect(apartamentoDe(18380, 1.33)).toBe(24445);  // 183,80 × 1,33 = 244,454 → 244,45
    expect(tabelaIndexada(90, 1.4)[0]).toEqual({ faixa: "00 a 18", enfermariaCentavos: 15750, apartamentoCentavos: 22050 });
  });
  it("accepts comma or dot, rejects out of range", () => {
    expect(parseFator("1,3")).toBe(1.3);
    expect(parseFator("1.25")).toBe(1.25);
    expect(parseFator("0,9")).toBeNull();
    expect(parseFator("abc")).toBeNull();
  });
  it("stores one factor per table", () => {
    const mem = new Map<string, string>();
    const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    gravarFatores({ ...FATORES_PADRAO, pce100: 1.3 }, st);
    expect(lerFatores(st)).toEqual({ pcaAdm: 1.25, pmeAdm: 1.25, pceAdm: 1.25, pce100: 1.3 });
  });
});

import { GRUPOS_FRENTES, PARAMETROS_UBERABA, parametrosDe, vidasTexto } from "./uberabaTabelasComerciais";

describe("parâmetros das tabelas (13/11/2026)", () => {
  it("four tables in the order PCA, PME ADM., PCE ADM., PJ+", () => {
    expect(PARAMETROS_UBERABA.map((p) => p.sigla)).toEqual(["PCA", "PME ADM.", "PCE ADM.", "PJ+"]);
    expect(PARAMETROS_UBERABA.map((p) => p.fatorReferencia)).toEqual([0.9, 0.85, 0.8, 0.7]);
  });
  it("lives, billing and distributors as supplied", () => {
    expect(PARAMETROS_UBERABA.map((p) => p.vidas)).toEqual(["-", "03 A 29", "30 A 99", "100 OU MAIS"]);
    expect(PARAMETROS_UBERABA.map((p) => p.boletagem)).toEqual(["ADMINISTRADORA", "ADMINISTRADORA", "ADMINISTRADORA", "OPERADORA"]);
    expect(parametrosDe("pce100").distribuidores).toBe("CORRETORAS");
    expect(parametrosDe("pmeAdm").distribuidores).toBe("PLATAFORMAS ASSOCIADAS");
    expect(vidasTexto(parametrosDe("pcaAdm"))).toBeNull();
    expect(vidasTexto(parametrosDe("pmeAdm"))).toBe("03 a 29 vidas");
  });
  it("Proposal sections: Administradora products and the Empresarial", () => {
    expect(GRUPOS_FRENTES.map((g) => g.frentes)).toEqual([["pcaAdm", "pmeAdm", "pceAdm"], ["pce100"]]);
  });
});
