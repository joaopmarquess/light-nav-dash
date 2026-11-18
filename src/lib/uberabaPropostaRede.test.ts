import { describe, expect, it } from "vitest";
import { PARAMETROS_REDE_PADRAO } from "./uberabaParametrosRede";
import {
  CONDICOES_GERAIS_REDE, TEXTOS_REDE_PADRAO, aprovarTextosRede, dadosRascunhoRede, estadoRedeVazio, linhasCondicoesRede, linhasParametrosRede, mesInicioRede, mesclarRascunhoRede,
  numerosForaDosDadosRede, regraMensalidadeRede, textosRedeParaPdf, topicosRedeDesatualizados,
} from "./uberabaPropostaRede";
import { TOPICOS_PROPOSTA_REDE, buildPropostaRedePdf } from "./uberabaPropostaRedePdf";

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
  it("brings the Condições Rede (Disponível) groups and total", () => {
    const l = linhasCondicoesRede().map((r) => r.map(semNbsp));
    expect(l[0]).toEqual(["Especialidades médicas", "56", "229", "R$ 200,00", "R$ 45.800,00"]);
    expect(l[3]).toEqual(["TOTAL", "77", "353", "", "R$ 70.600,00"]);
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
    expect(numerosForaDosDadosRede("São 353 referências e 6 parcelas de 15.000,00.", d)).toEqual([]);
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
