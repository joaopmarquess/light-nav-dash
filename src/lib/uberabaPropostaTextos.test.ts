import { describe, expect, it } from "vitest";
import { FATORES_PADRAO, INDICES_PADRAO, indicadoresPadrao, rotulosPadrao } from "@/lib/uberabaTabelasComerciais";
import {
  CHAVE_TEXTOS, SECOES_TEXTO, TEXTOS_PADRAO, aprovarTextos, mesclarRascunhoIa, assinaturaDados, dadosRascunho, estadoVazio, gravarTextos, lerTextos, normalizarTextos,
  numerosForaDasTabelas, paragrafosDe, pendencias, textosParaPdf, textosVazios,
} from "@/lib/uberabaPropostaTextos";
import { paragrafosProposta } from "@/lib/uberabaPropostaComercialPdf";

const padrao = () => dadosRascunho(INDICES_PADRAO, indicadoresPadrao(), rotulosPadrao(), FATORES_PADRAO);
const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe("dados enviados à IA", () => {
  it("leva as três tabelas com nome, índice, fator e preços formatados como no PDF", () => {
    const d = padrao();
    expect(d.tabelas.map((t) => t.nome)).toEqual(["Plano Coletivo por Adesão", "PME Administrada (02 a 99 vidas)", "Plano Empresarial 100+"]);
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
    expect(numerosForaDasTabelas("A PME Administrada (02 a 99 vidas) usa a Referência.", padrao())).toEqual([]);
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
  it("sem aprovação o PDF usa o texto padrão, com a Introdução e a Tabela Referencial do Dênis", () => {
    const e = { ...estadoVazio(), rascunho: { ...textosVazios(), introducao: "Rascunho." } };
    expect(textosParaPdf(e)).toBeNull();
    const p = paragrafosProposta(null);
    expect(p[0][0]).toMatch(/^É com satisfação que apresentamos a presente proposta comercial para a comercialização de nossos produtos em Uberaba \(Minas Gerais\)\./);
    expect(p[0][0]).toMatch(/seção "Condições Comerciais" ao longo deste documento\.$/);
    expect(p[1][0]).toMatch(/^Matriz referencial de preços para Uberaba, no padrão atuarial do Bensaúde,/);
    expect(p.every((t) => t.length > 0)).toBe(true);
    expect(p.flat().join(" ")).not.toMatch(/Lorem/);
  });
  it("tópicos 3 e 4 são uma linha simples", () => {
    expect(TEXTOS_PADRAO.tabelas.split("\n")).toHaveLength(1);
    expect(TEXTOS_PADRAO.remuneracao.split("\n")).toHaveLength(1);
  });
  it("a IA só troca os tópicos 3 a 5; Introdução e Tabela Referencial ficam como estão", () => {
    const m = mesclarRascunhoIa(TEXTOS_PADRAO, { introducao: "Outra.", referencia: "Outra.", tabelas: "T.", remuneracao: "R.", conclusao: "C." });
    expect(m).toEqual({ ...TEXTOS_PADRAO, tabelas: "T.", remuneracao: "R.", conclusao: "C." });
  });
  it("depois de incluir, o PDF usa exatamente o texto revisado, um parágrafo por linha", () => {
    const revisado = { ...textosVazios(), introducao: "Primeiro parágrafo.\n\nSegundo\nparágrafo." };
    const e = aprovarTextos({ ...estadoVazio(), assinaturaRascunho: "abc" }, revisado, new Date("2026-11-12T16:00:00Z"));
    expect(e.assinaturaAprovado).toBe("abc");
    expect(paragrafosProposta(textosParaPdf(e))[0]).toEqual(["Primeiro parágrafo.", "Segundo", "parágrafo."]);
    expect(paragrafosProposta(textosParaPdf(e))[4]).toEqual([]);
  });
  it("guarda e lê o estado neste navegador", () => {
    const s = memoria();
    const e = aprovarTextos(estadoVazio(), { ...textosVazios(), conclusao: "  Fim [A definir: hospitais]  " });
    gravarTextos(e, s);
    expect(lerTextos(s).aprovado?.conclusao).toBe("Fim [A definir: hospitais]");
    s.setItem(CHAVE_TEXTOS, "{quebrado");
    expect(lerTextos(s)).toEqual(estadoVazio());
  });
  it("normaliza linhas em branco extras", () => {
    expect(normalizarTextos({ introducao: "A\n\n\n\nB" }).introducao).toBe("A\n\nB");
    expect(paragrafosDe("A\n\nB")).toEqual(["A", "B"]);
  });
});

describe("tópicos da Proposta", () => {
  it("segue a ordem Introdução, Tabela Referencial, Tabelas, Proposta de Remuneração e Conclusão", () => {
    expect(SECOES_TEXTO.map((s) => s.titulo)).toEqual(["1. Introdução", "2. Tabela Referencial", "3. Tabelas", "4. Proposta de Remuneração", "5. Conclusão"]);
  });
  it("a IA recebe a Tabela Referencial a 100% com o fator padrão", () => {
    const r = padrao().referencia;
    expect(r.fatorApartamento).toBe("1,25");
    expect(r.faixas[0]).toEqual({ faixa: "00 a 18", enfermaria: "175,00", apartamento: "218,75" });
  });
  it("rascunhos da versão anterior (com Descrição da Proposta) não voltam", () => {
    const s = memoria();
    s.setItem("uberaba-proposta-textos-v2", JSON.stringify({ aprovado: { descricao: "Antigo." } }));
    expect(lerTextos(s)).toEqual(estadoVazio());
    expect(CHAVE_TEXTOS).toBe("uberaba-proposta-textos-v3");
  });
});
