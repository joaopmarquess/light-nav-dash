import { feriadosNacionais } from "@/lib/simularDatasFm";

/**
 * Financeiro › Inadimplência: regras de consolidação e medição das contas a receber.
 * Cada título é identificado por CD_ITCON_REC; o arquivo traz uma linha por recebimento,
 * repetindo o valor da duplicata em todas elas.
 */

export type LinhaCR = {
  cd_itcon_rec: string;
  dt_competencia: string; // AAAAMM
  dt_vencimento: string | null; // AAAA-MM-DD
  dt_recebimento: string | null;
  vl_duplicata: number;
  vl_recebido: number;
  vl_acrescimo: number;
  vl_desconto: number;
  tp_quitacao: string | null;
  tp_plano: string | null;
  sn_coparticipativo: string | null;
  cd_plano: string | null;
  ds_con_cor: string | null;
  nm_responsavel_financeiro: string | null;
  nr_cpf_cgc: string | null;
  cd_contrato: string | null;
};

export const COLUNAS_CR = "cd_itcon_rec,dt_competencia,dt_vencimento,dt_recebimento,vl_duplicata,vl_recebido,vl_acrescimo,vl_desconto,tp_quitacao,tp_plano,sn_coparticipativo,cd_plano,ds_con_cor,nm_responsavel_financeiro,nr_cpf_cgc,cd_contrato";

/** Ajusta uma linha vinda de qualquer base (datas com hora, números como texto) ao formato do cálculo. */
export function normalizarLinha(r: Record<string, unknown>): LinhaCR {
  const txt = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());
  const data = (v: unknown) => { const t = txt(v); if (!t) return null; const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return br ? `${br[3]}-${br[2]}-${br[1]}` : t.slice(0, 10); };
  const num = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "0").replace(",", ".")) || 0);
  return {
    cd_itcon_rec: txt(r.cd_itcon_rec) ?? "", dt_competencia: (txt(r.dt_competencia) ?? "").replace(/\D/g, "").slice(0, 6),
    dt_vencimento: data(r.dt_vencimento), dt_recebimento: data(r.dt_recebimento),
    vl_duplicata: num(r.vl_duplicata), vl_recebido: num(r.vl_recebido), vl_acrescimo: num(r.vl_acrescimo), vl_desconto: num(r.vl_desconto),
    tp_quitacao: txt(r.tp_quitacao), tp_plano: txt(r.tp_plano), sn_coparticipativo: txt(r.sn_coparticipativo), cd_plano: txt(r.cd_plano),
    ds_con_cor: txt(r.ds_con_cor), nm_responsavel_financeiro: txt(r.nm_responsavel_financeiro), nr_cpf_cgc: txt(r.nr_cpf_cgc), cd_contrato: txt(r.cd_contrato),
  };
}

export const SITUACOES: Record<string, string> = { Q: "Quitado", C: "Cancelado", L: "L (em aberto)" };
/** Situações que saem da base de cálculo (o título deixou de ser devido). */
export const SITUACOES_FORA = new Set(["C"]);

export type Titulo = Omit<LinhaCR, "vl_recebido" | "vl_acrescimo" | "dt_recebimento"> & {
  /** Valor devido: duplicata menos desconto. */
  valor: number;
  acrescimo: number;
  /** Recebimentos de principal (recebido − acréscimo), em ordem de data. */
  recebimentos: { data: string; valor: number }[];
  /** Recebido além do valor do título (linhas repetidas); nunca entra no recebido. */
  excesso: number;
  /** Principal somado de todas as linhas do arquivo, antes do limite ao valor do título. */
  recebidoArquivo: number;
  linhas: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function consolidarTitulos(linhas: LinhaCR[]): Titulo[] {
  const mapa = new Map<string, { base: LinhaCR; acr: number; recs: { data: string; valor: number }[]; linhas: number }>();
  for (const l of linhas) {
    let g = mapa.get(l.cd_itcon_rec);
    if (!g) { g = { base: l, acr: 0, recs: [], linhas: 0 }; mapa.set(l.cd_itcon_rec, g); }
    g.linhas++;
    g.acr += Number(l.vl_acrescimo) || 0;
    const principal = (Number(l.vl_recebido) || 0) - (Number(l.vl_acrescimo) || 0);
    if (l.dt_recebimento && principal > 0) g.recs.push({ data: l.dt_recebimento, valor: principal });
  }
  return [...mapa.values()].map(({ base, acr, recs, linhas: n }) => {
    const valor = r2((Number(base.vl_duplicata) || 0) - (Number(base.vl_desconto) || 0));
    recs.sort((a, b) => a.data.localeCompare(b.data));
    // Limita o recebido ao valor do título: linhas repetidas não contam em dobro.
    let restante = valor; let excesso = 0;
    const recebimentos = recs.map((r) => {
      const usado = Math.max(0, Math.min(r.valor, restante));
      restante = r2(restante - usado); excesso += r.valor - usado;
      return { data: r.data, valor: r2(usado) };
    }).filter((r) => r.valor > 0);
    const { vl_recebido: _r, vl_acrescimo: _a, dt_recebimento: _d, ...resto } = base;
    return { ...resto, valor, acrescimo: r2(acr), recebimentos, excesso: r2(excesso), recebidoArquivo: r2(recs.reduce((a, r) => a + r.valor, 0)), linhas: n };
  });
}

export type Metricas = {
  titulos: number; aReceber: number; recebido: number; emAberto: number; inadimplentes: number;
  recebidoAtraso: number; acrescimos: number; excesso: number;
};
export const metricasVazias = (): Metricas => ({ titulos: 0, aReceber: 0, recebido: 0, emAberto: 0, inadimplentes: 0, recebidoAtraso: 0, acrescimos: 0, excesso: 0 });
export const pctRecebido = (m: Metricas) => (m.aReceber > 0 ? m.recebido / m.aReceber : null);
export const pctInadimplencia = (m: Metricas) => (m.aReceber > 0 ? m.emAberto / m.aReceber : null);

/** Vencimento em sábado, domingo ou feriado nacional passa para o próximo dia útil (pagamento nesse dia é em dia). */
export function vencimentoUtil(venc: string): string {
  let t = Date.parse(venc + "T00:00:00Z");
  for (let i = 0; i < 10; i++) {
    const d = new Date(t); const iso = d.toISOString().slice(0, 10);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !feriadosNacionais(d.getUTCFullYear()).has(iso)) return iso;
    t += 86400000;
  }
  return venc;
}

