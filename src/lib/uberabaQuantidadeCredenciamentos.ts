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

/** Item exibido na tela: "X*" reúne "X" e "X Pediátrica" (pedido de 17/11/2026); `inclui` lista os nomes originais reunidos. */
export type ItemExibidoCredenciamento = ItemCredenciamento & { inclui?: string[] };
export const NOTA_PEDIATRICA = "* Inclui também a especialidade pediátrica correspondente.";
/** Agrupa cada "X Pediátrica" sob o nome genérico "X*" quando "X" existe na lista; sem genérica (ex.: Cirurgia Pediátrica), fica separada. */
export function agruparPediatricas(itens: ItemCredenciamento[]): ItemExibidoCredenciamento[] {
  const nomes = new Set(itens.map((i) => i.nome));
  const pediatricaDe = (nome: string) => { const m = /^(.*) Pediátrica$/.exec(nome); return m && nomes.has(m[1]) ? m[1] : null; };
  return itens.filter((i) => !pediatricaDe(i.nome)).map((i) => {
    const ped = `${i.nome} Pediátrica`;
    return nomes.has(ped) ? { ...i, nome: `${i.nome}*`, inclui: [i.nome, ped] } : i;
  });
}
/** Agrupamentos informados pelo Dênis (17/11/2026): Clínica Médica fica dentro de Clínico Geral, marcado com "**". */
export const AGRUPAMENTOS_ESPECIALIDADES: { alvo: string; inclui: string[]; nota: string }[] = [
  { alvo: "Clínico Geral", inclui: ["Clínica Médica"], nota: "** Inclui também Clínica Médica." },
];
function agruparFixos(itens: ItemExibidoCredenciamento[]): ItemExibidoCredenciamento[] {
  const nomes = new Set(itens.map((i) => i.nome));
  const ativos = AGRUPAMENTOS_ESPECIALIDADES.filter((g) => nomes.has(g.alvo) && g.inclui.some((n) => nomes.has(n)));
  const removidos = new Set(ativos.flatMap((g) => g.inclui));
  return itens.filter((i) => !removidos.has(i.nome)).map((i) => {
    const g = ativos.find((x) => x.alvo === i.nome);
    return g ? { ...i, nome: `${i.nome}**`, inclui: [i.nome, ...g.inclui.filter((n) => nomes.has(n))] } : i;
  });
}
export function itensExibidos(grupo: GrupoCredenciamento): ItemExibidoCredenciamento[] {
  return agruparFixos(agruparPediatricas(ITENS_CREDENCIAMENTO[grupo]));
}
/** Notas de rodapé dos agrupamentos que aparecem na lista. */
export function notasAgrupamento(): string[] {
  const nomes = new Set((Object.keys(ITENS_CREDENCIAMENTO) as GrupoCredenciamento[]).flatMap((g) => itensExibidos(g).map((i) => i.nome)));
  return [NOTA_PEDIATRICA, ...AGRUPAMENTOS_ESPECIALIDADES.filter((g) => nomes.has(`${g.alvo}**`)).map((g) => g.nota)];
}

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

/** Quantidade digitada em cada linha expandida (item exibido), gravada neste navegador; chave `grupo:nome exibido`. Não altera Disponível nem Autorizado do tipo. */
export type QuantidadesItens = Record<string, number>;
export const CHAVE_QUANTIDADES_ITENS = "uberaba.quantidadeCredenciamentos.itens.v1";
export const chaveItem = (grupo: GrupoCredenciamento, nome: string) => `${grupo}:${nome}`;
/** Soma das quantidades digitadas nos itens do tipo e quantos itens foram preenchidos. */
export function somaItens(grupo: GrupoCredenciamento, valores: QuantidadesItens) {
  const preenchidos = itensExibidos(grupo).map((i) => valores[chaveItem(grupo, i.nome)]).filter((v): v is number => v !== undefined);
  return { soma: preenchidos.reduce((s, v) => s + v, 0), preenchidos: preenchidos.length };
}
/** Atualiza um item a partir do texto: vazio apaga; texto inválido não altera (null). */
export function alterarItem(valores: QuantidadesItens, chave: string, texto: string): QuantidadesItens | null {
  const v = lerAutorizado(texto);
  if (v === null) return null;
  const proximo = { ...valores };
  if (v === undefined) delete proximo[chave]; else proximo[chave] = v;
  return proximo;
}
export function carregarQuantidadesItens(): QuantidadesItens {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_QUANTIDADES_ITENS) ?? "{}");
    return Object.fromEntries(Object.entries(bruto ?? {}).filter(([, v]) => Number.isInteger(v) && (v as number) >= 0)) as QuantidadesItens;
  } catch { return {}; }
}
export function salvarQuantidadesItens(valores: QuantidadesItens) {
  try { localStorage.setItem(CHAVE_QUANTIDADES_ITENS, JSON.stringify(valores)); } catch { /* navegador sem armazenamento */ }
}
