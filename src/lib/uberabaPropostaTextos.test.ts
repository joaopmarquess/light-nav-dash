import { describe, expect, it } from "vitest";
import { FATORES_PADRAO, INDICES_PADRAO, indicadoresPadrao, rotulosPadrao } from "@/lib/uberabaTabelasComerciais";
import {
  CHAVE_TEXTOS, aprovarTextos, assinaturaDados, dadosRascunho, estadoVazio, gravarTextos, lerTextos, normalizarTextos,
  numerosForaDasTabelas, paragrafosDe, pendencias, textosParaPdf, textosVazios,
} from "@/lib/uberabaPropostaTextos";
import { paragrafosProposta } from "@/lib/uberabaPropostaComercialPdf";

const padrao = () => dadosRascunho(INDICES_PADRAO, indicadoresPadrao(), rotulosPadrao(), FATORES_PADRAO);
const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe("dados enviados à IA", () => {
  it("leva as três tabelas com nome, índice, fator e preços formatados como no PDF", () => {
    const d = padrao();
    expect(d.tabelas.map((t) => t.nome)).toEqual(["PCA Adm.", "PCE Adm.", "PCE 100+"]);
    expect(d.tabelas[0].indiceSobreReferencia).toBe("90%");
    expect(d.tabelas[0].fatorApartamento).toBe("1,25");
    expect(d.tabelas[0].faixas[0]).toEqual({ faixa: "00 a 18", enfermaria: "157,50", apartamento: "196,87" });
  });
  it("a assinatura muda quando o fator de uma tabela muda", () => {
    const outro = dadosRascunho(INDICES_PADRAO, indicadoresPadrao(), rotulosPadrao(), { ...FATORES_PADRAO, pcaAdm: 1.3 });
    expect(assinaturaDados(outro)).not.toBe(assinaturaDados(padrao()));
    expect(assinaturaDados(padrao())).toBe(assinaturaDados(padrao()));
  });
});

describe("conferência de números do rascunho", () => {
  it("aceita números que estão nas tabelas", () => {
    expect(numerosForaDasTabelas("PCA Adm. com índice de 90%, fator 1,25, Spread de 23% e faixa 00 a 18 por 157,50.", padrao())).toEqual([]);
  });
  it("aponta números inventados", () => {
    expect(numerosForaDasTabelas("Carência de 30 dias e reajuste de 12,5%.", padrao())).toEqual(["30", "12,5"]);
  });
  it("conta os marcadores [A definir]", () => {
    expect(pendencias("Vigência [A definir: data] e validade [A definir: prazo].")).toHaveLength(2);
  });
});

describe("revisão antes do PDF", () => {
  it("sem aprovação o PDF continua com o texto provisório", () => {
    const e = { ...estadoVazio(), rascunho: { ...textosVazios(), objeto: "Rascunho." } };
    expect(textosParaPdf(e)).toBeNull();
    expect(paragrafosProposta(null)[0][0]).toMatch(/^Lorem ipsum/);
  });
  it("depois de incluir, o PDF usa exatamente o texto revisado, em parágrafos", () => {
    const revisado = { ...textosVazios(), objeto: "Primeiro parágrafo.\n\nSegundo\nparágrafo." };
    const e = aprovarTextos({ ...estadoVazio(), assinaturaRascunho: "abc" }, revisado, new Date("2026-11-12T16:00:00Z"));
    expect(e.assinaturaAprovado).toBe("abc");
    expect(paragrafosProposta(textosParaPdf(e))[0]).toEqual(["Primeiro parágrafo.", "Segundo parágrafo."]);
    expect(paragrafosProposta(textosParaPdf(e))[4]).toEqual([]);
  });
  it("guarda e lê o estado neste navegador", () => {
    const s = memoria();
    const e = aprovarTextos(estadoVazio(), { ...textosVazios(), rede: "  Rede [A definir: hospitais]  " });
    gravarTextos(e, s);
    expect(lerTextos(s).aprovado?.rede).toBe("Rede [A definir: hospitais]");
    s.setItem(CHAVE_TEXTOS, "{quebrado");
    expect(lerTextos(s)).toEqual(estadoVazio());
  });
  it("normaliza linhas em branco extras", () => {
    expect(normalizarTextos({ objeto: "A\n\n\n\nB" }).objeto).toBe("A\n\nB");
    expect(paragrafosDe("A\n\nB")).toEqual(["A", "B"]);
  });
});