const dias = (de: string, ate: string) => Math.round((Date.parse(ate + "T00:00:00Z") - Date.parse(de + "T00:00:00Z")) / 86400000);

/** Mede um título na data de posição: só entra se venceu (no dia útil) até a posição; recebido conta até a posição. */
export function medirTitulo(t: Titulo, posicao: string): Metricas | null {
  if (!t.dt_vencimento) return null;
  const venc = vencimentoUtil(t.dt_vencimento);
  if (venc > posicao) return null;
  const recs = t.recebimentos.filter((r) => r.data <= posicao);
  const recebido = r2(recs.reduce((s, r) => s + r.valor, 0));
  const emAberto = r2(Math.max(0, t.valor - recebido));
  return {
    titulos: 1, aReceber: t.valor, recebido, emAberto, inadimplentes: emAberto > 0.005 ? 1 : 0,
    recebidoAtraso: r2(recs.filter((r) => r.data > venc).reduce((s, r) => s + r.valor, 0)),
    acrescimos: t.acrescimo, excesso: t.excesso,
  };
}

export function somar(a: Metricas, b: Metricas): Metricas {
  return {
    titulos: a.titulos + b.titulos, aReceber: r2(a.aReceber + b.aReceber), recebido: r2(a.recebido + b.recebido),
    emAberto: r2(a.emAberto + b.emAberto), inadimplentes: a.inadimplentes + b.inadimplentes,
    recebidoAtraso: r2(a.recebidoAtraso + b.recebidoAtraso), acrescimos: r2(a.acrescimos + b.acrescimos), excesso: r2(a.excesso + b.excesso),
  };
}

/** Faixa de atraso na posição: em aberto pelos dias desde o vencimento; quitado pelo atraso do último recebimento. */
export function faixaAtraso(t: Titulo, m: Metricas, posicao: string): string {
  const venc = vencimentoUtil(t.dt_vencimento!);
  if (m.emAberto > 0.005) {
    const d = dias(venc, posicao);
    return d <= 30 ? "1 · Em aberto até 30 dias" : d <= 60 ? "2 · Em aberto 31 a 60 dias" : d <= 90 ? "3 · Em aberto 61 a 90 dias" : "4 · Em aberto mais de 90 dias";
  }
  const ult = t.recebimentos.filter((r) => r.data <= posicao).at(-1)?.data ?? venc;
  const d = dias(venc, ult);
  return d <= 0 ? "5 · Pago em dia" : d <= 5 ? "6 · Pago 1 a 5 dias após" : d <= 30 ? "7 · Pago 6 a 30 dias após" : "8 · Pago mais de 30 dias após";
}

export type Dimensao = "competencia" | "vencimento" | "tipoPlano" | "coparticipativo" | "plano" | "banco" | "situacao" | "faixaAtraso" | "contrato" | "responsavel";
export const DIMENSOES: { id: Dimensao; rotulo: string }[] = [
  { id: "competencia", rotulo: "Competência" },
  { id: "vencimento", rotulo: "Vencimento" },
  { id: "faixaAtraso", rotulo: "Faixa de atraso" },
  { id: "tipoPlano", rotulo: "Tipo de plano" },
  { id: "coparticipativo", rotulo: "Coparticipativo" },
  { id: "plano", rotulo: "Plano" },
  { id: "banco", rotulo: "Banco" },
  { id: "situacao", rotulo: "Quitação" },
  { id: "contrato", rotulo: "Contrato" },
  { id: "responsavel", rotulo: "Responsável financeiro" },
];
const ORDEM_NATURAL = new Set<Dimensao>(["competencia", "vencimento", "faixaAtraso"]);

