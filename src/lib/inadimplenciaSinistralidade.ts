// Financeiro › Inadimplência: sinistralidade dos últimos 12 meses como qualificador dos títulos.
// Ligação: CD_CONTRATO_INTERNO (arquivo, 10 dígitos) = 10 primeiros dígitos de beneficiarios.cd_mat_alternativa
// (Plano 4 + Contrato 6; os 2 últimos são o dependente) → cd_matricula → view_eard_mensal.
import { acumular, somaVazia, type Competencia, type LinhaEard } from "./sinistralidadeCompetencias";
import type { Medido } from "./inadimplencia";

export const MESES_SINISTRALIDADE = 12;

/** Soma do contrato no período: receita total (cpp + copart + outros) e despesa total (seis colunas). */
export type SomaContrato = { receita: number; despesa: number };

const aaaamm = (c: Competencia) => c.ano * 100 + c.mes;

/** Últimos 12 meses terminando na última competência válida (ex.: 09/2026 → 202510 a 202609). */
export function periodoSinistralidade(ultima: Competencia): { de: number; ate: number } {
  const k = ultima.ano * 12 + ultima.mes - 1 - (MESES_SINISTRALIDADE - 1);
  return { de: aaaamm({ ano: Math.floor(k / 12), mes: (k % 12) + 1 }), ate: aaaamm(ultima) };
}
export const rotuloPeriodoSinistralidade = (p: { de: number; ate: number }) =>
  [p.de, p.ate].map((c) => `${String(c % 100).padStart(2, "0")}/${Math.floor(c / 100)}`).join(" a ");

/** Contrato interno com 10 dígitos (zeros à esquerda); null quando vazio. */
export function normalizarContratoInterno(v: unknown): string | null {
  const d = String(v ?? "").replace(/\D/g, "");
  return d ? d.padStart(10, "0").slice(-10) : null;
}
/** Contrato interno de uma matrícula alternativa (12 dígitos). */
export function contratoDaMatAlternativa(v: unknown): string | null {
  const d = String(v ?? "").replace(/\D/g, "");
  return d ? d.padStart(12, "0").slice(0, 10) : null;
}
/** Intervalo de matrículas alternativas do contrato: dependentes 00 a 99. */
export const faixaMatAlternativa = (ci: string) => ({ de: `${ci}00`, ate: `${ci}99` });

/** Soma receitas e despesas da view_eard_mensal por contrato interno, pelas matrículas dos beneficiários. */
export function somarPorContrato(
  beneficiarios: { cd_matricula: number | string; cd_mat_alternativa: unknown }[],
  eard: (LinhaEard & { cd_matricula: number | string })[],
): Map<string, SomaContrato> {
  const contratoDe = new Map<string, string>();
  for (const b of beneficiarios) { const ci = contratoDaMatAlternativa(b.cd_mat_alternativa); if (ci) contratoDe.set(String(b.cd_matricula), ci); }
  const out = new Map<string, SomaContrato>();
  for (const l of eard) {
    const ci = contratoDe.get(String(l.cd_matricula));
    if (!ci) continue;
    const s = acumular(somaVazia(), [l]);
    const cur = out.get(ci) ?? { receita: 0, despesa: 0 };
    out.set(ci, { receita: cur.receita + s.recTotal, despesa: cur.despesa + s.despTotal });
  }
  return out;
}

/** Beneficiário que identifica o contrato no grid: o titular (ou, sem titular, a menor matrícula alternativa). */
export type BeneficiarioContrato = { matricula: string; nome: string };
export function titularesPorContrato(
  beneficiarios: { cd_matricula: number | string; cd_mat_alternativa: unknown; nm_beneficiario?: string | null; tp_relacionamento?: string | null }[],
): Map<string, BeneficiarioContrato> {
  const melhor = new Map<string, { b: (typeof beneficiarios)[number]; alt: string }>();
  const titular = (b: (typeof beneficiarios)[number]) => (b.tp_relacionamento ?? "").toUpperCase() === "TITULAR";
  for (const b of beneficiarios) {
    const ci = contratoDaMatAlternativa(b.cd_mat_alternativa);
    if (!ci) continue;
    const alt = String(b.cd_mat_alternativa ?? "").replace(/\D/g, "").padStart(12, "0");
    const cur = melhor.get(ci);
    if (!cur || (titular(b) && !titular(cur.b)) || (titular(b) === titular(cur.b) && alt < cur.alt)) melhor.set(ci, { b, alt });
  }
  return new Map([...melhor].map(([ci, { b }]) => [ci, { matricula: String(b.cd_matricula), nome: (b.nm_beneficiario ?? "").trim() || "Sem nome" }]));
}

export const sinistralidade = (s: SomaContrato | null | undefined) => (s && s.receita > 0 ? s.despesa / s.receita : null);

/** Faixas: limite superior incluído (50% exatos fica em "Até 50%"). */
export const LIMITES_FAIXA_SINISTRALIDADE = [0.5, 0.75, 1] as const;

/** Faixa do título pela sinistralidade do contrato (undefined = ainda carregando). */
export function faixaSinistralidade(s: SomaContrato | null | undefined, temContrato = true): { chave: string; rotulo: string } {
  if (!temContrato) return { chave: "7", rotulo: "Sem contrato interno" };
  if (s === undefined) return { chave: "8", rotulo: "Carregando sinistralidade" };
  if (s === null) return { chave: "6", rotulo: "Sem dados no período" };
  const v = sinistralidade(s);
  if (v == null) return { chave: "5", rotulo: "Sem receita no período" };
  const [a, b, c] = LIMITES_FAIXA_SINISTRALIDADE;
  return v <= a ? { chave: "1", rotulo: "Até 50%" } : v <= b ? { chave: "2", rotulo: "50% a 75%" } : v <= c ? { chave: "3", rotulo: "75% a 100%" } : { chave: "4", rotulo: "Acima de 100%" };
}
export const FAIXAS_SINISTRALIDADE = [
  { chave: "1", rotulo: "Até 50%" }, { chave: "2", rotulo: "50% a 75%" }, { chave: "3", rotulo: "75% a 100%" }, { chave: "4", rotulo: "Acima de 100%" },
  { chave: "5", rotulo: "Sem receita no período" }, { chave: "6", rotulo: "Sem dados no período" }, { chave: "7", rotulo: "Sem contrato interno" },
];

/** Sinistralidade de um grupo de títulos: cada contrato entra uma vez (soma das despesas ÷ soma das receitas). */
export function sinistralidadeItens(itens: Medido[]): { contratos: number; receita: number; despesa: number; valor: number | null } {
  const vistos = new Map<string, SomaContrato>();
  for (const { t } of itens) if (t.cd_contrato_interno && t.sinistralidade) vistos.set(t.cd_contrato_interno, t.sinistralidade);
  let receita = 0, despesa = 0;
  for (const s of vistos.values()) { receita += s.receita; despesa += s.despesa; }
  return { contratos: vistos.size, receita, despesa, valor: receita > 0 ? despesa / receita : null };
}
