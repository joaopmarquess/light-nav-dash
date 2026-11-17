/** Quantidade de Credenciamentos (Estudo Uberaba › Resultados Rede): Disponível e Limite vêm do helper de credenciamento; Autorizado é editado na tela e gravado neste navegador. */
import { cenarioCredenciamento, type GrupoCredenciamento } from "@/lib/uberabaCredenciamento";

export type AutorizadosCredenciamento = Partial<Record<GrupoCredenciamento, number>>;
export type LinhaQuantidadeCredenciamento = { id: GrupoCredenciamento; tipo: string; disponivel: number; autorizado: number; limite: number };

export const CHAVE_AUTORIZADOS_CREDENCIAMENTO = "uberaba.quantidadeCredenciamentos.autorizados.v1";

/** Itens de cada tipo. Especialidades médicas: as listadas no Guia Médico do Bensaúde (bensaude.com.br/guia-medico, consultado em 17/11/2026),
 * sem serviços, hospitais e profissões não médicas. Diagnóstico e terapia: itens informados pelo Dênis, com a correspondência no mesmo guia. */
export type ItemCredenciamento = { nome: string; guia?: string[] };
export const ITENS_CREDENCIAMENTO: Record<GrupoCredenciamento, ItemCredenciamento[]> = {
  medicos: [
    { nome: "Alergia e Imunologia" },
    { nome: "Alergia e Imunologia Pediátrica" },
    { nome: "Anestesiologia" },
    { nome: "Angiologia" },
    { nome: "Cardiologia" },
    { nome: "Cardiologia Pediátrica" },
    { nome: "Cirurgia Cardiovascular" },
    { nome: "Cirurgia Crânio-Maxilo-Facial" },
    { nome: "Cirurgia da Mão" },
    { nome: "Cirurgia de Cabeça e Pescoço" },
    { nome: "Cirurgia do Aparelho Digestivo" },
    { nome: "Cirurgia Geral" },
    { nome: "Cirurgia Oncológica" },
    { nome: "Cirurgia Pediátrica" },
    { nome: "Cirurgia Plástica" },
    { nome: "Cirurgia Torácica" },
    { nome: "Cirurgia Vascular" },
    { nome: "Clínica da Dor" },
    { nome: "Clínica Médica" },
    { nome: "Clínico Geral" },
    { nome: "Dermatologia" },
    { nome: "Endocrinologia" },
    { nome: "Endocrinologia Pediátrica" },
    { nome: "Fisiatria" },
    { nome: "Gastroenterologia" },
    { nome: "Gastroenterologia Pediátrica" },
    { nome: "Genética Médica" },
    { nome: "Geriatria" },
    { nome: "Ginecologia" },
    { nome: "Ginecologia e Obstetrícia" },
    { nome: "Hebiatria (Pediatra de Adolescente)" },
    { nome: "Hematologia e Hemoterapia" },
    { nome: "Hepatologia" },
    { nome: "Homeopatia" },
    { nome: "Infectologia" },
    { nome: "Mastologia" },
    { nome: "Nefrologia" },
    { nome: "Nefrologia Pediátrica" },
    { nome: "Neurocirurgia" },
    { nome: "Neurofisiologia Clínica" },
    { nome: "Neurologia" },
    { nome: "Neurologia Pediátrica" },
    { nome: "Nutrologia" },
    { nome: "Nutrologia Pediátrica" },
    { nome: "Oftalmologia" },
    { nome: "Oncologia Clínica" },
    { nome: "Ortopedia e Traumatologia" },
    { nome: "Otorrinolaringologia" },
    { nome: "Pediatria" },
    { nome: "Pneumologia" },
    { nome: "Pneumologia Pediátrica" },
    { nome: "Proctologia" },
    { nome: "Psiquiatria" },
    { nome: "Reumatologia" },
    { nome: "Urologia" },
  ],
  diagnostico: [
    { nome: "Laboratório de Análises Clínicas", guia: ["Serviço de Patologia Clínica – Laboratórios"] },
    { nome: "Laboratório de Análises Patológicas", guia: ["Serviço de Anatomia Patológica"] },
    { nome: "Serviços de Imagem", guia: ["Serviço de Radiologia", "Serviço de Ultrassom/Radiologia", "Serviço de Tomografia", "Serviço de Ressonância Magnética", "Serviço de Medicina Nuclear"] },
    { nome: "Serviços de Endoscopia/Colonoscopia", guia: ["Serviço de Diagnóstico – Endoscopia", "Serviço de Diagnóstico – Colonoscopia", "Serviço de Diagnóstico – Endoscopia e Colonoscopia"] },
  ],
  "nao-medicos": [
    { nome: "Psicologia", guia: ["Psicologia"] },
    { nome: "Fonoaudiologia", guia: ["Fonoaudiologia"] },
    { nome: "Fisioterapia", guia: ["Serviço de Fisioterapia", "Serviço de Fisioterapia Uroginecológica"] },
    { nome: "Acupuntura", guia: ["Acupuntura / Sessão"] },
  ],
};

/** Autorizado começa pelo Limite de cada tipo; valor digitado (inteiro ≥ 0) prevalece. */
export function linhasQuantidadeCredenciamentos(autorizados: AutorizadosCredenciamento = {}) {
  const disponiveis = cenarioCredenciamento("Disponível").grupos;
  const limites = cenarioCredenciamento("Limite").grupos;
  const linhas: LinhaQuantidadeCredenciamento[] = disponiveis.map((g, i) => {
    const limite = limites[i].quantidade;
    const digitado = autorizados[g.id];
    return { id: g.id, tipo: g.titulo, disponivel: g.quantidade, limite, autorizado: digitado ?? limite };
  });
  const total = { disponivel: linhas.reduce((s, l) => s + l.disponivel, 0), autorizado: linhas.reduce((s, l) => s + l.autorizado, 0) };
  return { linhas, total };
}

/** Converte o texto digitado: vazio restaura o Limite (undefined); só inteiros não negativos são aceitos. */
export function lerAutorizado(texto: string): number | undefined | null {
  const t = texto.trim();
  if (t === "") return undefined;
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

export function carregarAutorizados(): AutorizadosCredenciamento {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_AUTORIZADOS_CREDENCIAMENTO) ?? "{}");
    const saida: AutorizadosCredenciamento = {};
    for (const id of ["medicos", "diagnostico", "nao-medicos"] as const) if (Number.isInteger(bruto?.[id]) && bruto[id] >= 0) saida[id] = bruto[id];
    return saida;
  } catch { return {}; }
}

export function salvarAutorizados(valores: AutorizadosCredenciamento) {
  try { localStorage.setItem(CHAVE_AUTORIZADOS_CREDENCIAMENTO, JSON.stringify(valores)); } catch { /* navegador sem armazenamento */ }
}
