/** Credenciamento (Estudo Uberaba › Resultados Rede): Disponível e Limite vêm do helper de credenciamento; Autorizado é editado na tela e gravado neste navegador. */
import { cenarioCredenciamento, type GrupoCredenciamento } from "@/lib/uberabaCredenciamento";

/** Tipos do grid: os três grupos de credenciamento mais Hospitais (pedido de 18/11/2026), que existe só nesta tela e não tem Disponível na referência. */
export type TipoQuantidade = GrupoCredenciamento | "hospitais";
export type AutorizadosCredenciamento = Partial<Record<TipoQuantidade, number>>;
export type LinhaQuantidadeCredenciamento = { id: TipoQuantidade; tipo: string; disponivel: number | null; autorizado: number; limite: number; valor: number; adesao: number };
/** Valor (R$) por credenciado de cada tipo, editado na tela (pedido de 18/11/2026); Adesão = Qtde. (Autorizado) × Valor. */
export type ValoresCredenciamento = Partial<Record<TipoQuantidade, number>>;
export const CHAVE_VALORES_CREDENCIAMENTO = "uberaba.quantidadeCredenciamentos.valores.v1";
/** Valor padrão por credenciamento (pedido de 18/11/2026): R$ 300,00 em todos os tipos, inclusive Hospitais;
 * o valor unitário do Modelo de Credenciamento (referência) não muda. */
export const VALOR_PADRAO_CREDENCIAMENTO = 300;
export const VALOR_PADRAO_HOSPITAIS = VALOR_PADRAO_CREDENCIAMENTO;
export const TIPO_HOSPITAIS = "Hospitais";

export const CHAVE_AUTORIZADOS_CREDENCIAMENTO = "uberaba.quantidadeCredenciamentos.autorizados.v1";

/** Itens de cada tipo. Especialidades médicas: as listadas no Guia Médico do Bensaúde (bensaude.com.br/guia-medico, consultado em 17/11/2026),
 * sem serviços, hospitais e profissões não médicas. Diagnóstico e terapia: itens informados pelo Dênis, com a correspondência no mesmo guia. */
export type ItemCredenciamento = { nome: string; guia?: string[] };
export const ITENS_CREDENCIAMENTO: Record<TipoQuantidade, ItemCredenciamento[]> = {
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
  hospitais: [
    { nome: "Hospital Geral" },
    { nome: "Hospital Pediátrico" },
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
export function itensExibidos(grupo: TipoQuantidade): ItemExibidoCredenciamento[] {
  return agruparFixos(agruparPediatricas(ITENS_CREDENCIAMENTO[grupo]));
}
/** Notas de rodapé dos agrupamentos que aparecem na lista. */
export function notasAgrupamento(): string[] {
  const nomes = new Set((Object.keys(ITENS_CREDENCIAMENTO) as TipoQuantidade[]).flatMap((g) => itensExibidos(g).map((i) => i.nome)));
  return [NOTA_PEDIATRICA, ...AGRUPAMENTOS_ESPECIALIDADES.filter((g) => nomes.has(`${g.alvo}**`)).map((g) => g.nota)];
}

/** Autorizado começa pelo Limite de cada tipo; valor digitado (inteiro ≥ 0) prevalece. */
/** Autorizado padrão de Hospitais: Hospital Geral (1) + Hospital Pediátrico (1). */
export const AUTORIZADO_PADRAO_HOSPITAIS = 2;
/** Qtde. padrão de Especialidades médicas (pedido de 18/11/2026): 200, no lugar do Limite; a diferença para os itens vai ao Ajuste técnico. */
export const AUTORIZADO_PADRAO_MEDICOS = 200;
export function linhasQuantidadeCredenciamentos(autorizados: AutorizadosCredenciamento = {}, valores: ValoresCredenciamento = {}) {
  const disponiveis = cenarioCredenciamento("Disponível").grupos;
  const limites = cenarioCredenciamento("Limite").grupos;
  const grupos: LinhaQuantidadeCredenciamento[] = disponiveis.map((g, i) => {
    const limite = g.id === "medicos" ? AUTORIZADO_PADRAO_MEDICOS : limites[i].quantidade;
    const digitado = autorizados[g.id];
    const autorizado = digitado ?? limite;
    const valor = valores[g.id] ?? VALOR_PADRAO_CREDENCIAMENTO;
    return { id: g.id, tipo: g.titulo, disponivel: g.quantidade, limite, autorizado, valor, adesao: arred2(autorizado * valor) };
  });
  // Hospitais logo após Especialidades médicas; sem Disponível de referência, Autorizado começa pela soma dos itens padrão.
  const limiteHosp = AUTORIZADO_PADRAO_HOSPITAIS;
  const autorizadoHosp = autorizados.hospitais ?? limiteHosp;
  const valorHosp = valores.hospitais ?? VALOR_PADRAO_HOSPITAIS;
  const hospitais: LinhaQuantidadeCredenciamento = { id: "hospitais", tipo: TIPO_HOSPITAIS, disponivel: null, limite: limiteHosp, autorizado: autorizadoHosp, valor: valorHosp, adesao: arred2(autorizadoHosp * valorHosp) };
  const pos = grupos.findIndex((l) => l.id === "medicos") + 1;
  const linhas = [...grupos.slice(0, pos), hospitais, ...grupos.slice(pos)];
  const total = { disponivel: linhas.reduce((s, l) => s + (l.disponivel ?? 0), 0), autorizado: linhas.reduce((s, l) => s + l.autorizado, 0), adesao: arred2(linhas.reduce((s, l) => s + l.adesao, 0)) };
  return { linhas, total };
}

/** Converte o texto digitado: vazio restaura o Limite (undefined); só inteiros não negativos são aceitos. */
export function lerAutorizado(texto: string): number | undefined | null {
  const t = texto.trim();
  if (t === "") return undefined;
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

const arred2 = (v: number) => Math.round(v * 100) / 100;

/** Valor digitado em reais ("200", "200,50", "1.250,00"): vazio restaura o padrão (undefined); inválido ou negativo é recusado (null). */
export function lerValor(texto: string): number | undefined | null {
  const t = texto.trim();
  if (t === "") return undefined;
  if (!/^\d{1,3}(\.\d{3})*(,\d{0,2})?$|^\d+(,\d{0,2})?$/.test(t)) return null;
  return Number(t.replace(/\./g, "").replace(",", "."));
}

/** Ícone Replicar (pedido de 18/11/2026): copia o Valor atual de Especialidades médicas (digitado ou padrão) para todos os tipos. */
export function replicarValorEspecialidades(valores: ValoresCredenciamento): ValoresCredenciamento {
  const origem = linhasQuantidadeCredenciamentos({}, valores).linhas.find((l) => l.id === "medicos")!.valor;
  return Object.fromEntries((["medicos", "hospitais", "diagnostico", "nao-medicos"] as const).map((id) => [id, origem])) as ValoresCredenciamento;
}

export function carregarValores(): ValoresCredenciamento {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_VALORES_CREDENCIAMENTO) ?? "{}");
    const saida: ValoresCredenciamento = {};
    for (const id of ["medicos", "hospitais", "diagnostico", "nao-medicos"] as const) if (typeof bruto?.[id] === "number" && Number.isFinite(bruto[id]) && bruto[id] >= 0) saida[id] = bruto[id];
    return saida;
  } catch { return {}; }
}

