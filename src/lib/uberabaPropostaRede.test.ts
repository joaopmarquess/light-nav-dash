import { describe, expect, it } from "vitest";
import { PARAMETROS_REDE_PADRAO } from "./uberabaParametrosRede";
import {
  CONDICOES_GERAIS_REDE, TEXTOS_REDE_PADRAO, aprovarTextosRede, dadosRascunhoRede, estadoRedeVazio, linhasCondicoesRede, linhasParametrosRede, mesInicioRede, mesclarRascunhoRede,
  linhasResultadoRede, numerosForaDosDadosRede, regraMensalidadeRede, textosRedeParaPdf, topicosRedeDesatualizados,
} from "./uberabaPropostaRede";
import { TOPICOS_PROPOSTA_REDE, buildPropostaRedePdf } from "./uberabaPropostaRedePdf";
import { linhasQuantidadeCredenciamentos } from "./uberabaQuantidadeCredenciamentos";
import { resultadoRede, vidasSimulacaoPadrao } from "./uberabaResultadoRede";
import { moedaCredenciamento } from "./uberabaCredenciamento";

const semNbsp = (s: string) => s.replace(/\u00a0/g, " ");

describe("Proposta de Credenciamento e Gestão de Rede", () => {
  it("has the topics Introdução, Condições de Credenciamento, Gestão de Rede and Condições Gerais", () => {
    expect(TOPICOS_PROPOSTA_REDE).toEqual(["1. Introdução", "2. Condições de Credenciamento", "3. Gestão de Rede", "4. Condições Gerais"]);
  });
  it("sets the contract term to 2027 and hands network management and loss ratio to the Bensaúde from 2028", () => {
    expect(CONDICOES_GERAIS_REDE).toEqual([
      { item: "Prazo do Contrato", valor: "Ano de 2027" },
      { item: "A partir de 2028", valor: "A gestão de rede e a Sinistralidade estarão a cargo do Bensaúde" },
    ]);
    expect(numerosForaDosDadosRede("Contrato em 2027; a partir de 2028 o Bensaúde assume.", dadosRascunhoRede(PARAMETROS_REDE_PADRAO))).toEqual([]);
  });
  it("builds the quantities table from the Credenciamento section (Qtde., Valor, Adesão and TOTAL)", () => {
    const q = linhasQuantidadeCredenciamentos();
    const l = linhasCondicoesRede(q).map((r) => r.map(semNbsp));
    expect(l.map((r) => r[0])).toEqual([...q.linhas.map((x) => x.tipo), "TOTAL"]);
    expect(l[0]).toEqual(["Especialidades médicas", "200", "R$ 200,00", "R$ 40.000,00"]);
    expect(l[1]).toEqual(["Hospitais", "2", "R$ 200,00", "R$ 400,00"]);
    expect(l[l.length - 1][3]).toBe(semNbsp(moedaCredenciamento(q.total.adesao)));
    const editado = linhasCondicoesRede(linhasQuantidadeCredenciamentos({ medicos: 10 }, { medicos: 300 })).map((r) => r.map(semNbsp));
    expect(editado[0]).toEqual(["Especialidades médicas", "10", "R$ 300,00", "R$ 3.000,00"]);
  });
  it("adds the Resultado table with estimated lives only in the per-life months", () => {
    const q = linhasQuantidadeCredenciamentos();
    const vidas = vidasSimulacaoPadrao();
    const r = linhasResultadoRede(PARAMETROS_REDE_PADRAO, q, vidas).map((x) => x.map(semNbsp));
    const { linhas } = resultadoRede(q.total.adesao, PARAMETROS_REDE_PADRAO, vidas);
    expect(r).toHaveLength(13);
    expect(r[0][3]).toBe(""); // antes do início
    expect(r[2][3]).toBe(""); // parcela fixa (03/2027)
    expect(r[8][3]).toBe(`${linhas[8].vidasAcumuladas.toLocaleString("pt-BR")} estimadas`); // 09/2027: valor por vida
    expect(r[12][0]).toBe("TOTAL");
  });
  it("brings the current Resultados Rede parameters", () => {
    expect(linhasParametrosRede(PARAMETROS_REDE_PADRAO).map(([a, b]) => [a, semNbsp(b)])).toEqual([
      ["Parcelas fixas", "6"], ["Início das parcelas", "03/2027"], ["Valor da parcela", "R$ 15.000,00"], ["Valor por vida (após as parcelas fixas)", "R$ 1,00"],
    ]);
    expect(semNbsp(regraMensalidadeRede({ ...PARAMETROS_REDE_PADRAO, valorParcela: 12000 }))).toContain("6 parcelas fixas de R$ 12.000,00 a partir de 03/2027");
  });
  it("rolls the start month into the next year after month 12", () => {
    expect(mesInicioRede(1)).toBe("01/2027");
    expect(mesInicioRede(13)).toBe("01/2028");
  });
  it("flags numbers the AI wrote that are not in the data", () => {
    const d = dadosRascunhoRede(PARAMETROS_REDE_PADRAO);
    expect(numerosForaDosDadosRede("São 200 especialidades e 6 parcelas de 15.000,00.", d)).toEqual([]);
    expect(numerosForaDosDadosRede("Prazo de 90 dias.", d)).toEqual(["90"]);
  });
  it("uses the default text until a revision is approved", () => {
    expect(textosRedeParaPdf(estadoRedeVazio())).toEqual(TEXTOS_REDE_PADRAO);
    const aprovado = aprovarTextosRede(estadoRedeVazio(), { ...TEXTOS_REDE_PADRAO, introducao: "Novo texto." });
    expect(textosRedeParaPdf(aprovado).introducao).toBe("Novo texto.");
  });
  it("keeps the current text where the AI returned nothing", () => {
    expect(mesclarRascunhoRede(TEXTOS_REDE_PADRAO, { introducao: "IA", condicoes: "" }).condicoes).toBe(TEXTOS_REDE_PADRAO.condicoes);
  });
  it("warns when an approved text cites a parameter that changed", () => {
    const e = aprovarTextosRede(estadoRedeVazio(), { ...TEXTOS_REDE_PADRAO, gestao: "Parcelas de R$ 15.000,00." });
    expect(topicosRedeDesatualizados(e, dadosRascunhoRede(PARAMETROS_REDE_PADRAO))).toEqual([]);
    expect(topicosRedeDesatualizados(e, dadosRascunhoRede({ ...PARAMETROS_REDE_PADRAO, valorParcela: 12000 }))).toEqual(["3. Gestão de Rede"]);
  });
  it("builds the PDF with the three topics", () => {
    const doc = buildPropostaRedePdf(null);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
