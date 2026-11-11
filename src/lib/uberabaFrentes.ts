import type { EtapaGuia } from "@/lib/uberabaGuias";
import comercialImagem from "@/assets/uberaba-comercial-negociacao.jpg";
import redeImagem from "@/assets/uberaba-rede-assistencial-operacao.jpg";
import escritorioImagem from "@/assets/uberaba-escritorio-local.jpg";

// Frentes Comercial e Rede Assistencial do Modelo de Atuação: somente o conteúdo fornecido
// pelo Dênis, organizado no formato visual da tela Guias (que não muda).
export type ItemFrente = {
  id: string;
  numero: number;
  titulo: string;
  cor: EtapaGuia["etapa_cor"];
  /** Rótulo do responsável abaixo do título (ex.: "Equipe", "Dr. Adeir"). */
  rotulo?: string;
  /** Texto(s) explicativo(s) abaixo do título (usado nas telas do Plano de Ação). */
  descricao?: string | string[];
  subitens?: string[];
};
export type GrupoFrente = { id: string; titulo: string; itens: ItemFrente[]; /** Quadros lado a lado (2) quando o grupo tem muitos itens. */ colunas?: 1 | 2 };
export type ModeloFrenteContent = {
  id: string;
  titulo: string;
  subtitulo?: string;
  grupos: GrupoFrente[];
  imagem_url: string;
  imagem_alt: string;
  imagem_placeholder: string;
  /** "contain" mostra a imagem inteira (ex.: outdoor), sem corte. */
  imagem_ajuste?: "cover" | "contain";
  /** Permite ampliar a imagem em janela. */
  imagem_ampliavel?: boolean;
  indicadores: string[];
  indicadores_titulo?: string;
  /** Texto de apoio abaixo das faixas da imagem. */
  mensagem?: { titulo: string; textos: string[] };
  destaque_titulo: string;
  destaque_itens: string[];
  /** Observação em letra pequena abaixo da faixa escura. */
  nota?: string;
};

export const COMERCIAL_UBERABA: ModeloFrenteContent = {
  id: "modelo-comercial",
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
  imagem_placeholder: "Imagem da atividade comercial",
  imagem_alt: "Executivo comercial cumprimenta cliente empresarial em reunião de negociação, com colegas e propostas sobre a mesa.",
  indicadores: ["FARMER EM UBERABA", "SDR EM RIO PRETO", "AGENTES AUTORIZADOS", "PCA / PME", "PCE 100+"],
  destaque_titulo: "MODELO COMERCIAL",
  destaque_itens: ["Presença local em Uberaba", "Apoio SDR em Rio Preto", "Agentes autorizados", "Portfólio direcionado"],
};


export const REDE_UBERABA: ModeloFrenteContent = {
  id: "modelo-rede",
  titulo: "Rede Assistencial",
  grupos: [
    {
      id: "gestao-rede",
      titulo: "Gestão de Rede",
      itens: [
        { id: "captacao", numero: 1, titulo: "Captação", cor: "virtual", rotulo: "Equipe", subitens: ["Equipe da Siga Soluções com apoio de Dr. Adeir"] },
        { id: "manutencao", numero: 2, titulo: "Manutenção e Relacionamento", cor: "autorizador", rotulo: "Equipe", subitens: ["O Farmer em Uberaba terá esta função acessória na manutenção da rede", "Equipe da Siga Soluções"] },
        { id: "sinistros", numero: 3, titulo: "Gestão de Sinistros", cor: "auditoria", rotulo: "Dr. Adeir" },
      ],
    },
  ],
  imagem_url: redeImagem,
  imagem_alt: "Médica atende paciente em clínica, com sala de exame de imagem e fisioterapia ao fundo.",
  imagem_placeholder: "Imagem da rede assistencial",
  indicadores: ["CAPTAÇÃO", "MANUTENÇÃO E RELACIONAMENTO", "GESTÃO DE SINISTROS"],
  destaque_titulo: "GESTÃO DE REDE",
  destaque_itens: ["Captação", "Manutenção e Relacionamento", "Gestão de Sinistros"],
};

export const ESCRITORIO_UBERABA: ModeloFrenteContent = {
  id: "modelo-escritorio",
  titulo: "Escritório Local",
  grupos: [
    {
      id: "escritorio-local",
      titulo: "Escritório Local",
      itens: [
        { id: "equipes", numero: 1, titulo: "Equipes", cor: "virtual", subitens: ["Farmer", "SDR", "Assistente/Secretária"] },
        { id: "estrutura", numero: 2, titulo: "Estrutura", cor: "autorizador", subitens: ["Mesas para a equipe fixa", "Mesas para a equipe em viagem", "Sala de reuniões"] },
        { id: "processos", numero: 3, titulo: "Processos", cor: "auditoria", subitens: ["Suporte ao credenciado", "Suporte ao beneficiário", "Fomento de Adesões nas empresas PJ 100+", "Atendimento a leads locais"] },
      ],
    },
  ],
  imagem_url: escritorioImagem,
  imagem_alt: "Escritório local com mesas de trabalho, atendimento na recepção e sala de reuniões envidraçada ao fundo.",
  imagem_placeholder: "Imagem do escritório local",
  indicadores: ["EQUIPES", "ESTRUTURA", "PROCESSOS"],
  destaque_titulo: "ESCRITÓRIO LOCAL",
  destaque_itens: ["Equipes", "Estrutura", "Processos"],
};
