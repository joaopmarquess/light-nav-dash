import { describe, expect, it } from "vitest";
import { FATORES_PADRAO, INDICES_PADRAO, indicadoresPadrao, rotulosPadrao } from "@/lib/uberabaTabelasComerciais";
import {
  CHAVE_TEXTOS, SECOES_TEXTO, TEXTOS_PADRAO, aprovarTextos, mesclarRascunhoIa, assinaturaDados, dadosRascunho, estadoVazio, gravarTextos, lerTextos, normalizarTextos,
  numerosForaDasTabelas, topicosComNumerosAntigos, paragrafosDe, pendencias, textosParaPdf, textosVazios,
} from "@/lib/uberabaPropostaTextos";
import { paragrafosProposta } from "@/lib/uberabaPropostaComercialPdf";

const padrao = () => dadosRascunho(INDICES_PADRAO, indicadoresPadrao(), rotulosPadrao(), FATORES_PADRAO);
const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe("dados enviados à IA", () => {
  it("leva as quatro tabelas com nome, índice, fator e preços formatados como no PDF", () => {
    const d = padrao();
    expect(d.tabelas.map((t) => t.nome)).toEqual(["ADESÃO", "PME ADMINISTRADAS", "PJ ADMINISTRADAS", "EMPRESARIAL"]);
    expect(d.tabelas.map((t) => t.indiceSobreReferencia)).toEqual(["90%", "85%", "80%", "70%"]);
    expect(d.tabelas.map((t) => t.secao)).toEqual(["Produtos com Administradora", "Produtos com Administradora", "Produtos com Administradora", "Plano Empresarial"]);
    expect(d.tabelas[3]).toMatchObject({ sigla: "PJ+", vidas: "100 OU MAIS", boletagem: "OPERADORA", distribuidores: "AGENCIADORAS E CORRETORAS AUTORIZADAS" });
    expect(d.tabelas[0].indiceSobreReferencia).toBe("90%");
    expect(d.tabelas[0].fatorApartamento).toBe("1,25");
    expect(d.tabelas[0].faixas[0]).toEqual({ faixa: "00 a 18", enfermaria: "197,75", apartamento: "247,18" });
  });
  it("a assinatura muda quando o fator de uma tabela muda", () => {
    const outro = dadosRascunho(INDICES_PADRAO, indicadoresPadrao(), rotulosPadrao(), { ...FATORES_PADRAO, pcaAdm: 1.3 });
    expect(assinaturaDados(outro)).not.toBe(assinaturaDados(padrao()));
    expect(assinaturaDados(padrao())).toBe(assinaturaDados(padrao()));
  });
});

