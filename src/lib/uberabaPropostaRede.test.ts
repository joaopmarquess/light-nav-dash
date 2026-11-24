import { describe, expect, it } from "vitest";
import { PARAMETROS_REDE_PADRAO } from "./uberabaParametrosRede";
import { blocosPropostaRede,
  COLUNAS_CONDICOES_REDE, CONDICOES_GERAIS_REDE, ROTULOS_TIPOS_REDE, NOTA_PROJECAO_REDE, TEXTO_PROJECAO_REDE, TEXTOS_REDE_PADRAO, quadroCondicoesRede, aprovarTextosRede, dadosRascunhoRede, estadoRedeVazio, linhasCondicoesRede, linhasParametrosRede, mesInicioRede, mesclarRascunhoRede,
  linhasResultadoRede, numerosForaDosDadosRede, regraMensalidadeRede, textosRedeParaPdf, topicosRedeDesatualizados,
} from "./uberabaPropostaRede";
import { TOPICOS_PROPOSTA_REDE, buildPropostaRedePdf } from "./uberabaPropostaRedePdf";
import { linhasQuantidadeCredenciamentos } from "./uberabaQuantidadeCredenciamentos";
import { resultadoRede, vidasSimulacaoPadrao } from "./uberabaResultadoRede";
import { moedaCredenciamento } from "./uberabaCredenciamento";

const semNbsp = (s: string) => s.replace(/\u00a0/g, " ");

