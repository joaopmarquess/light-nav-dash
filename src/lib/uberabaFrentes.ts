import type { EtapaGuia, GuiasContent } from "@/lib/uberabaGuias";
import { GRUPOS_CREDENCIAMENTO, RESUMO_CREDENCIAMENTO } from "@/lib/uberabaCredenciamento";
import comercialImagem from "@/assets/uberaba-comercial-negociacao.jpg";
import redeImagem from "@/assets/uberaba-rede-assistencial-operacao.jpg";

// Telas Comercial e Rede Assistencial do Modelo de Atuação, no formato da tela Guias.
// Onde ainda não há conteúdo definido, o texto é Lorem ipsum provisório.
export const LOREM_CURTO = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

const CORES: EtapaGuia["etapa_cor"][] = ["virtual", "autorizador", "auditoria", "atendimento"];
const etapas = (itens: [string, string, string][]): EtapaGuia[] =>
  itens.map(([id, etapa_titulo, etapa_descricao], i) => ({ id, etapa_numero: i + 1, etapa_titulo, etapa_descricao, etapa_cor: CORES[i], ordem_exibicao: i + 1, status_ativo: true }));
const fluxo = (itens: string[]) => itens.map((fluxo_item, i) => ({ id: `fluxo-${i + 1}`, fluxo_item, fluxo_ordem: i + 1, status_ativo: true }));
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

// Comercial: somente o conteúdo fornecido pelo Dênis, organizado no formato visual de Guias.
export type ItemComercial = { id: string; numero: number; titulo: string; cor: EtapaGuia["etapa_cor"]; subitens?: string[] };
export type GrupoComercial = { id: string; titulo: string; itens: ItemComercial[] };
export type ModeloComercialContent = {
  titulo: string;
  subtitulo: string;
  grupos: GrupoComercial[];
  imagem_url: string;
  imagem_alt: string;
  indicadores: string[];
  destaque_titulo: string;
  destaque_itens: string[];
};

export const COMERCIAL_UBERABA: ModeloComercialContent = {
  titulo: "Comercial",
  subtitulo: "Modelo comercial e estrutura de vendas em Uberaba",
  grupos: [
    {
      id: "forcas-vendas",
      titulo: "Forças de Vendas",
      itens: [
        { id: "farmer", numero: 1, titulo: "Farmer em Uberaba", cor: "virtual" },
        { id: "sdr", numero: 2, titulo: "Equipe própria SDR em Rio Preto", cor: "autorizador" },
        { id: "agentes", numero: 3, titulo: "Agentes Comerciais Autorizados em Uberaba", cor: "auditoria", subitens: ["Siga Soluções", "Corretores Lancers"] },
      ],
    },
    {
      id: "produtos",
      titulo: "Produtos",
      itens: [
        { id: "pca-pme", numero: 4, titulo: "PCA e PME Administrado", cor: "atendimento" },
        { id: "pce-100", numero: 5, titulo: "PCE 100+", cor: "virtual" },
      ],
    },
  ],
  imagem_url: comercialImagem,
  imagem_alt: "Executivo comercial cumprimenta cliente empresarial em reunião de negociação, com colegas e propostas sobre a mesa.",
  indicadores: ["FARMER EM UBERABA", "SDR EM RIO PRETO", "AGENTES AUTORIZADOS", "PCA / PME", "PCE 100+"],
  destaque_titulo: "MODELO COMERCIAL",
  destaque_itens: ["Presença local em Uberaba", "Apoio SDR em Rio Preto", "Agentes autorizados", "Portfólio direcionado"],
};

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
