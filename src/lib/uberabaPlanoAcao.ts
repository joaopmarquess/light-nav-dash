import type { EtapaGuia } from "@/lib/uberabaGuias";
import type { ModeloFrenteContent } from "@/lib/uberabaFrentes";
import { OPERACAO_UBERABA } from "@/lib/uberabaOperacao";
import { FORMALIZACAO_UBERABA as formal } from "@/lib/uberabaFormalizacao";
import { IMPLANTACAO_UBERABA as implant, textoDefinicao } from "@/lib/uberabaImplantacao";
import operacaoImagem from "@/assets/uberaba-plano-operacao.jpg";
import formalizacaoImagem from "@/assets/uberaba-plano-formalizacao.jpg";
import implantacaoImagem from "@/assets/uberaba-plano-implantacao.jpg";
import outdoorImagem from "@/assets/projeto-uberaba-home-v2.svg.asset.json";

// Telas do Plano de Ação no formato visual do Modelo de Atuação.
// Somente reorganiza o conteúdo já existente (Operação Iniciada, Marketing, Formalização, Implantação).
const CORES: EtapaGuia["etapa_cor"][] = ["virtual", "autorizador", "auditoria", "atendimento"];
const cor = (i: number) => CORES[i % CORES.length];
const primeiraMaiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const PLANO_HOME_UBERABA: ModeloFrenteContent = {
  id: "plano-home",
  titulo: "Operação Iniciada",
  subtitulo: "Tudo convergindo para a operação iniciada",
  grupos: [{
    id: "frentes",
    titulo: "Frentes do projeto",
    itens: OPERACAO_UBERABA.frentes.map((f, i) => ({ id: f.id, numero: i + 1, titulo: f.titulo, cor: cor(i), descricao: f.descricao })),
  }],
  imagem_url: operacaoImagem,
  imagem_alt: "Equipe do Bensaúde, médico e parceiros acompanham indicadores em uma tela, alinhados para o início da operação.",
  imagem_placeholder: "Imagem da operação",
  indicadores: ["ALINHAMENTO E EXECUÇÃO", "TUDO CONFORME PLANEJADO", "OPERAÇÃO INICIADA", "MONITORAR E EVOLUIR"],
  destaque_titulo: "RESULTADO ESPERADO",
  destaque_itens: OPERACAO_UBERABA.descricao.split(" • ").map(primeiraMaiuscula),
  nota: "“Operação Iniciada” representa o resultado esperado do projeto, não uma operação já iniciada.",
};

export const PREMISSAS_MARKETING = [
  { titulo: "Somos novos", texto: "Apresentar a chegada com transparência." },
  { titulo: "Temos credibilidade", texto: "Demonstrar experiência e capacidade." },
  { titulo: "Acreditamos em Uberaba", texto: "Valorizar a cidade, seus valores e potencial." },
  { titulo: "Vocação para a saúde", texto: "Reconhecer a força da medicina local." },
  { titulo: "Parceiros locais", texto: "Hospital Mário Palmério e SIGA Soluções." },
  { titulo: "Investimento e conexão", texto: "Aproximar empresas, médicos e prestadores." },
];

export const PLANO_MARKETING_UBERABA: ModeloFrenteContent = {
  id: "plano-marketing",
  titulo: "Plano de Marketing",
  subtitulo: "Estamos chegando. Posicionamento e publicidade inicial na cidade.",
  grupos: [
    { id: "premissas", titulo: "Premissas da narrativa", colunas: 2, itens: PREMISSAS_MARKETING.map((p, i) => ({ id: `premissa-${i + 1}`, numero: i + 1, titulo: p.titulo, cor: cor(i), descricao: p.texto })) },
    { id: "canais", titulo: "Onde divulgar", colunas: 2, itens: [
      { id: "offline", numero: 7, titulo: "Off-line", cor: "virtual", descricao: "TV • Outdoor • Painéis • Rádio • Imprensa local" },
      { id: "online", numero: 8, titulo: "On-line", cor: "autorizador", descricao: "Instagram • Facebook • LinkedIn • Influenciadores locais" },
    ] },
  ],
  imagem_url: outdoorImagem.url,
  imagem_ajuste: "contain",
  imagem_ampliavel: true,
  imagem_alt: "Outdoor do Bensaúde com Hospital Mário Palmério e SIGA: Estamos chegando, Uberaba",
  imagem_placeholder: "Imagem a inserir",
  indicadores: ["CHEGAR", "CONECTAR", "CRESCER"],
  mensagem: {
    titulo: "A mensagem",
    textos: [
      "O Bensaúde chega a Uberaba porque acredita na cidade, reconhece sua força econômica e sua vocação para a saúde.",
      "Trazemos a credibilidade construída onde já atuamos e queremos investir em uma relação duradoura com empresas, profissionais de saúde, prestadores e a comunidade.",
    ],
  },
  destaque_titulo: "DIRETRIZ",
  destaque_itens: ["Comunicação institucional primeiro; produtos, preços e rede somente após validação e autorização formal."],
};

