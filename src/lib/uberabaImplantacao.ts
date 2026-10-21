export type EtapaImplantacao = { numero: number; titulo: string; entrega: string; criterio: string; prazo: string | null; responsavel: string | null; status: string | null };

const EM_DEFINICAO = "Em definição";
export const textoDefinicao = (valor: string | null) => valor ?? EM_DEFINICAO;

const etapa = (numero: number, titulo: string, entrega: string, criterio: string): EtapaImplantacao => ({ numero, titulo, entrega, criterio, prazo: null, responsavel: null, status: null });

export const IMPLANTACAO_UBERABA = {
  titulo: "Implantação",
  subtitulo: "Da estratégia à operação",
  etapas: [
    etapa(1, "Decisão e governança", "Definição do escopo, das responsabilidades, dos fóruns de decisão e do plano integrado.", "Sponsor e responsáveis definidos."),
    etapa(2, "Rede hospitalar", "Negociação e formalização do Hospital Mário Palmério.", "Condições aprovadas e contrato concluído."),
    etapa(3, "Rede complementar", "Credenciamento de médicos, clínicas, laboratórios, serviços de diagnóstico e terapia e profissionais não médicos.", "Rede mínima pronta para operação."),
    etapa(4, "Contratos comerciais", "Formalização das relações com SIGA Soluções, Lancers, ACIU e demais envolvidos.", "Instrumentos assinados e responsabilidades definidas."),
    etapa(5, "Produtos e sistemas", "Configuração das tabelas, regras comerciais, cadastros, App, carteirinha virtual e Autorizador Online.", "Testes e validações concluídos."),
    etapa(6, "Marketing e vendas", "Campanha de lançamento, materiais comerciais, treinamento das equipes e preparação dos canais.", "Comunicação aprovada e equipes autorizadas."),
    etapa(7, "Início e monitoramento", "Início da operação, acompanhamento dos indicadores, gestão dos riscos e correção das pendências.", "Go-live aprovado e rotina de monitoramento implantada."),
  ],
  condicao: "Iniciar somente após validação conjunta da rede, dos contratos, dos produtos, dos sistemas, das equipes e da comunicação.",
  resultado: { titulo: "Operação Iniciada", tipo: "esperado" as const, itens: ["Rede ativa", "Produtos disponíveis", "Parceiros preparados", "Jornada digital funcionando"] },
  indicadores: ["Vidas", "Propostas", "Conversão", "Rede ativa", "Faturamento", "Custos", "Resultado", "Sinistralidade", "Autorizações", "Auditoria remota", "Pendências operacionais", "Desempenho das campanhas"],
};
