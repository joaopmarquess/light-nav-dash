/** Coparticipação do Plano Proposto Unificado 2027 (tabela fornecida em 09/11/2026), com limites editáveis gravados no navegador. */
export type LinhaCopart = { n: number; g: string; nota?: string; s: string; f: string; p: string; limite: number };

const T399 = "(De 0 a 399 CHs**)", T400 = "(A partir de 400 CHs**)";
export const COPART_PROPOSTA_2027: LinhaCopart[] = [
  { n: 1, g: "Consultas", s: "Consulta", f: "Por Consulta", p: "-", limite: 43.47 },
  { n: 2, g: "Consulta Oftalmológica + Pacote de Exames Baixo Custo*", s: "Consulta Oftalmológica + Pacote de Exames Baixo Custo*", f: "Por Consulta Oftalmológica + Pacote de Exames Baixo Custo*", p: "-", limite: 88.06 },
  { n: 3, g: "Emergência", s: "Emergência", f: "Por Atendimento", p: "-", limite: 88.06 },
  { n: 4, g: "Internação", s: "Internação", f: "Por Internação", p: "-", limite: 277.57 },
  { n: 5, g: "Ressonância", nota: T400, s: "Ressonância", f: "Por Ressonância", p: "50%", limite: 277.57 },
  { n: 6, g: "Tomografia", nota: T400, s: "Tomografia", f: "Por Tomografia", p: "50%", limite: 277.57 },
  { n: 7, g: "Ultrassom", nota: T399, s: "Ultrassom", f: "Por Ultrassom", p: "50%", limite: 88.06 },
  { n: 8, g: "Exames e Procedimentos", nota: T399, s: "Exames e Procedimentos", f: "Por Exame e/ou Procedimento Ambulatorial", p: "50%", limite: 88.06 },
  { n: 9, g: "Exames e Procedimentos Especiais", nota: T400, s: "Exames e Procedimentos Especiais", f: "Por Exame e/ou Procedimento Ambulatorial", p: "50%", limite: 277.57 },
  ...["Acupuntura", "Fisioterapia", "Fonoaudiologia", "Terapia Ocupacional", "Psicoterapia"].map((s) => ({ n: 10, g: "Terapias", nota: T399, s, f: "Por Sessão", p: "50%", limite: 88.06 })),
  { n: 11, g: "Terapias Especiais", nota: T400, s: "Terapias Especiais", f: "Por Sessão", p: "50%", limite: 277.57 },
  { n: 12, g: "Alta Complexidade", s: "Medicamentos Antineoplásicos e de Efeitos Adversos/Imunobiológicos", f: "Por Medicamento Dispensado", p: "50%", limite: 555.15 },
  ...["Hemodiálise/diálise", "Quimioterapia", "Radioterapia"].map((s) => ({ n: 12, g: "Alta Complexidade", s, f: "Por Mês de Execução", p: "50%", limite: 555.15 })),
];

export const NOTAS_COPART_2027 = [
  "* Os exames incluídos no pacote são os listados a seguir e serão executados com base na necessidade e quantidade requisitada pelo médico assistente: a) Avaliação de Vias Lacrimais (Teste de Schirmer) – Monocular; b) Curva Tensional Diária – Binocular; c) Exame de Motilidade Ocular (Teste Ortóptico) – Binocular; d) Fundoscopia Sob Medriases – Binocular; e) Gonioscopia – Binocular; f) Mapeamento de Retina (Oftalmoscopia Indireta) – Monocular; g) Oftalmodinamometria – Monocular; h) Potencial de Acuidade Visual – Monocular; i) Potencial Evocado Visual (PEV); j) Retinografia Monocular; k) Teste do Reflexo Vermelho em Recém Nato (Teste Do Olhinho); l) Tonometria – Binocular; m) Visão Subnormal – Monocular.",
  "** CHs é a sigla para Coeficiente de Honorários – utilizada como unidade básica para o cálculo dos honorários pago pela OPERADORA ao profissional prestador de serviços assistenciais.",
];

export const chaveCopart = (l: Pick<LinhaCopart, "n" | "s">) => `${l.n}|${l.s}`;
/** Somente o grupo 12 (Alta Complexidade) tem percentual de coparticipação editável. */
export const GRUPO_PCT_EDITAVEL = 12;
export const pctEditavel = (l: Pick<LinhaCopart, "n">) => l.n === GRUPO_PCT_EDITAVEL;
export const chavePct = (l: Pick<LinhaCopart, "n" | "s">) => `pct|${chaveCopart(l)}`;
const pctNum = (p: string) => Number(p.replace("%", "").replace(",", "."));
/** Valores gravados: limites em R$ (chave n|subgrupo) e percentuais do grupo 12 (chave pct|n|subgrupo). */
export type LimitesCopart = Record<string, number>;
export const LIMITES_PADRAO: LimitesCopart = Object.fromEntries([
  ...COPART_PROPOSTA_2027.map((l) => [chaveCopart(l), l.limite]),
  ...COPART_PROPOSTA_2027.filter(pctEditavel).map((l) => [chavePct(l), pctNum(l.p)]),
]);

const KEY = "apb-copart-limites-2027-v1";
type StorageApb = Pick<Storage, "getItem" | "setItem">;
const validoK = (k: string, v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && (!k.startsWith("pct|") || v <= 100);

/** Lê os limites gravados; linhas ausentes ou inválidas ficam com o valor da tabela fornecida. */
export function lerLimitesCopart(storage: StorageApb): LimitesCopart {
  const out = { ...LIMITES_PADRAO };
  try {
    const saved = JSON.parse(storage.getItem(KEY) ?? "null");
    if (saved && typeof saved === "object") for (const k of Object.keys(out)) if (validoK(k, saved[k])) out[k] = saved[k];
  } catch { /* Manter a tabela fornecida se o armazenamento estiver indisponível ou inválido. */ }
  return out;
}

export function gravarLimitesCopart(storage: StorageApb, limites: LimitesCopart): LimitesCopart {
  const out: LimitesCopart = {};
  for (const k of Object.keys(LIMITES_PADRAO)) {
    if (!validoK(k, limites[k])) throw new Error("Valores inválidos");
    out[k] = Math.round(limites[k] * 100) / 100;
  }
  storage.setItem(KEY, JSON.stringify(out));
  return out;
}

export const linhasComLimites = (limites: LimitesCopart): LinhaCopart[] =>
  COPART_PROPOSTA_2027.map((l) => ({ ...l, limite: limites[chaveCopart(l)] ?? l.limite, p: pctEditavel(l) && limites[chavePct(l)] != null ? `${fmtPct(limites[chavePct(l)])}%` : l.p }));

export const fmtLimite = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtPct = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
