export type EtapaGuia = {
  id: string;
  etapa_numero: number;
  etapa_titulo: string;
  etapa_descricao: string;
  etapa_cor: "virtual" | "autorizador" | "auditoria" | "atendimento";
  ordem_exibicao: number;
  status_ativo: boolean;
};

export type GuiasContent = {
  id: string;
  etapas: EtapaGuia[];
  imagem_operacao_url?: string;
  texto_imagem: string;
  resultado_titulo: string;
  resultado_descricao: string;
  fluxo: { id: string; fluxo_item: string; fluxo_ordem: number; status_ativo: boolean }[];
  status_ativo: boolean;
  observacao: string;
};

export const GUIAS_UBERABA: GuiasContent = {
  id: "uberaba-guias",
  etapas: [
    { id: "carteirinha", etapa_numero: 1, etapa_titulo: "CARTEIRINHA VIRTUAL", etapa_descricao: "Identificação pelo App, com a carteirinha digital disponível ao cliente no celular.", etapa_cor: "virtual", ordem_exibicao: 1, status_ativo: true },
    { id: "autorizador", etapa_numero: 2, etapa_titulo: "AUTORIZADOR ONLINE", etapa_descricao: "Solicitação e autorização eletrônicas, sem necessidade de guia em papel.", etapa_cor: "autorizador", ordem_exibicao: 2, status_ativo: true },
    { id: "auditoria", etapa_numero: 3, etapa_titulo: "AUDITORIA REMOTA", etapa_descricao: "Análise online pela equipe de auditoria, com acompanhamento por computador.", etapa_cor: "auditoria", ordem_exibicao: 3, status_ativo: true },
    { id: "atendimento", etapa_numero: 4, etapa_titulo: "ATENDIMENTO DIGITAL", etapa_descricao: "Cliente e prestador acompanham o processo sem necessidade de deslocamento ao Bensaúde.", etapa_cor: "atendimento", ordem_exibicao: 4, status_ativo: true },
  ],
  texto_imagem: "Autorização e auditoria conectadas à recepção, ao prestador e ao cliente.",
  resultado_titulo: "RESULTADO",
  resultado_descricao: "Mais agilidade • Menos papel • Mais comodidade",
  fluxo: [
    "Cliente apresenta a carteirinha virtual;",
    "Prestador registra a solicitação;",
    "Solicitação entra no Autorizador Online;",
    "Sistema realiza as validações aplicáveis;",
    "Casos necessários são encaminhados à auditoria remota;",
    "Equipe do Bensaúde analisa o caso online;",
    "Autorização ou pendência é disponibilizada digitalmente;",
    "Prestador e cliente acompanham o andamento;",
    "Processo é concluído sem guia física;",
    "Histórico permanece disponível para consulta.",
  ].map((fluxo_item, index) => ({ id: `fluxo-${index + 1}`, fluxo_item, fluxo_ordem: index + 1, status_ativo: true })),
  status_ativo: true,
  observacao: "O fluxo apresentado representa a premissa operacional proposta para o Bensaúde Uberaba. Regras de autorização, critérios de auditoria, prazos e níveis de serviço deverão ser confirmados durante a formalização e a implantação.",
};