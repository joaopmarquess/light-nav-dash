// Tabelas comerciais do Modelo de Atuação: cada frente = Referência × índice da frente.
export const FAIXAS = ["00 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 ou +"] as const;

/** Enfermaria da tabela Referência, em centavos. */
export const REFERENCIA_ENFERMARIA_CENTAVOS = [17500, 20422, 23832, 26262, 30646, 35027, 42907, 53504, 70999, 104970];

export type FrenteId = "pcaAdm" | "pceAdm" | "pce100";
export type Indices = Record<FrenteId, number>;

/** Índices padrão (% da Referência). */
export const INDICES_PADRAO: Indices = { pcaAdm: 90, pceAdm: 80, pce100: 70 };

export type LinhaTabela = { faixa: string; enfermariaCentavos: number; apartamentoCentavos: number };

/** Fator padrão do Apartamento sobre a Enfermaria (editável por tabela na tela). */
export const FATOR_APARTAMENTO_PADRAO = 1.25;
export type Fatores = Record<FrenteId, number>;
export const FATORES_PADRAO: Fatores = { pcaAdm: FATOR_APARTAMENTO_PADRAO, pceAdm: FATOR_APARTAMENTO_PADRAO, pce100: FATOR_APARTAMENTO_PADRAO };
export const FATOR_MIN = 1;
export const FATOR_MAX = 3;

/** Apartamento = TRUNCAR(Enfermaria × fator; 2), em centavos inteiros (sem erro de arredondamento). */
export const apartamentoDe = (enfermariaCentavos: number, fator: number = FATOR_APARTAMENTO_PADRAO) =>
  Math.floor((enfermariaCentavos * Math.round(fator * 10000)) / 10000);

/** Enfermaria = ARRED(Referência × índice; 2); Apartamento = TRUNCAR(Enfermaria × fator; 2). */
export function tabelaIndexada(indicePercentual: number, fator: number = FATOR_APARTAMENTO_PADRAO): LinhaTabela[] {
  return FAIXAS.map((faixa, i) => {
    const enf = Math.round((REFERENCIA_ENFERMARIA_CENTAVOS[i] * Math.round(indicePercentual * 100)) / 10000);
    return { faixa, enfermariaCentavos: enf, apartamentoCentavos: apartamentoDe(enf, fator) };
  });
}

/** Aceita "1,25" ou "1.25" (até 4 casas); devolve null fora de 1–3. */
export function parseFator(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < FATOR_MIN || n > FATOR_MAX) return null;
  return n;
}
export const formatarFator = (f: number) => f.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const CHAVE_FATORES = "uberaba-tabelas-comerciais-fator-apartamento-v1";
export function lerFatores(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): Fatores {
  const out = { ...FATORES_PADRAO };
  try {
    const salvo = JSON.parse(storage?.getItem(CHAVE_FATORES) ?? "null");
    if (!salvo || typeof salvo !== "object") return out;
    (Object.keys(out) as FrenteId[]).forEach((k) => {
      const v = salvo[k];
      if (typeof v === "number" && v >= FATOR_MIN && v <= FATOR_MAX) out[k] = v;
    });
  } catch { /* volta ao padrão */ }
  return out;
}
export function gravarFatores(v: Fatores, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try { storage?.setItem(CHAVE_FATORES, JSON.stringify(v)); } catch { /* armazenamento indisponível */ }
}

export const tabelaReferencia = () => tabelaIndexada(100);

