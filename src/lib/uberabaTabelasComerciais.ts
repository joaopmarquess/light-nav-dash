// Tabelas comerciais do Modelo de Atuação: cada frente = Referência × índice da frente.
export const FAIXAS = ["00 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 ou +"] as const;

/** Enfermaria da Tabela Referencial, em centavos. */
export const REFERENCIA_ENFERMARIA_CENTAVOS = [17500, 20422, 23832, 26262, 30646, 35027, 42907, 53504, 70999, 104970];

export type FrenteId = "pcaAdm" | "pmeAdm" | "pceAdm" | "pce100";
export type Indices = Record<FrenteId, number>;
export type GrupoFrenteId = "administradora" | "empresarial";

/**
 * Parâmetros das tabelas do Proj. Uberaba, fornecidos pelo Dênis em 13/11/2026 (sigla, contratação, vidas, boletagem,
 * distribuidores, descrição da tabela e fator sobre a Referência). O grupo separa a Proposta em duas seções:
 * produtos com boletagem pela Administradora e o Empresarial (boletagem pela Operadora).
 */
export type ParametrosFrente = {
  id: FrenteId; sigla: string; contratacao: string; vidas: string; boletagem: string; distribuidores: string;
  descricao: string; fatorReferencia: number; grupo: GrupoFrenteId;
};
export const PARAMETROS_UBERABA: ParametrosFrente[] = [
  { id: "pcaAdm", sigla: "PCA", contratacao: "PLANO COLETIVO POR ADESÃO", vidas: "-", boletagem: "ADMINISTRADORA", distribuidores: "PLATAFORMAS ASSOCIADAS", descricao: "ADESÃO", fatorReferencia: 0.95, grupo: "administradora" },
  { id: "pmeAdm", sigla: "PME ADM.", contratacao: "PLANO COLETIVO EMPRESARIAL", vidas: "03 A 29", boletagem: "ADMINISTRADORA", distribuidores: "PLATAFORMAS ASSOCIADAS", descricao: "PME ADMINISTRADAS", fatorReferencia: 0.9, grupo: "administradora" },
  { id: "pceAdm", sigla: "PCE ADM.", contratacao: "PLANO COLETIVO EMPRESARIAL", vidas: "30 A 99", boletagem: "ADMINISTRADORA", distribuidores: "PLATAFORMAS ASSOCIADAS", descricao: "PJ ADMINISTRADAS", fatorReferencia: 0.85, grupo: "administradora" },
  { id: "pce100", sigla: "PJ+", contratacao: "PLANO COLETIVO EMPRESARIAL", vidas: "100 OU MAIS", boletagem: "OPERADORA", distribuidores: "AGENCIADORAS E CORRETORAS AUTORIZADAS", descricao: "EMPRESARIAL", fatorReferencia: 0.75, grupo: "empresarial" },
];
export const parametrosDe = (id: FrenteId) => PARAMETROS_UBERABA.find((p) => p.id === id)!;
/** Faixa de vidas para leitura: "03 a 29 vidas", "100 ou mais vidas"; sem limite ("-") devolve null. */
export const vidasTexto = (p: ParametrosFrente) => (p.vidas.trim() === "-" ? null : `${p.vidas.toLowerCase()} vidas`);

/** Seções da Proposta: produtos com boletagem pela Administradora e o Empresarial. */
export const GRUPOS_FRENTES: { id: GrupoFrenteId; titulo: string; frentes: FrenteId[] }[] = [
  { id: "administradora", titulo: "Produtos com Administradora", frentes: PARAMETROS_UBERABA.filter((p) => p.grupo === "administradora").map((p) => p.id) },
  { id: "empresarial", titulo: "Plano Empresarial", frentes: PARAMETROS_UBERABA.filter((p) => p.grupo === "empresarial").map((p) => p.id) },
];

/** Índices padrão (% da Referência) = fator de referência × 100. */
export const INDICES_PADRAO: Indices = Object.fromEntries(PARAMETROS_UBERABA.map((p) => [p.id, Math.round(p.fatorReferencia * 10000) / 100])) as Indices;

export type LinhaTabela = { faixa: string; enfermariaCentavos: number; apartamentoCentavos: number };