const brData = (iso: string) => iso.split("-").reverse().join("/");
export const rotuloCompetencia = (c: string) => `${c.slice(4, 6)}/${c.slice(0, 4)}`;

/** Chave de ordenação e rótulo do título em cada dimensão. */
export function valorDimensao(d: Dimensao, t: Titulo, m: Metricas, posicao: string): { chave: string; rotulo: string } {
  switch (d) {
    case "competencia": return { chave: t.dt_competencia, rotulo: rotuloCompetencia(t.dt_competencia) };
    case "vencimento": return { chave: t.dt_vencimento ?? "", rotulo: t.dt_vencimento ? brData(t.dt_vencimento) : "Sem vencimento" };
    case "faixaAtraso": { const f = faixaAtraso(t, m, posicao); return { chave: f, rotulo: f.slice(4) }; }
    case "tipoPlano": return { chave: t.tp_plano ?? "", rotulo: t.tp_plano || "Sem tipo" };
    case "coparticipativo": return t.sn_coparticipativo === "S" ? { chave: "S", rotulo: "Sim" } : { chave: "N", rotulo: "Não" };
    case "plano": return { chave: t.cd_plano ?? "", rotulo: t.cd_plano ? `Plano ${t.cd_plano}` : "Sem plano" };
    case "banco": return { chave: t.ds_con_cor ?? "", rotulo: t.ds_con_cor || "Sem banco" };
    case "situacao": { const s = t.tp_quitacao ?? ""; return { chave: s, rotulo: SITUACOES[s] ?? (s || "Sem quitação") }; }
    case "contrato": return { chave: t.cd_contrato ?? "", rotulo: t.cd_contrato ? `Contrato ${t.cd_contrato}` : "Sem contrato" };
    case "responsavel": return { chave: `${t.nm_responsavel_financeiro ?? ""}|${t.nr_cpf_cgc ?? ""}`, rotulo: `${t.nm_responsavel_financeiro ?? "Sem nome"}${t.nr_cpf_cgc ? ` · ${t.nr_cpf_cgc}` : ""}` };
  }
}

export type Filtros = {
  competenciaDe?: string; competenciaAte?: string; tipoPlano?: string; coparticipativo?: string;
  banco?: string; situacao?: string; incluirCancelados?: boolean; plano?: string;
};

export type Medido = { t: Titulo; m: Metricas };

export function medir(titulos: Titulo[], posicao: string, f: Filtros = {}): Medido[] {
  const out: Medido[] = [];
  for (const t of titulos) {
    if (!f.incluirCancelados && SITUACOES_FORA.has(t.tp_quitacao ?? "")) continue;
    if (f.competenciaDe && t.dt_competencia < f.competenciaDe) continue;
    if (f.competenciaAte && t.dt_competencia > f.competenciaAte) continue;
    if (f.tipoPlano && t.tp_plano !== f.tipoPlano) continue;
    if (f.coparticipativo && t.sn_coparticipativo !== f.coparticipativo) continue;
    if (f.banco && (t.ds_con_cor ?? "") !== f.banco) continue;
    if (f.situacao && (t.tp_quitacao ?? "") !== f.situacao) continue;
    if (f.plano && t.cd_plano !== f.plano) continue;
    const m = medirTitulo(t, posicao);
    if (m) out.push({ t, m });
  }
  return out;
}

/** Seção "Dobrado": títulos cujo recebido no arquivo passa do valor (linhas repetidas), contados uma única vez. */
export const titulosDobrados = (itens: Medido[]) => itens.filter((i) => i.t.excesso > 0.005).sort((a, b) => b.t.excesso - a.t.excesso || a.t.cd_itcon_rec.localeCompare(b.t.cd_itcon_rec));

export const total = (itens: Medido[]) => itens.reduce((s, i) => somar(s, i.m), metricasVazias());

export type No = { id: string; rotulo: string; nivel: number; metricas: Metricas; filhos: No[] };

/** Agrupa em níveis; competência, vencimento e faixa em ordem natural, demais pelo maior valor a receber. */
export function agrupar(itens: Medido[], niveis: Dimensao[], posicao: string, prefixo = "", nivel = 0): No[] {
  const d = niveis[nivel];
  if (!d) return [];
  const grupos = new Map<string, { rotulo: string; itens: Medido[] }>();
  for (const i of itens) {
    const { chave, rotulo } = valorDimensao(d, i.t, i.m, posicao);
    let g = grupos.get(chave);
    if (!g) { g = { rotulo, itens: [] }; grupos.set(chave, g); }
    g.itens.push(i);
  }
  const nos = [...grupos.entries()].map(([chave, g]) => {
    const id = `${prefixo}/${d}:${chave}`;
    return { chave, no: { id, rotulo: g.rotulo, nivel, metricas: total(g.itens), filhos: agrupar(g.itens, niveis, posicao, id, nivel + 1) } };
  });
  nos.sort((a, b) => ORDEM_NATURAL.has(d) ? a.chave.localeCompare(b.chave) : b.no.metricas.aReceber - a.no.metricas.aReceber || a.no.rotulo.localeCompare(b.no.rotulo));
  return nos.map((n) => n.no);
}
