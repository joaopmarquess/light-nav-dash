import fachada from "@/assets/hospital-palmerio-v3-fachada.asset.json";
import assistencia from "@/assets/hospital-palmerio-v3-assistencia.asset.json";

export type HospitalInstitucional = {
  nome: string; nome_completo: string; tipo_prestador: string; resumo_institucional: string;
  papel_no_projeto: string; quantidade_leitos: number; atendimento_24h: boolean;
  percentual_leitos_sus: number; ano_hospital_ensino: number;
  servicos_assistenciais: string; servicos_alta_complexidade: string; servicos_diagnostico: string;
  endereco: string; telefone: string; site: string;
  imagem_fachada_url: string | null; imagem_assistencial_url: string | null;
  imagem_panorama_url: string | null; logo_url: string | null;
  status_negociacao: string | null; observacao: string;
};

export const HOSPITAL_PALMERIO: HospitalInstitucional = {
  nome: "Mário Palmério", nome_completo: "Hospital Mário Palmério", tipo_prestador: "Hospital Universitário",
  resumo_institucional: "A estrutura do Hospital Mário Palmério é considerada no Bensaúde Uberba como um ponto de sustentação para a formação da rede assistencial complementar e para a construção da proposta de valor do Bensaúde na cidade.",
  papel_no_projeto: "Referência hospitalar para apoiar a rede assistencial, a proposta de valor e a credibilidade local da implantação.",
  quantidade_leitos: 220, atendimento_24h: true, percentual_leitos_sus: 60, ano_hospital_ensino: 2015,
  servicos_assistenciais: "Clínica médica e cirúrgica, ginecologia e obstetrícia, ortopedia e pediatria.",
  servicos_alta_complexidade: "Transplante renal, hemodiálise, UTI adulto e neonatal.",
  servicos_diagnostico: "Laboratório e imagem, incluindo tomografia, ultrassonografia, raio-X e mamografia.",
  endereco: "Av. Nenê Sabino, 2477\nSantos Dumont\nUberaba/MG", telefone: "(34) 3352-1700", site: "mphu.uniube.br",
  imagem_fachada_url: fachada.url, imagem_assistencial_url: assistencia.url, imagem_panorama_url: null, logo_url: null,
  status_negociacao: null,
  observacao: "As informações apresentadas possuem finalidade institucional e de planejamento do Bensaúde Uberba. A inclusão definitiva do Hospital Mário Palmério na rede do Bensaúde dependerá da conclusão das negociações e da formalização dos instrumentos correspondentes.",
};