describe("conferência de números do rascunho", () => {
  it("aceita números que estão nas tabelas", () => {
    expect(numerosForaDasTabelas("A PME ADM. (03 a 29 vidas), a PCE ADM. (30 a 99 vidas) e o PJ+ (100 ou mais vidas) usam a Referência.", padrao())).toEqual([]);
    expect(numerosForaDasTabelas("PCA Adm. com índice de 90%, fator 1,25, Spread de 23% e faixa 00 a 18 por 197,75.", padrao())).toEqual([]);
  });
  it("aponta números inventados", () => {
    expect(numerosForaDasTabelas("Carência de 45 dias e reajuste de 12,5%.", padrao())).toEqual(["45", "12,5"]);
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
    // Versões resumidas a pedido do Dênis para os tópicos 1 e 2 caberem na página 1.
    expect(p[0][0]).toMatch(/^É com satisfação que apresentamos esta proposta comercial de quatro produtos em Uberaba \(MG\),/);
    expect(p[0][0]).toMatch(/estão nas seções 3 e 4\.$/);
    expect(p[1][0]).toMatch(/^Matriz referencial de preços para Uberaba, no padrão atuarial do Bensaúde e calibrada para o mercado local,/);
    expect(p.every((t) => t.length > 0)).toBe(true);
    expect(p.flat().join(" ")).not.toMatch(/Lorem/);
  });
  it("tópicos 3 e 4 são uma linha simples", () => {
    expect(TEXTOS_PADRAO.administradora.split("\n")).toHaveLength(1);
    expect(TEXTOS_PADRAO.empresarial.split("\n")).toHaveLength(1);
  });
  it("textos padrão não trazem números fora das tabelas", () => {
    expect(numerosForaDasTabelas(Object.values(TEXTOS_PADRAO).join(" "), padrao())).toEqual([]);
  });
  it("a IA só troca os tópicos 3 a 5; Introdução e Tabela Referencial ficam como estão", () => {
    const m = mesclarRascunhoIa(TEXTOS_PADRAO, { introducao: "Outra.", referencia: "Outra.", administradora: "A.", empresarial: "E.", conclusao: "C." });
    expect(m).toEqual({ ...TEXTOS_PADRAO, administradora: "A.", empresarial: "E.", conclusao: "C." });
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
  it("segue a ordem Introdução, Tabela Referencial, Produtos com Administradora, Plano Empresarial e Conclusão", () => {
    expect(SECOES_TEXTO.map((s) => s.titulo)).toEqual(["1. Introdução", "2. Tabela Referencial", "3. Produtos com Administradora", "4. Plano Empresarial", "5. Conclusão"]);
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
    s.setItem("uberaba-proposta-textos-v3", JSON.stringify({ aprovado: { tabelas: "Antigo." } }));
    expect(lerTextos(s)).toEqual(estadoVazio());
    expect(CHAVE_TEXTOS).toBe("uberaba-proposta-textos-v4");
  });
});

import { INTRODUCAO_ANTERIOR, TEXTOS_PADRAO as PADRAO_INTRO } from "./uberabaPropostaTextos";

describe("Introdução · lista dos produtos no quadro", () => {
  it("o texto padrão não lista mais os produtos e remete ao quadro", () => {
    expect(PADRAO_INTRO.introducao).not.toContain("sendo eles");
    expect(PADRAO_INTRO.introducao).toContain("quadro abaixo");
  });
  it("texto guardado com a Introdução anterior passa para a atual", async () => {
    const { lerTextos, CHAVE_TEXTOS } = await import("./uberabaPropostaTextos");
    const aprovado = { ...PADRAO_INTRO, introducao: INTRODUCAO_ANTERIOR };
    const storage = { getItem: (k: string) => (k === CHAVE_TEXTOS ? JSON.stringify({ aprovado }) : null) };
    expect(lerTextos(storage).aprovado?.introducao).toBe(PADRAO_INTRO.introducao);
  });
});

import { INTRODUCAO_SEM_ATRIBUICAO } from "./uberabaPropostaTextos";

describe("Introdução · spread atribuído à Administradora", () => {
  it("mantém spread, comissionamento e vitaliciedade, explicando a quem cada um atribui valores", () => {
    expect(PADRAO_INTRO.introducao).toContain("spread (valores atribuídos à Administradora)");
    expect(PADRAO_INTRO.introducao).toContain("comissionamento (agenciamento)");
    expect(PADRAO_INTRO.introducao).toContain("vitaliciedade (valores atribuídos à Agenciadora, no Plano Empresarial)");
  });
  it("texto guardado sem a explicação passa para a versão atual", async () => {
    const { lerTextos, CHAVE_TEXTOS } = await import("./uberabaPropostaTextos");
    const aprovado = { ...PADRAO_INTRO, introducao: INTRODUCAO_SEM_ATRIBUICAO };
    const storage = { getItem: (k: string) => (k === CHAVE_TEXTOS ? JSON.stringify({ aprovado }) : null) };
    expect(lerTextos(storage).aprovado?.introducao).toBe(PADRAO_INTRO.introducao);
  });
});

import { INTRODUCAO_LONGA, REFERENCIA_LONGA } from "./uberabaPropostaTextos";

describe("Introdução e Tabela Referencial resumidas", () => {
  it("textos guardados nas versões longas passam para as resumidas", async () => {
    const { lerTextos, CHAVE_TEXTOS } = await import("./uberabaPropostaTextos");
    const aprovado = { ...PADRAO_INTRO, introducao: INTRODUCAO_LONGA, referencia: REFERENCIA_LONGA };
    const storage = { getItem: (k: string) => (k === CHAVE_TEXTOS ? JSON.stringify({ aprovado }) : null) };
    expect(lerTextos(storage).aprovado?.introducao).toBe(PADRAO_INTRO.introducao);
    expect(lerTextos(storage).aprovado?.referencia).toBe(PADRAO_INTRO.referencia);
  });
});

import { CONCLUSAO_SO_CORRETORAS, EMPRESARIAL_SO_CORRETORAS } from "./uberabaPropostaTextos";

describe("PJ+ distribuído por Agenciadoras e Corretoras Autorizadas", () => {
  it("textos padrão dos tópicos 4 e 5 citam Agenciadoras e Corretoras Autorizadas", () => {
    expect(PADRAO_INTRO.empresarial).toContain("distribuição por meio de Agenciadoras e Corretoras Autorizadas");
    expect(PADRAO_INTRO.conclusao).toContain("das Agenciadoras e Corretoras Autorizadas");
  });
  it("textos guardados com a versão antiga (só Corretoras) passam para a atual", async () => {
    const { lerTextos, CHAVE_TEXTOS } = await import("./uberabaPropostaTextos");
    const aprovado = { ...PADRAO_INTRO, empresarial: EMPRESARIAL_SO_CORRETORAS, conclusao: CONCLUSAO_SO_CORRETORAS };
    const storage = { getItem: (k: string) => (k === CHAVE_TEXTOS ? JSON.stringify({ aprovado }) : null) };
    expect(lerTextos(storage).aprovado?.empresarial).toBe(PADRAO_INTRO.empresarial);
    expect(lerTextos(storage).aprovado?.conclusao).toBe(PADRAO_INTRO.conclusao);
  });
});

describe("textos aprovados com números antigos", () => {
  it("aponta o tópico aprovado que cita um percentual alterado depois", () => {
    const aprovado = aprovarTextos(estadoVazio(), { ...TEXTOS_PADRAO, administradora: "Participação da Administradora de 23%." });
    expect(topicosComNumerosAntigos(aprovado, padrao())).toEqual([]);
    const ind = indicadoresPadrao();
    (["pcaAdm", "pmeAdm", "pceAdm"] as const).forEach((id) => { ind[id].spread = 30; });
    const atual = dadosRascunho(INDICES_PADRAO, ind, rotulosPadrao(), FATORES_PADRAO);
    expect(topicosComNumerosAntigos(aprovado, atual)).toEqual([SECOES_TEXTO[2].titulo]);
  });
  it("aponta preço antigo e ignora faixas e vidas", () => {
    const aprovado = aprovarTextos(estadoVazio(), { ...TEXTOS_PADRAO, empresarial: "Faixa 00 a 18 por 122,50, para 100 ou mais vidas." });
    expect(topicosComNumerosAntigos(aprovado, padrao())).toEqual([SECOES_TEXTO[3].titulo]);
    const atual = aprovarTextos(estadoVazio(), { ...TEXTOS_PADRAO, empresarial: "Faixa 00 a 18 por 131,25, para 100 ou mais vidas." });
    expect(topicosComNumerosAntigos(atual, padrao())).toEqual([]);
  });
  it("não avisa sem texto aprovado", () => {
    expect(topicosComNumerosAntigos(estadoVazio(), padrao())).toEqual([]);
  });
});
