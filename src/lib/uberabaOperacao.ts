export const OPERACAO_UBERABA = {
  status: "resultado-esperado" as const,
  frentes: [
    { id: "rede", titulo: "REDE ASSISTENCIAL", descricao: "Hospital Mário Palmério, médicos, clínicas, laboratórios e serviços.", cor: "rede" },
    { id: "comercial", titulo: "MODELO COMERCIAL", descricao: "PCA/ACIU, PCE 50 a 99 e PCE 100+.", cor: "comercial" },
    { id: "credenciamento", titulo: "CREDENCIAMENTO", descricao: "Especialidades e serviços priorizados, com critérios, quantidades e valores definidos.", cor: "credenciamento" },
    { id: "marketing", titulo: "PLANO DE MARKETING", descricao: "“Estamos chegando”: posicionamento, publicidade e conexão com Uberaba.", cor: "marketing" },
    { id: "guias", titulo: "MODELO DE OPERAÇÃO", descricao: "Guias sem papel, App, carteirinha virtual, Autorizador Online e auditoria remota.", cor: "guias" },
    { id: "formalizacao", titulo: "FORMALIZAÇÃO", descricao: "Contratos, responsabilidades, fluxos e condições aprovados.", cor: "formalizacao" },
  ],
  resultado: "OPERAÇÃO INICIADA",
  descricao: "Rede ativa • produtos disponíveis • parceiros preparados • jornada digital funcionando",
};