export const PLANO_FORMALIZACAO_UBERABA: ModeloFrenteContent = {
  id: "plano-formalizacao",
  titulo: "Formalização",
  subtitulo: "Produtos e instrumentos contratuais previstos",
  grupos: [
    { id: "produtos", titulo: "Produtos", itens: [
      { id: "confeccao", numero: 1, titulo: formal.produtos.titulo, cor: "virtual", descricao: `Rede ${formal.produtos.rede} a ${formal.produtos.territorio}` },
    ] },
    { id: "siga", titulo: "Parceria local · Contratos com a SIGA", itens: [
      { id: "protocolos", numero: 2, titulo: formal.siga.instrumentoPrevio, cor: "autorizador", rotulo: "Previamente", descricao: formal.siga.frentes.join(" • ") },
      { id: "contratos-siga", numero: 3, titulo: `Contratos de ${formal.siga.escoposContratuais.join(" e ")}`, cor: "auditoria", descricao: `Não há contrato de ${formal.siga.escoposExcluidos.join(" ou ")}. Os contratos são de venda e captação.` },
    ] },
    { id: "assistenciais", titulo: "Contratos assistenciais", itens: [
      { id: "hospital", numero: 4, titulo: `Contratos com o ${formal.contratosAssistenciais[0]}`, cor: "atendimento", rotulo: "Referência hospitalar", descricao: "Formalização da relação hospitalar" },
      { id: "credenciados", numero: 5, titulo: `Contratos com os ${formal.contratosAssistenciais[1].toLowerCase()}`, cor: "virtual", rotulo: "Rede assistencial", descricao: "Formalização dos credenciamentos" },
    ] },
  ],
  imagem_url: formalizacaoImagem,
  imagem_alt: "Parceiros e médica acompanham a assinatura de um contrato em sala de reunião.",
  imagem_placeholder: "Imagem da formalização",
  indicadores: ["PRODUTOS", "PROTOCOLOS DE INTENÇÕES", "CONTRATOS SIGA", "HOSPITAL", "CREDENCIADOS"],
  destaque_titulo: "FORMALIZAÇÃO",
  destaque_itens: ["Produtos", "Protocolos de Intenções", "Venda e captação", "Hospital e credenciados"],
  nota: "Instrumentos previstos; sujeitos à negociação e formalização.",
};

export const PLANO_IMPLANTACAO_UBERABA: ModeloFrenteContent = {
  id: "plano-implantacao",
  titulo: implant.titulo,
  subtitulo: implant.subtitulo,
  grupos: [{
    id: "etapas",
    titulo: "Etapas da implantação",
    colunas: 2,
    itens: implant.etapas.map((e, i) => ({
      id: `implantacao-${e.numero}`,
      numero: e.numero,
      titulo: e.titulo,
      cor: cor(i),
      // Prazo/responsável só aparecem no quadro quando definidos; os demais ficam "Em definição" na nota da tela.
      descricao: [e.entrega, `Critério de avanço: ${e.criterio}`, ...(e.prazo || e.responsavel ? [`Prazo: ${textoDefinicao(e.prazo)} • Responsável: ${textoDefinicao(e.responsavel)}`] : [])],
    })),
  }],
  nota: implant.etapas.some((e) => !e.prazo || !e.responsavel) ? "Prazos e responsáveis das etapas: Em definição." : undefined,
  imagem_url: implantacaoImagem,
  imagem_alt: "Equipe de projeto e enfermeira planejam as etapas da implantação em um quadro com notas.",
  imagem_placeholder: "Imagem da implantação",
  indicadores_titulo: "Monitorar e evoluir",
  indicadores: implant.indicadores.map((i) => i.toUpperCase()),
  mensagem: { titulo: "Condição-chave", textos: [`“${implant.condicao}”`] },
  destaque_titulo: `RESULTADO ESPERADO · ${implant.resultado.titulo.toUpperCase()}`,
  destaque_itens: [...implant.resultado.itens],
};
