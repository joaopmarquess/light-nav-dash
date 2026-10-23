import anexos from "@/data/uberabaLancers.json";

export type LancersTable = { title: string; headers: string[]; rows: string[][] };
export type Accommodation = "enfermaria" | "apartamento";
export const LANCERS_SOURCES = anexos;
export const FAIXAS_LANCERS = ["0–18", "19–23", "24–28", "29–33", "34–38", "39–43", "44–48", "49–53", "54–58", "59+"];
export const numeroLancers = (value: string) => Number(value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
export const formatarLancers = (value: number) => value.toLocaleString("pt-BR");
export const moedaLancers = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function precosLancers(acomodacao: Accommodation) {
  const tabela = anexos.precos.tables[acomodacao === "enfermaria" ? 1 : 3];
  return tabela.rows.map((row, index) => ({
    nome: row[0].split(/ Adesão · AGSI| PME · AGSI| Empresarial \(| PME 2–29/)[0].replace("★ ", ""),
    contexto: index < 3 ? "AGSI · consulta 08/10/2026" : index === 3 ? "set/2026 · empresarial, sem faixa de vidas" : index === 4 ? "jul/2026 · PME 2–29 vidas" : "Promoção vencida em 30/09/2026 · PME 2–29 vidas",
    valores: row.slice(1).map(numeroLancers),
    referencia: index === 0,
    promocaoVencida: index >= 5,
  }));
}
export function rankingLancers(acomodacao: Accommodation, faixa: number) {
  const produtos = precosLancers(acomodacao);
  const referencia = produtos[0]?.valores[faixa];
  if (referencia === undefined) return null;
  // O comparativo original usa a referência e seis concorrentes; as outras duas tabelas Bensaúde não entram no ranking.
  return 1 + produtos.slice(3).filter((produto) => produto.valores[faixa] < referencia).length;
}
export const OPORTUNIDADES_LANCERS = [
  { id: "O1", titulo: "Empresarial PME", territorio: "Uberaba", mercado: 107588, hoje: 1, conservador: 1075, base: 3539, meta: "1,0% / 3,29% (EVO)", receita: "5,8 – 19,1" },
  { id: "O2", titulo: "Empresarial PME", territorio: "Limítrofes · L1", mercado: 22693, hoje: 0, conservador: 226, base: 680, meta: "+1 / +3 p.p.", receita: "1,2 – 3,7" },
  { id: "O3", titulo: "Coletivo por adesão", territorio: "Uberaba", mercado: 12627, hoje: 0, conservador: 253, base: 631, meta: "2,0% / 5,0%", receita: "1,4 – 3,4" },
  { id: "O4", titulo: "Empresarial PME", territorio: "Triângulo com presença · L3", mercado: 38573, hoje: 395, conservador: 385, base: 1158, meta: "+1 / +3 p.p.", receita: "2,1 – 6,2" },
] as const;
export function totalPotencialLancers(cenario: "conservador" | "base") {
  return OPORTUNIDADES_LANCERS.reduce((total, oportunidade) => total + oportunidade[cenario], 0);
}
export const LANCERS_PREMISSAS = [
  { titulo: "Produto e território", texto: "O relatório não identifica municípios de MG na NTRP consultada (23 planos; SP e MS). A entrada pressupõe produto com Uberaba na área de comercialização." },
  { titulo: "Hospital âncora", texto: "O relatório não encontra rede hospitalar do Bensaúde em Uberaba. O projeto considera o Hospital Mário Palmério; disponibilidade e contratação precisam ser formalizadas." },
  { titulo: "Canal e contratos", texto: "As oportunidades Lancers são insumos de estudo. Não substituem os modelos PCA/ACIU, PCE 50 a 99 e PCE 100+, nem definem parceiros ou remuneração." },
  { titulo: "Preço e sustentabilidade", texto: "Mensalidade não é custo total. Coparticipações, rede, abrangência e carências precisam ser validadas antes de divulgar uma oferta para Uberaba." },
];