import { z } from "zod";

export const VISOES = ["Otimista", "Pessimista", "Realista"] as const;
export const ETAPAS = ["Painel", "Faturamento", "Coparticipação", "Despesas Assistenciais", "Demais Operacionais", "Despesas Administrativas", "Financeiro", "DRE"] as const;
export const rowSchema = z.object({ id: z.enum(["PIF", "PCA", "PCE"]), vidas: z.number().finite().int().nonnegative(), ticket: z.number().finite().nonnegative(), entradas: z.number().finite().int().nonnegative(), saidas: z.number().finite().int().nonnegative() });
const finite = z.number().finite();
export const modelSchema = z.object({
  rows: z.array(rowSchema).length(3).refine(rows => new Set(rows.map(r => r.id)).size === 3, "Informe os três planos."),
  reaj_v2: finite.refine(v => v > -100, "Reajuste deve ser maior que -100%."), rec_v2: finite.nonnegative(), sinLiq_v2: finite.nonnegative(), rede_v2: finite.min(0).max(100),
  demaisOp: z.array(finite.nonnegative()).length(4), admPc_v4: z.array(finite.nonnegative()).length(4), admTot_v4: finite.nonnegative(), finPc_v2: finite,
}).superRefine((v, ctx) => {
  v.rows.forEach((r, i) => { if (r.vidas + 12 * (r.entradas - r.saidas) < 0) ctx.addIssue({ code: "custom", path: ["rows", i, "saidas"], message: "As saídas não podem resultar em vidas negativas." }); });
  if (v.admTot_v4 + 0.0000001 < v.admPc_v4.slice(0, 3).reduce((a, b) => a + b, 0)) ctx.addIssue({ code: "custom", path: ["admTot_v4"], message: "Total administrativo menor que Pessoal + Informática + Marketing." });
});
export type BudgetModel = { rows: {id:"PIF"|"PCA"|"PCE";vidas:number;ticket:number;entradas:number;saidas:number}[]; reaj_v2:number;rec_v2:number;sinLiq_v2:number;rede_v2:number;demaisOp:number[];admPc_v4:number[];admTot_v4:number;finPc_v2:number };
export const DEFAULT_MODEL: BudgetModel = {
  rows: [{ id: "PIF", vidas: 35816, ticket: 598.83, entradas: 104, saidas: 312 }, { id: "PCA", vidas: 26406, ticket: 317.56, entradas: 742, saidas: 260 }, { id: "PCE", vidas: 10359, ticket: 276.70, entradas: 449, saidas: 222 }],
  reaj_v2: 1.05, rec_v2: 9.75, sinLiq_v2: 89, rede_v2: 57, demaisOp: [0.97, 0.87, 1.94, 1.29], admPc_v4: [4.43, 1.09, 0.72, 1.52], admTot_v4: 7.76, finPc_v2: 4.56,
};
export const STAGE_KEYS: (keyof BudgetModel)[][] = [[], ["rows", "reaj_v2"], ["rec_v2"], ["sinLiq_v2", "rede_v2"], ["demaisOp"], ["admPc_v4", "admTot_v4"], ["finPc_v2"], []];
export function stageData(model: BudgetModel, stage: number) { return Object.fromEntries(STAGE_KEYS[stage].map(k => [k, model[k]])); }
export type StageRecord = { stage: number; status: string; data: Record<string, unknown>; updated_at: string };
export type ViewRecord = { id: string; position: number; status: string; updated_at: string; simulador_etapas: StageRecord[] };
export type SimulationRecord = { id: string; name: string; user_id: string; status: string; created_at: string; updated_at: string; simulador_visoes: ViewRecord[] };
export function viewModel(view: ViewRecord): BudgetModel { return { ...structuredClone(DEFAULT_MODEL), ...Object.assign({}, ...[...view.simulador_etapas].sort((a, b) => a.stage - b.stage).map(s => s.data)) }; }
export function stageUnlocked(view: ViewRecord, stage: number) { return view.simulador_etapas.filter(s => s.stage < stage).every(s => s.status === "completed") && view.simulador_etapas.filter(s => s.stage < stage).length === stage; }
export function viewUnlocked(sim: SimulationRecord, position: number) { return sim.simulador_visoes.filter(v => v.position < position).every(v => v.status === "completed") && sim.simulador_visoes.filter(v => v.position < position).length === position; }
export function resume(sim: SimulationRecord) { const view = [...sim.simulador_visoes].sort((a,b) => a.position-b.position).find(v => v.status !== "completed") ?? sim.simulador_visoes.find(v => v.position === 2); return { view: view?.position ?? 0, stage: view?.simulador_etapas.find(s => s.status !== "completed")?.stage ?? 7 }; }
export function progress(sim: SimulationRecord) { return Math.round(sim.simulador_visoes.reduce((n,v) => n + v.simulador_etapas.filter(s => s.status === "completed").length, 0) / 24 * 100); }
export function pdfEligible(sim: SimulationRecord) { return sim.status === "completed" && sim.simulador_visoes.length === 3 && sim.simulador_visoes.every(v => v.status === "completed" && v.simulador_etapas.length === 8 && v.simulador_etapas.every(s => s.status === "completed")); }

/** Same monthly timing, administrative residual and positive-month tax as Orçamento 2027. */
export function calculateBudget(m: BudgetModel) {
  const fat = Array.from({ length: 12 }, (_, i) => m.rows.reduce((s,r) => s + (r.vidas + (i+1)*(r.entradas-r.saidas))*r.ticket*Math.pow(1+m.reaj_v2/100,i),0));
  const cop = fat.map(f => f*m.rec_v2/100), ent = fat.map((f,i) => f+cop[i]);
  const desp = ent.map(f => f*m.sinLiq_v2/100), rede = desp.map(f => f*m.rede_v2/100), bene = desp.map((f,i) => f-rede[i]);
  const op = m.demaisOp.map(p => fat.map(f => f*p/100));
  const ap = [...m.admPc_v4.slice(0,3),m.admTot_v4-m.admPc_v4.slice(0,3).reduce((a,b)=>a+b,0)];
  const admParts = ap.map(p => fat.map(f => f*p/100));
  const demais = fat.map((_,i)=>op.reduce((s,r)=>s+r[i],0)), adm = fat.map(f=>f*m.admTot_v4/100), fin = fat.map(f=>f*m.finPc_v2/100);
  const prim = ent.map((v,i)=>v-desp[i]), totalOp = prim.map((v,i)=>v-demais[i]), ebitda = totalOp.map((v,i)=>v-adm[i]);
  const rai = ebitda.map((v,i)=>v+fin[i]), imp = rai.map(v=>v>0?v*0.34:0), liq = rai.map((v,i)=>v-imp[i]);
  return { fat,cop,ent,desp,rede,bene,op,admParts,demais,adm,fin,prim,totalOp,ebitda,rai,imp,liq };
}
export const total = (xs: number[]) => xs.reduce((a,b)=>a+b,0);