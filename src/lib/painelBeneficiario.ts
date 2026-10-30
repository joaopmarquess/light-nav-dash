// Regras da Central de Consulta do Beneficiário (Carteira › Painel).
// Fontes: view_ecarteira (movimentos por matrícula), beneficiarios (cadastro) e
// view_eard_mensal (receita/despesa mensal). Chave comum: cd_matricula.

export type CarteiraRow = Record<string, any> & {
  cd_matricula: number;
  tp_status?: string | null;
  tp_linha?: string | null;
  tp_plano?: string | null;
  dt_momento?: string | null;
};

export type EardRow = {
  dt_competencia: number;
  vl_rec_cpp: number | null;
  vl_rec_copart: number | null;
  vl_rec_outros: number | null;
  vl_desp_consulta: number | null;
  vl_desp_urgencia: number | null;
  vl_desp_internacao: number | null;
  vl_desp_terapia: number | null;
  vl_desp_exame: number | null;
  vl_desp_outros: number | null;
  perc_sinistralidade?: number | null;
};

export const CATEGORIAS_DESPESA = [
  { key: "vl_desp_consulta", label: "Consulta" },
  { key: "vl_desp_urgencia", label: "Urgência/Emergência" },
  { key: "vl_desp_internacao", label: "Internação" },
  { key: "vl_desp_terapia", label: "Terapia" },
  { key: "vl_desp_exame", label: "Exames" },
  { key: "vl_desp_outros", label: "Outros" },
] as const;

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

/** Situação atual = movimento mais recente (dt_momento) da linha Saúde. */
export function registroAtual(rows: CarteiraRow[]): CarteiraRow | null {
  const saude = rows.filter((r) => (r.tp_plano ?? "").toUpperCase() === "SAUDE");
  const base = saude.length ? saude : rows;
  if (!base.length) return null;
  return [...base].sort((a, b) => String(b.dt_momento ?? "").localeCompare(String(a.dt_momento ?? "")))[0];
}

export type StatusInfo = { label: string; tone: "ok" | "warn" | "bad" | "neutral" };
export function statusInfo(code?: string | null): StatusInfo {
  switch ((code ?? "").toUpperCase()) {
    case "A": return { label: "Ativo", tone: "ok" };
    case "S": return { label: "Suspenso", tone: "warn" };
    case "C": return { label: "Cancelado", tone: "bad" };
    case "I": return { label: "Inativo", tone: "bad" };
    default: return { label: code ? code : "—", tone: "neutral" };
  }
}

export const despesaMes = (r: EardRow) => CATEGORIAS_DESPESA.reduce((s, c) => s + n(r[c.key]), 0);
export const receitaMes = (r: EardRow) => n(r.vl_rec_cpp) + n(r.vl_rec_copart) + n(r.vl_rec_outros);

export function resumoEard(rows: EardRow[]) {
  const receita = rows.reduce((s, r) => s + receitaMes(r), 0);
  const despesa = rows.reduce((s, r) => s + despesaMes(r), 0);
  const copart = rows.reduce((s, r) => s + n(r.vl_rec_copart), 0);
  const cpp = rows.reduce((s, r) => s + n(r.vl_rec_cpp), 0);
  const porCategoria = CATEGORIAS_DESPESA.map((c) => ({ ...c, valor: rows.reduce((s, r) => s + n(r[c.key]), 0) }));
  return { receita, despesa, copart, cpp, sinistralidade: receita > 0 ? (despesa / receita) * 100 : null, porCategoria };
}

/** Agrupa por competência (a view pode trazer mais de uma linha por mês). */
export function porCompetencia(rows: EardRow[]): EardRow[] {
  const m = new Map<number, EardRow>();
  for (const r of rows) {
    const k = Number(r.dt_competencia);
    const cur = m.get(k);
    if (!cur) { m.set(k, { ...r, dt_competencia: k }); continue; }
    for (const f of ["vl_rec_cpp", "vl_rec_copart", "vl_rec_outros", ...CATEGORIAS_DESPESA.map((c) => c.key)] as const) {
      (cur as any)[f] = n(cur[f]) + n(r[f]);
    }
    cur.perc_sinistralidade = null;
  }
  return [...m.values()].sort((a, b) => a.dt_competencia - b.dt_competencia);
}

export const LINHA_LABEL: Record<string, string> = { E: "Entrada", S: "Saída", R: "Reativação" };

export type Evento = { data: string; evento: string; descricao?: string };
export function linhaDoTempo(rows: CarteiraRow[], cad?: Record<string, any> | null): Evento[] {
  const ev: Evento[] = [];
  const push = (data: unknown, evento: string, descricao?: string | null) => {
    if (!data) return;
    const d = String(data).slice(0, 10);
    const k = `${d}|${evento}`;
    if (!ev.some((e) => `${e.data}|${e.evento}` === k)) ev.push({ data: d, evento, descricao: descricao && descricao !== "None" ? descricao : undefined });
  };
  for (const r of rows) {
    if ((r.tp_plano ?? "").toUpperCase() !== "SAUDE") continue;
    push(r.dt_momento, `Movimento: ${LINHA_LABEL[r.tp_linha ?? ""] ?? r.tp_linha ?? "—"}`, r.ds_plano);
  }
  const a = registroAtual(rows);
  if (a) {
    push(a.dt_cadastro, "Cadastro");
    push(a.dt_vigencia_beneficiario, "Início de vigência", a.ds_plano);
    push(a.dt_suspensao, "Suspensão", a.ds_motivo_suspensao);
    push(a.dt_reativacao_suspensao, "Reativação da suspensão");
    push(a.dt_reativacao, "Reativação");
    push(a.dt_desligamento, "Desligamento", a.ds_motivo_cancelamento);
  }
  if (cad) {
    push(cad.dt_ult_suspensao, "Suspensão", cad.ds_motivo_suspensao);
    push(cad.dt_ult_desligamento, "Desligamento", cad.ds_motivo_deslig);
  }
  return ev.sort((x, y) => x.data.localeCompare(y.data));
}