export const formatarCentavos = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Aceita "90", "87,5" ou "87.5"; devolve null fora de 0–200. */
export function parseIndice(texto: string): number | null {
  const t = texto.trim().replace("%", "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 200) return null;
  return Math.round(n * 100) / 100;
}

const CHAVE = "uberaba-tabelas-comerciais-indices-v1";

export function lerIndices(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): Indices {
  try {
    const salvo = JSON.parse(storage?.getItem(CHAVE) ?? "null");
    if (!salvo || typeof salvo !== "object") return { ...INDICES_PADRAO };
    const out = { ...INDICES_PADRAO };
    (Object.keys(out) as FrenteId[]).forEach((k) => {
      const v = salvo[k];
      if (typeof v === "number" && v >= 0 && v <= 200) out[k] = v;
    });
    return out;
  } catch {
    return { ...INDICES_PADRAO };
  }
}

export function gravarIndices(indices: Indices, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try { storage?.setItem(CHAVE, JSON.stringify(indices)); } catch { /* armazenamento indisponível */ }
}

// ---------- Indicadores variáveis (por frente, editáveis) ----------
/** Campos editáveis (células amarelas da planilha), em %. */
export type Indicadores = { spread: number; coAdministradora: number; contratual: number; promocional: number; adesao: number };
export type CampoIndicador = keyof Indicadores;

/** Padrão informado pelo usuário para PCA Adm. e PCE Adm. */
export const INDICADORES_PADRAO: Indicadores = { spread: 23, coAdministradora: 4, contratual: 90, promocional: 150, adesao: 99 };

/**
 * Modelo de participação por frente:
 * - "administradora": Spread editável; Operadora = 100 − Spread; Administradora = Spread − Agenciadora; com Taxa de adesão.
 * - "vitalicio" (PCE 100+): Vitalício editável (guardado em `spread`); Operadora = 100 − Vitalício; Agenciadora = Vitalício; sem Taxa de adesão.
 */
export type ModeloIndicadores = "administradora" | "vitalicio";
export const MODELO_INDICADORES: Record<FrenteId, ModeloIndicadores> = { pcaAdm: "administradora", pceAdm: "administradora", pce100: "vitalicio" };

/** Padrões por frente; PCE 100+ segue a planilha própria (Vitalício 5%, Contratual 90%, Promocional 100%). */
export const INDICADORES_PADRAO_POR_FRENTE: Record<FrenteId, Indicadores> = {
  pcaAdm: { ...INDICADORES_PADRAO },
  pceAdm: { ...INDICADORES_PADRAO },
  pce100: { spread: 5, coAdministradora: 0, contratual: 90, promocional: 100, adesao: 0 },
};

/** Limites aceitos por campo (%). */
export const LIMITES_INDICADOR: Record<CampoIndicador, number> = { spread: 100, coAdministradora: 100, contratual: 500, promocional: 500, adesao: 100 };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Operadora = 100% − Spread; Administradora = Spread − Agenciadora. */
export function derivarIndicadores(i: Indicadores) {
  return { operadora: r2(100 - i.spread), administradora: r2(i.spread - i.coAdministradora) };
}

/** PCE 100+: Operadora = 100% − Vitalício; Agenciadora = Vitalício. */
export function derivarVitalicio(i: Indicadores) {
  return { operadora: r2(100 - i.spread), agenciadora: r2(i.spread) };
}

/** Aceita "23", "4,5" ou "4.5"; devolve null fora de 0 – limite do campo. */
export function parseIndicador(campo: CampoIndicador, texto: string): number | null {
  const t = texto.trim().replace("%", "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > LIMITES_INDICADOR[campo]) return null;
  return Math.round(n * 100) / 100;
}

export const formatarPercentual = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export type IndicadoresPorFrente = Record<FrenteId, Indicadores>;
const CHAVE_INDICADORES = "uberaba-tabelas-comerciais-indicadores-v2";
/** v1 tinha o modelo antigo também em PCE 100+; dela só se aproveitam PCA Adm. e PCE Adm. */
const CHAVE_INDICADORES_V1 = "uberaba-tabelas-comerciais-indicadores-v1";
const FRENTE_IDS: FrenteId[] = ["pcaAdm", "pceAdm", "pce100"];
export const indicadoresPadrao = (): IndicadoresPorFrente =>
  Object.fromEntries(FRENTE_IDS.map((id) => [id, { ...INDICADORES_PADRAO_POR_FRENTE[id] }])) as IndicadoresPorFrente;

export function lerIndicadores(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): IndicadoresPorFrente {
  const out = indicadoresPadrao();
  try {
    let salvo = JSON.parse(storage?.getItem(CHAVE_INDICADORES) ?? "null");
    if (!salvo || typeof salvo !== "object") {
      const v1 = JSON.parse(storage?.getItem(CHAVE_INDICADORES_V1) ?? "null");
      salvo = v1 && typeof v1 === "object" ? { pcaAdm: v1.pcaAdm, pceAdm: v1.pceAdm } : null;
    }
    if (!salvo || typeof salvo !== "object") return out;
    FRENTE_IDS.forEach((id) => {
      const s = salvo[id];
      if (!s || typeof s !== "object") return;
      (Object.keys(INDICADORES_PADRAO) as CampoIndicador[]).forEach((c) => {
        const v = s[c];
        if (typeof v === "number" && v >= 0 && v <= LIMITES_INDICADOR[c]) out[id][c] = v;
      });
    });
  } catch { /* volta ao padrão */ }
  return out;
}

export function gravarIndicadores(v: IndicadoresPorFrente, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try { storage?.setItem(CHAVE_INDICADORES, JSON.stringify(v)); } catch { /* armazenamento indisponível */ }
}

// ---------- Quadros das frentes (tela e Proposta Comercial) ----------
/** Nome e segmento de cada frente, na ordem da tela. */
export const FRENTES_COMERCIAIS: { id: FrenteId; titulo: string; segmento: string }[] = [
  { id: "pcaAdm", titulo: "PCA Adm.", segmento: "ADESÃO" },
  { id: "pceAdm", titulo: "PCE Adm.", segmento: "MÉDIAS EMPRESAS" },
  { id: "pce100", titulo: "PCE 100+", segmento: "GRANDES EMPRESAS" },
];

// ---------- Nome e segmento de cada quadro (redigitáveis na tela) ----------
export type Rotulos = { titulo: string; segmento: string };
export type RotulosPorFrente = Record<FrenteId, Rotulos>;
export const ROTULO_MAX = 40;
export const rotulosPadrao = (): RotulosPorFrente =>
  Object.fromEntries(FRENTES_COMERCIAIS.map((f) => [f.id, { titulo: f.titulo, segmento: f.segmento }])) as RotulosPorFrente;
/** Uma linha só: espaços/quebras colapsados, limite de tamanho; vazio volta ao padrão. */
export function normalizarRotulo(texto: unknown, padrao: string): string {
  if (typeof texto !== "string") return padrao;
  const t = texto.replace(/\s+/g, " ").trim().slice(0, ROTULO_MAX).trim();
  return t || padrao;
}
const CHAVE_ROTULOS = "uberaba-tabelas-comerciais-rotulos-v1";
/** Padrão gravado pelo usuário (ícone ao lado do nome); sem gravação, valem os nomes originais. */
const CHAVE_ROTULOS_PADRAO = "uberaba-tabelas-comerciais-rotulos-padrao-v1";
const lerRotulosDe = (storage: Pick<Storage, "getItem"> | undefined, chave: string, base: RotulosPorFrente): RotulosPorFrente => {
  const out: RotulosPorFrente = JSON.parse(JSON.stringify(base));
  try {
    const salvo = JSON.parse(storage?.getItem(chave) ?? "null");
    if (!salvo || typeof salvo !== "object") return out;
    FRENTE_IDS.forEach((id) => {
      const s = salvo[id];
      if (!s || typeof s !== "object") return;
      (Object.keys(out[id]) as (keyof Rotulos)[]).forEach((c) => { out[id][c] = normalizarRotulo(s[c], out[id][c]); });
    });
  } catch { /* volta ao padrão */ }
  return out;
};
export function lerPadraoRotulos(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): RotulosPorFrente {
  return lerRotulosDe(storage, CHAVE_ROTULOS_PADRAO, rotulosPadrao());
}
export function gravarPadraoRotulos(v: RotulosPorFrente, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try { storage?.setItem(CHAVE_ROTULOS_PADRAO, JSON.stringify(v)); } catch { /* armazenamento indisponível */ }
}
/** Nomes atuais; o que não estiver gravado segue o padrão gravado (ou o original). */
export function lerRotulos(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): RotulosPorFrente {
  return lerRotulosDe(storage, CHAVE_ROTULOS, lerPadraoRotulos(storage));
}
export function gravarRotulos(v: RotulosPorFrente, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try { storage?.setItem(CHAVE_ROTULOS, JSON.stringify(v)); } catch { /* armazenamento indisponível */ }
}

export type LinhaIndicadorBloco = { rotulo: string; valor: number; campo?: CampoIndicador; formula?: string };
export type BlocoIndicadores = { titulo: string; linhas: LinhaIndicadorBloco[] };

/** Blocos de Indicadores variáveis de uma frente (Participação, Agenciamento e, quando houver, Taxa de adesão). */
export function blocosIndicadores(id: FrenteId, i: Indicadores): BlocoIndicadores[] {
  const agenciamento: BlocoIndicadores = { titulo: "Agenciamento", linhas: [
    { rotulo: "Contratual", campo: "contratual", valor: i.contratual },
    { rotulo: "Promocional", campo: "promocional", valor: i.promocional },
  ] };
  if (MODELO_INDICADORES[id] === "vitalicio") {
    const v = derivarVitalicio(i);
    return [
      { titulo: "Participação", linhas: [
        { rotulo: "Vitalício", campo: "spread", valor: i.spread },
        { rotulo: "Operadora", valor: v.operadora, formula: "100% − Vitalício" },
        { rotulo: "Agenciadora", valor: v.agenciadora, formula: "= Vitalício" },
      ] },
      agenciamento,
    ];
  }
  const d = derivarIndicadores(i);
  return [
    { titulo: "Participação", linhas: [
      { rotulo: "Spread", campo: "spread", valor: i.spread },
      { rotulo: "Operadora", valor: d.operadora, formula: "100% − Spread" },
      { rotulo: "Administradora", valor: d.administradora, formula: "Spread − Agenciadora" },
      { rotulo: "Agenciadora", campo: "coAdministradora", valor: i.coAdministradora },
    ] },
    agenciamento,
    { titulo: "Taxa de adesão", linhas: [{ rotulo: "Percentual", campo: "adesao", valor: i.adesao }] },
  ];
}