/** Avisado a cada gravação de Qtde. ou Valor, para o Resultado de Resultados Rede reler a Adesão. */
export const EVENTO_CREDENCIAMENTO = "uberaba-credenciamento-alterado";
const avisarCredenciamento = () => { try { globalThis.dispatchEvent?.(new Event(EVENTO_CREDENCIAMENTO)); } catch { /* sem janela */ } };

export function salvarValores(valores: ValoresCredenciamento) {
  try { localStorage.setItem(CHAVE_VALORES_CREDENCIAMENTO, JSON.stringify(valores)); } catch { /* navegador sem armazenamento */ }
  avisarCredenciamento();
}

export function carregarAutorizados(): AutorizadosCredenciamento {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_AUTORIZADOS_CREDENCIAMENTO) ?? "{}");
    const saida: AutorizadosCredenciamento = {};
    for (const id of ["medicos", "hospitais", "diagnostico", "nao-medicos"] as const) if (Number.isInteger(bruto?.[id]) && bruto[id] >= 0) saida[id] = bruto[id];
    return saida;
  } catch { return {}; }
}

export function salvarAutorizados(valores: AutorizadosCredenciamento) {
  try { localStorage.setItem(CHAVE_AUTORIZADOS_CREDENCIAMENTO, JSON.stringify(valores)); } catch { /* navegador sem armazenamento */ }
  avisarCredenciamento();
}

/** Quantidade digitada em cada linha expandida (item exibido), gravada neste navegador; chave `grupo:nome exibido`. Não altera Disponível nem Autorizado do tipo. */
export type QuantidadesItens = Record<string, number>;
export const CHAVE_QUANTIDADES_ITENS = "uberaba.quantidadeCredenciamentos.itens.v1";
export const chaveItem = (grupo: TipoQuantidade, nome: string) => `${grupo}:${nome}`;
/** Quantidade padrão de cada item (pedido de 17/11/2026): 2 por especialidade médica e 1 para os demais itens. */
export const QUANTIDADE_PADRAO_ITEM: Record<TipoQuantidade, number> = { medicos: 2, hospitais: 1, diagnostico: 1, "nao-medicos": 1 };
/** Quantidade do item: a digitada prevalece; sem digitação, o padrão do tipo. */
export function quantidadeItem(grupo: TipoQuantidade, nome: string, valores: QuantidadesItens) {
  return valores[chaveItem(grupo, nome)] ?? QUANTIDADE_PADRAO_ITEM[grupo];
}
/** Soma das quantidades dos itens do tipo (digitadas ou padrão), quantos itens há e quantos foram alterados. */
export function somaItens(grupo: TipoQuantidade, valores: QuantidadesItens) {
  const itens = itensExibidos(grupo);
  return {
    soma: itens.reduce((s, i) => s + quantidadeItem(grupo, i.nome, valores), 0),
    itens: itens.length,
    alterados: itens.filter((i) => valores[chaveItem(grupo, i.nome)] !== undefined).length,
  };
}
/** Linha "Ajuste técnico" das Especialidades médicas: Qtde. do tipo − soma dos itens (2 por especialidade, ou o digitado); outros tipos não têm ajuste. */
export const AJUSTE_TECNICO = "Ajuste técnico";
export function ajusteTecnico(grupo: TipoQuantidade, qtde: number, valores: QuantidadesItens): number | null {
  return grupo === "medicos" ? qtde - somaItens(grupo, valores).soma : null;
}
/** Atualiza um item a partir do texto: vazio restaura o padrão; texto inválido não altera (null). */
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

/** Ícone "Restaurar padrão" do Credenciamento (19/11/2026): apaga Qtde., Valor e quantidades dos itens digitadas; tudo volta ao padrão. */
export function restaurarCredenciamento() {
  salvarQuantidadesItens({});
  salvarValores({});
  salvarAutorizados({});
}