describe("Proposta de Credenciamento e Gestão de Rede", () => {
  it("uses the topic titles of Dênis's model (19/11/2026)", () => {
    expect(TOPICOS_PROPOSTA_REDE).toEqual(["1. Introdução", "2. Credenciamento por Captação", "3. Gestão da Rede", "4. Condições Gerais"]);
  });
  it("contracts Siga Soluções (team with médico auditor), term 2027, and hands network management and loss ratio to the Bensaúde from 2028", () => {
    expect(CONDICOES_GERAIS_REDE).toEqual([
      { item: "Contratada", valor: "A contratação será formalizada com a Siga Soluções, responsável pela composição e disponibilização da equipe necessária à execução dos serviços, incluindo o profissional médico responsável pelo relacionamento com a rede credenciada, pela avaliação da qualidade dos profissionais, pela auditoria e pelo controle de desperdícios." },
      { item: "Subordinação", valor: "A gestão da rede pela Siga Soluções será subordinada à Diretoria de Operações do Bensaúde, sob responsabilidade de Fabiana Matos, e contará com o suporte das equipes internas do Bensaúde." },
      { item: "Abrangência", valor: "Esta proposta refere-se exclusivamente à gestão da rede assistencial da cidade de Uberaba (MG), não se aplicando às demais novas praças do Triângulo Mineiro, nem às atuais praças de atuação do Bensaúde." },
      { item: "Período de atuação e vigência financeira", valor: "As condições financeiras desta proposta, incluindo os valores de credenciamento e a remuneração pela gestão da rede, aplicam-se exclusivamente ao ano de 2027 e não se estendem a períodos posteriores." },
      { item: "Investimento do Bensaúde", valor: "O valor excedente aos R$ 200,00 por captação (primeira proposta), as parcelas mensais fixas da gestão e a remuneração estimada por vidas vendidas acumuladas foram considerados investimento do Bensaúde nesta operação. Assim, o sucesso do projeto e o consequente retorno desse investimento dependem da qualidade dos serviços prestados e do empenho no cumprimento das metas." },
      { item: "Transição da gestão", valor: "A partir de 2028, a gestão da rede assistencial passará a ser conduzida diretamente pelo Bensaúde." },
    ]);
    expect(numerosForaDosDadosRede("Contrato em 2027; a partir de 2028 o Bensaúde assume.", dadosRascunhoRede(PARAMETROS_REDE_PADRAO))).toEqual([]);
  });
  it("builds the quantities table from the Credenciamento section (Qtde., Valor, Adesão and TOTAL)", () => {
    const q = linhasQuantidadeCredenciamentos();
    const l = linhasCondicoesRede(q, {}).map((r) => r.map(semNbsp));
    expect(l.filter((r) => r[2] !== "" || r[0] === "TOTAL").map((r) => r[0])).toEqual([...q.linhas.map((x) => ROTULOS_TIPOS_REDE[x.id] ?? x.tipo), "TOTAL"]);
    expect(l[0]).toEqual(["Especialidades", "200", "R$ 300,00", "R$ 60.000,00"]);
    expect(l[1]).toEqual(["Hospitais", "5", "R$ 300,00", "R$ 1.500,00"]);
    expect(l[l.length - 1][3]).toBe(semNbsp(moedaCredenciamento(q.total.adesao)));
    const editado = linhasCondicoesRede(linhasQuantidadeCredenciamentos({ medicos: 10 }, { medicos: 300 }), {}).map((r) => r.map(semNbsp));
    expect(editado[0]).toEqual(["Especialidades", "10", "R$ 300,00", "R$ 3.000,00"]);
  });
  it("explains below Quadro 3 that the projection is estimated, except the fixed installments, within the ATÉ limit", () => {
    expect(NOTA_PROJECAO_REDE).toContain("é estimativa baseada nas premissas desta proposta");
    expect(NOTA_PROJECAO_REDE).toContain("exceto pelas parcelas mensais fixas de gestão");
    expect(NOTA_PROJECAO_REDE).toContain("poderão ser maiores ou menores");
    expect(NOTA_PROJECAO_REDE).toContain("respeitado o limite da coluna “ATÉ”");
    expect(TEXTO_PROJECAO_REDE.endsWith("ao longo de 2027:")).toBe(true);
  });
  it("states in the introduction the Siga Soluções contract during 2027 and, in topic 2, the payment condition", () => {
    expect(TEXTOS_REDE_PADRAO.introducao).toContain("A contratação será formalizada com a Siga Soluções");
    expect(TEXTOS_REDE_PADRAO.introducao).toContain("encerrando-se ao final do exercício");
    expect(TEXTOS_REDE_PADRAO.condicoes).toContain("dependerá da conclusão, aprovação e formalização de cada credenciamento pelo Bensaúde");
  });
  it("heads Quadro 1 with ATÉ, POR ADESÃO and TOTAL", () => {
    expect(COLUNAS_CONDICOES_REDE).toEqual(["TIPO CREDENCIADO", "ATÉ", "POR ADESÃO", "TOTAL"]);
  });
  it("opens every type item by item except Especialidades", () => {
    const quadro = quadroCondicoesRede(linhasQuantidadeCredenciamentos(), { "hospitais:Geral": 3 });
    const nomes = quadro.map((l) => l.celulas[0]);
    expect(nomes.slice(0, 8)).toEqual(["Especialidades", "Hospitais", "Geral", "Pediátrico", "Oftalmológico", "Cardiológico", "Oncológico (Carece de Validação)", "Serviços Aux. Diagnóstico"]);
    expect(nomes).not.toContain("Serviços Aux. Terapias");
    expect(quadro[2]).toEqual({ celulas: ["Geral", "3", "", ""], item: true });
    expect(quadro[3].celulas[1]).toBe("1");
    expect(nomes).toContain("Laboratório de Análises Clínicas");
    expect(nomes).not.toContain("Psicologia");
    expect(nomes).not.toContain("Cardiologia*");
    expect(quadro.filter((l) => l.item)).toHaveLength(9);
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
      ["Parcelas fixas", "3"], ["Início das parcelas", "03/2027"], ["Valor da parcela", "R$ 15.000,00"], ["Valor por vida (após as parcelas fixas)", "R$ 2,00"],
    ]);
    expect(semNbsp(regraMensalidadeRede({ ...PARAMETROS_REDE_PADRAO, parcelasFixas: 6, valorParcela: 10000, valorPorVida: 1 }))).toBe(
      "Nos seis primeiros meses da gestão, a remuneração mensal será de R$ 10.000,00, com início em 03/2027. Encerrado esse período, a remuneração será calculada à razão de R$ 1,00 por vida vendida acumulada.");
  });
  it("rolls the start month into the next year after month 12", () => {
    expect(mesInicioRede(1)).toBe("01/2027");
    expect(mesInicioRede(13)).toBe("01/2028");
  });
  it("flags numbers the AI wrote that are not in the data", () => {
    const d = dadosRascunhoRede(PARAMETROS_REDE_PADRAO);
    expect(numerosForaDosDadosRede("São 200 especialidades e 3 parcelas de 15.000,00.", d)).toEqual([]);
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
    expect(topicosRedeDesatualizados(e, dadosRascunhoRede({ ...PARAMETROS_REDE_PADRAO, valorParcela: 12000 }))).toEqual(["3. Gestão da Rede"]);
  });
  it("textos da proposta não mencionam sinistralidade (pedido de 19/11/2026)", () => {
    const tudo = blocosPropostaRede(PARAMETROS_REDE_PADRAO).map((b) => ("texto" in b ? b.texto : (b as { linhas: string[][] }).linhas.flat().join(" "))).join(" ");
    expect(tudo.toLowerCase()).not.toContain("sinistralidade");
  });
  it("builds the PDF with the three topics", () => {
    const doc = buildPropostaRedePdf(null);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