/** Fator padrão do Apartamento sobre a Enfermaria (editável por tabela na tela). */
export const FATOR_APARTAMENTO_PADRAO = 1.25;
export type Fatores = Record<FrenteId, number>;
export const FATORES_PADRAO: Fatores = { pcaAdm: FATOR_APARTAMENTO_PADRAO, pmeAdm: FATOR_APARTAMENTO_PADRAO, pceAdm: FATOR_APARTAMENTO_PADRAO, pce100: FATOR_APARTAMENTO_PADRAO };
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

/**
 * Preço de Venda (pedido do Dênis, 13/11/2026): sempre Referência × fator da tabela, sem nenhuma outra multiplicação;
 * é o preço da tela, da Simulação e da Proposta Comercial. Ex.: Empresarial 175,00 × 0,75 = 131,25.
 */
export const tabelaVenda = (indicePercentual: number, fator: number = FATOR_APARTAMENTO_PADRAO): LinhaTabela[] =>
  tabelaIndexada(indicePercentual, fator);

/**
 * Preço Net (o que fica para a OPERADORA): Preço de Venda × participação da OPERADORA, coluna a coluna
 * (ARRED(Enfermaria venda × %; 2) e ARRED(Apartamento venda × %; 2)). Ex.: Empresarial 131,25 × 95% = 124,69.
 */
export function tabelaNet(indicePercentual: number, operadoraPercentual: number, fator: number = FATOR_APARTAMENTO_PADRAO): LinhaTabela[] {
  const pct = Math.round(operadoraPercentual * 100);
  const net = (c: number) => Math.round((c * pct) / 10000);
  return tabelaVenda(indicePercentual, fator).map((l) => ({ faixa: l.faixa, enfermariaCentavos: net(l.enfermariaCentavos), apartamentoCentavos: net(l.apartamentoCentavos) }));
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

/** v2: fatores padrão 0,95 / 0,90 / 0,85 / 0,75 (pedido do Dênis, 13/11/2026); índices gravados antes deixam de valer. */
const CHAVE = "uberaba-tabelas-comerciais-indices-v2";

/** Avisado após gravar índices ou indicadores, para a Simulação de resultados da mesma tela se atualizar. */
export const EVENTO_TABELAS_COMERCIAIS = "uberaba-tabelas-comerciais-alteradas";
const avisarAlteracao = () => {
  // Fora do ciclo de renderização: as gravações acontecem dentro de atualizações de estado.
  queueMicrotask(() => { try { globalThis.dispatchEvent?.(new Event(EVENTO_TABELAS_COMERCIAIS)); } catch { /* sem janela */ } });
};

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
  avisarAlteracao();
}

// ---------- Indicadores variáveis (por frente, editáveis) ----------
/** Campos editáveis (células amarelas da planilha), em %. */
export type Indicadores = { spread: number; contratual: number; promocional: number; adesao: number };
export type CampoIndicador = keyof Indicadores;

/** Padrão informado pelo usuário para os produtos com Administradora (PCA, PME ADM. e PCE ADM.). */
export const INDICADORES_PADRAO: Indicadores = { spread: 23, contratual: 90, promocional: 150, adesao: 99 };
/** Taxa de adesão padrão das Administradas (PME ADMINISTRADAS e PJ ADMINISTRADAS), pedido de 13/11/2026. */
export const ADESAO_PADRAO_ADMINISTRADAS = 50;

/**
 * Modelo de participação por frente:
 * - "administradora": Administradora editável (guardada em `spread`); Operadora = 100 − Administradora; com Taxa de adesão.
 * - "vitalicio" (PJ+, boletagem pela Operadora): Agenciadora editável (guardada em `spread`); Operadora = 100 − Agenciadora; sem Taxa de adesão.
 */
export type ModeloIndicadores = "administradora" | "vitalicio";
export const MODELO_INDICADORES: Record<FrenteId, ModeloIndicadores> = { pcaAdm: "administradora", pmeAdm: "administradora", pceAdm: "administradora", pce100: "vitalicio" };

/** Padrões por frente; PJ+ segue a planilha própria (Vitalício 5%, Contratual 90%, Promocional 100%). */
export const INDICADORES_PADRAO_POR_FRENTE: Record<FrenteId, Indicadores> = {
  pcaAdm: { ...INDICADORES_PADRAO },
  pmeAdm: { ...INDICADORES_PADRAO, adesao: ADESAO_PADRAO_ADMINISTRADAS },
  pceAdm: { ...INDICADORES_PADRAO, adesao: ADESAO_PADRAO_ADMINISTRADAS },
  pce100: { spread: 5, contratual: 90, promocional: 100, adesao: 0 },
};

