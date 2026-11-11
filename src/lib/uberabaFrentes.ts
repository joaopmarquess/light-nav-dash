import type { EtapaGuia, GuiasContent } from "@/lib/uberabaGuias";
import { GRUPOS_CREDENCIAMENTO, RESUMO_CREDENCIAMENTO } from "@/lib/uberabaCredenciamento";
import { INDICES_PADRAO, type Indices } from "@/lib/uberabaTabelasComerciais";
import comercialImagem from "@/assets/uberaba-comercial-operacao.jpg";
import redeImagem from "@/assets/uberaba-rede-assistencial-operacao.jpg";

// Telas Comercial e Rede Assistencial do Modelo de Atuação, no formato da tela Guias.
// Onde ainda não há conteúdo definido, o texto é Lorem ipsum provisório.
export const LOREM_CURTO = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

const CORES: EtapaGuia["etapa_cor"][] = ["virtual", "autorizador", "auditoria", "atendimento"];
const etapas = (itens: [string, string, string][]): EtapaGuia[] =>
  itens.map(([id, etapa_titulo, etapa_descricao], i) => ({ id, etapa_numero: i + 1, etapa_titulo, etapa_descricao, etapa_cor: CORES[i], ordem_exibicao: i + 1, status_ativo: true }));
const fluxo = (itens: string[]) => itens.map((fluxo_item, i) => ({ id: `fluxo-${i + 1}`, fluxo_item, fluxo_ordem: i + 1, status_ativo: true }));
const pct = (v: number) => `${v.toLocaleString("pt-BR")}%`;
const n = (v: number) => v.toLocaleString("pt-BR");
const grupo = (id: (typeof GRUPOS_CREDENCIAMENTO)[number]["id"]) => GRUPOS_CREDENCIAMENTO.find((g) => g.id === id)!;
const LOREM_FLUXO = [
  "Lorem ipsum dolor sit amet;",
  "Consectetur adipiscing elit;",
  "Sed do eiusmod tempor incididunt;",
  "Ut labore et dolore magna aliqua;",
  "Ut enim ad minim veniam;",
  "Quis nostrud exercitation ullamco;",
];

/** Usa os índices gravados no Estudo › Comercial, para as duas telas mostrarem os mesmos percentuais. */
export const comercialUberaba = (indices: Indices = INDICES_PADRAO): GuiasContent => ({
  id: "uberaba-comercial",
  titulo: "Comercial",
  subtitulo: "Produtos e tabelas de preço sobre a Referência",
  rotulo_etapas: "Produtos comerciais",
  etapas: etapas([
    ["pca-adm", "PCA ADM.", `Adesão administrada, com tabela a ${pct(indices.pcaAdm)} da Referência.`],
    ["pce-adm", "PCE ADM.", `Empresarial para médias empresas, com tabela a ${pct(indices.pceAdm)} da Referência.`],
    ["pce-100", "PCE 100+", `Empresarial para grandes empresas, com tabela a ${pct(indices.pce100)} da Referência.`],
    ["acomodacao", "ACOMODAÇÃO", "Enfermaria pela tabela do produto; Apartamento = Enfermaria × 1,25."],
  ]),
  imagem_operacao_url: comercialImagem,
  imagem_alt: "Consultora apresenta tabelas de planos em um tablet para clientes em um escritório comercial.",
  imagem_placeholder: "Imagem da operação comercial",
  texto_imagem: LOREM_CURTO,
  indicadores: ["PCA ADM.", "PCE ADM.", "PCE 100+", "LOREM IPSUM"],
  resultado_titulo: "RESULTADO",
  resultado_descricao: "Lorem ipsum • Dolor sit • Amet consectetur",
  resultado_itens: ["Lorem ipsum", "Dolor sit amet", "Consectetur", "Adipiscing elit", "Sed do eiusmod"],
  premissa: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
  fluxo: fluxo(LOREM_FLUXO),
  status_ativo: true,
  observacao: "Os índices sobre a Referência podem ser ajustados no Estudo › Comercial. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
});

export const REDE_UBERABA: GuiasContent = {
  id: "uberaba-rede-assistencial",
  titulo: "Rede Assistencial",
  subtitulo: "Referências médicas, diagnóstico e terapia e profissionais não médicos",
  rotulo_etapas: "Composição da rede",
  etapas: etapas([
    ["medicos", "ESPECIALIDADES MÉDICAS", `${n(grupo("medicos").categorias)} especialidades e ${n(grupo("medicos").quantidade)} referências, priorizando a rede EVO e usando a Unimed quando necessário.`],
    ["diagnostico", "DIAGNÓSTICO E TERAPIA", `${n(grupo("diagnostico").categorias)} categorias de serviços e ${n(grupo("diagnostico").quantidade)} prestadores disponíveis.`],
    ["nao-medicos", "PROFISSIONAIS NÃO MÉDICOS", `${n(grupo("nao-medicos").categorias)} categorias profissionais e ${n(grupo("nao-medicos").quantidade)} profissionais e serviços.`],
    ["hospital", "HOSPITAL MÁRIO PALMÉRIO", "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor."],
  ]),
  imagem_operacao_url: redeImagem,
  imagem_alt: "Médica atende paciente em clínica, com sala de exame de imagem e fisioterapia ao fundo.",
  imagem_placeholder: "Imagem da rede assistencial",
  texto_imagem: LOREM_CURTO,
  indicadores: [`${n(RESUMO_CREDENCIAMENTO.categorias)} CATEGORIAS`, `${n(RESUMO_CREDENCIAMENTO.quantidade)} REFERÊNCIAS`, "EVO + UNIMED", "LOREM IPSUM"],
  resultado_titulo: "RESULTADO",
  resultado_descricao: "Lorem ipsum • Dolor sit • Amet consectetur",
  resultado_itens: ["Lorem ipsum", "Dolor sit amet", "Consectetur", "Adipiscing elit", "Sed do eiusmod"],
  premissa: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
  fluxo: fluxo(LOREM_FLUXO),
  status_ativo: true,
  observacao: "As quantidades consideram a disponibilidade identificada nas redes EVO e Unimed; credenciamento e pagamento dependem da formalização. Os cenários completos estão no Estudo › Rede Assistencial.",
};
