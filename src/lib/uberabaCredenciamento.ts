export type GrupoCredenciamento = "medicos" | "diagnostico" | "nao-medicos";
export type ReferenciaCredenciamento = {
  grupo: GrupoCredenciamento;
  especialidade_categoria: string;
  quantidade_evo: number | null;
  quantidade_unimed: number | null;
  status_validacao: string;
  observacao: string;
};

export const GRUPOS_CREDENCIAMENTO = [
  { id: "medicos", titulo: "Especialidades médicas", indicador: "Especialidades médicas", categorias: 56, quantidade: 229, valor: 200, total: 45800, explicacao: "A quantidade de 229 corresponde à disponibilidade identificada por especialidade, priorizando a rede EVO e utilizando a Unimed quando não houver disponibilidade correspondente na EVO." },
  { id: "diagnostico", titulo: "Serviços auxiliares de diagnóstico e terapia", indicador: "Categorias de serviços", categorias: 15, quantidade: 69, valor: 200, total: 13800, explicacao: "A quantidade de 69 corresponde aos prestadores disponíveis nas categorias de diagnóstico e terapia, considerando a EVO como fonte principal e a Unimed como referência complementar." },
  { id: "nao-medicos", titulo: "Serviços auxiliares e profissionais não médicos", indicador: "Categorias profissionais", categorias: 6, quantidade: 55, valor: 200, total: 11000, explicacao: "A quantidade de 55 corresponde aos profissionais e serviços disponíveis nas categorias não médicas, priorizando a EVO e utilizando a Unimed somente quando necessário." },
] as const;

export const RESUMO_CREDENCIAMENTO = { categorias: 77, quantidade: 353, total: 70600 };
export type ModoCredenciamento = "Disponível" | "Limite" | "Rio Preto";
export const MODO_CREDENCIAMENTO_PADRAO: ModoCredenciamento = "Disponível";
const QUANTIDADES_RIO_PRETO: Record<GrupoCredenciamento, number> = { medicos: 577, diagnostico: 20, "nao-medicos": 30 };
export function cenarioCredenciamento(modo: ModoCredenciamento = MODO_CREDENCIAMENTO_PADRAO) {
  const grupos = GRUPOS_CREDENCIAMENTO.map((grupo) => {
    if (modo === "Rio Preto") {
      const quantidade = QUANTIDADES_RIO_PRETO[grupo.id];
      return { ...grupo, quantidade, valor: null, total: null, explicacao: `Disponibilidade em Rio Preto: ${quantidade} referências em ${grupo.categorias} ${grupo.indicador.toLocaleLowerCase("pt-BR")}.` };
    }
    if (modo !== "Limite") return grupo;
    const multiplicador = grupo.id === "diagnostico" ? 1 : 2;
    const quantidade = grupo.categorias * multiplicador;
    return { ...grupo, quantidade, total: quantidade * grupo.valor, explicacao: `Limite: ${grupo.categorias} ${grupo.indicador.toLocaleLowerCase("pt-BR")} × ${multiplicador} = ${quantidade} referências.` };
  });
  const resumo = modo !== "Disponível" ? { categorias: 77, quantidade: grupos.reduce((s, g) => s + g.quantidade, 0), total: modo === "Rio Preto" ? null : grupos.reduce((s, g) => s + (g.total ?? 0), 0) } : RESUMO_CREDENCIAMENTO;
  return { grupos, resumo };
}
export const referenciasCredenciamento: ReferenciaCredenciamento[] = [];
export const moedaCredenciamento = (valor: number | null) => valor === null ? "-" : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function projetarCredenciamento(item: ReferenciaCredenciamento) {
  const evoDisponivel = (item.quantidade_evo ?? 0) > 0;
  const quantidade_considerada = evoDisponivel ? item.quantidade_evo ?? 0 : item.quantidade_unimed ?? 0;
  const origem_quantidade = evoDisponivel ? "EVO" : quantidade_considerada > 0 ? "Unimed" : null;
  const valor_unitario = GRUPOS_CREDENCIAMENTO.find((grupo) => grupo.id === item.grupo)?.valor ?? 0;
  return { ...item, quantidade_considerada, origem_quantidade, valor_unitario, valor_projetado: quantidade_considerada * valor_unitario };
}