/** Limites aceitos por campo (%). */
export const LIMITES_INDICADOR: Record<CampoIndicador, number> = { spread: 100, contratual: 500, promocional: 500, adesao: 100 };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Operadora = 100% − Administradora (guardada em `spread`). */
export function derivarIndicadores(i: Indicadores) {
  return { operadora: r2(100 - i.spread) };
}

/** PJ+: Operadora = 100% − Agenciadora. */
export function derivarVitalicio(i: Indicadores) {
  return { operadora: r2(100 - i.spread) };
}

/** Participação da OPERADORA da tabela (100% − Administradora, ou 100% − Agenciadora no PJ+), base do Preço Net. */
export const operadoraDe = (id: FrenteId, i: Indicadores) =>
  (MODELO_INDICADORES[id] === "vitalicio" ? derivarVitalicio(i) : derivarIndicadores(i)).operadora;

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
/** v3: Taxa de adesão padrão 50% nas Administradas (13/11/2026); da v2 aproveita-se tudo, menos essa taxa. */
const CHAVE_INDICADORES = "uberaba-tabelas-comerciais-indicadores-v3";
const CHAVE_INDICADORES_V2 = "uberaba-tabelas-comerciais-indicadores-v2";
/** v1 tinha o modelo antigo também em PCE 100+; dela só se aproveitam PCA Adm. e PCE Adm. */
const CHAVE_INDICADORES_V1 = "uberaba-tabelas-comerciais-indicadores-v1";
const FRENTE_IDS: FrenteId[] = PARAMETROS_UBERABA.map((p) => p.id);
export const indicadoresPadrao = (): IndicadoresPorFrente =>
  Object.fromEntries(FRENTE_IDS.map((id) => [id, { ...INDICADORES_PADRAO_POR_FRENTE[id] }])) as IndicadoresPorFrente;

export function lerIndicadores(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): IndicadoresPorFrente {
  const out = indicadoresPadrao();
  try {
    let salvo = JSON.parse(storage?.getItem(CHAVE_INDICADORES) ?? "null");
    if (!salvo || typeof salvo !== "object") {
      const v2 = JSON.parse(storage?.getItem(CHAVE_INDICADORES_V2) ?? "null");
      if (v2 && typeof v2 === "object") {
        salvo = { ...v2 };
        (["pmeAdm", "pceAdm"] as const).forEach((id) => {
          if (v2[id] && typeof v2[id] === "object") { const { adesao: _antiga, ...resto } = v2[id]; salvo[id] = resto; }
        });
      }
    }
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
  avisarAlteracao();
}

// ---------- Quadros das frentes (tela e Proposta Comercial) ----------
/** Nome e segmento de cada frente, na ordem da tela. */
/** Nome = Descrição da Tabela; segmento = Contratação (parâmetros de 13/11/2026). */
export const FRENTES_COMERCIAIS: { id: FrenteId; titulo: string; segmento: string }[] =
  PARAMETROS_UBERABA.map((p) => ({ id: p.id, titulo: p.descricao, segmento: p.contratacao }));

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
/** v3: nomes passaram a ser a Descrição da Tabela (13/11/2026); nomes gravados antes deixam de valer. */
const CHAVE_ROTULOS = "uberaba-tabelas-comerciais-rotulos-v3";
/** Padrão gravado pelo usuário (ícone ao lado do nome); sem gravação, valem os nomes originais. */
const CHAVE_ROTULOS_PADRAO = "uberaba-tabelas-comerciais-rotulos-padrao-v3";
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
        { rotulo: "Agenciadora", campo: "spread", valor: i.spread },
        { rotulo: "Operadora", valor: v.operadora, formula: "100% − Agenciadora" },
      ] },
      agenciamento,
    ];
  }
  const d = derivarIndicadores(i);
  return [
    { titulo: "Participação", linhas: [
      { rotulo: "Administradora", campo: "spread", valor: i.spread },
      { rotulo: "Operadora", valor: d.operadora, formula: "100% − Administradora" },
    ] },
    agenciamento,
    { titulo: "Taxa de adesão", linhas: [{ rotulo: "Percentual", campo: "adesao", valor: i.adesao }] },
  ];
}
