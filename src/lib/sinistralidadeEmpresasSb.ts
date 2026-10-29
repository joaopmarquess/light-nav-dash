import { normFaixa, type LinhaEmp } from "@/lib/sinistralidadeEmpresas";

export interface RegSb { mabas: number; codigo: string; recCpp: number; desp: number; recCpa: number; cdpln: string; dspln: string; faixa: string }

const num = (s: string) => Number((s || "0").replace(/\./g, "").replace(",", ".")) || 0;

/** CSV reduzido: mabas;codigo;vrcpp;vrdespesas;rec_cpa;cdpln;dspln;faixa */
export function parseSb(txt: string): RegSb[] {
  return txt.split(/\r?\n/).slice(1).filter(Boolean).map((l) => {
    const [mabas, codigo, vrcpp, vrdespesas, rec_cpa, cdpln, dspln, faixa] = l.split(";");
    return { mabas: Number(mabas), codigo, recCpp: num(vrcpp), desp: num(vrdespesas), recCpa: num(rec_cpa), cdpln: (cdpln || "").slice(0, 4), dspln: dspln || "", faixa };
  });
}

/** Agrega por plano e faixa; vidas = matrículas distintas; faixa da matrícula = a da última competência. Rec. total = CPP + CPA. */
export function agregarSb(regs: RegSb[], de: number, ate: number, empresa: string, planos: string[]): LinhaEmp[] {
  const emp = empresa.trim().toUpperCase();
  const fs = regs.filter((r) => r.mabas >= de && r.mabas <= ate && (!emp || r.dspln.toUpperCase().includes(emp)) && (!planos.length || planos.includes(r.cdpln)));
  const ult = new Map<string, RegSb>();
  for (const r of fs) { const u = ult.get(r.codigo); if (!u || r.mabas > u.mabas) ult.set(r.codigo, r); }
  const out = new Map<string, LinhaEmp>();
  const vidas = new Map<string, Set<string>>();
  for (const r of fs) {
    const u = ult.get(r.codigo)!;
    const plano = u.cdpln, faixa = normFaixa(u.faixa), k = `${plano}|${faixa}`;
    const l = out.get(k) ?? { plano, faixa, vidas: 0, recCpp: 0, recCopart: 0, recTotal: 0, despTotal: 0 };
    l.recCpp += r.recCpp; l.recCopart += r.recCpa; l.recTotal += r.recCpp + r.recCpa; l.despTotal += r.desp;
    out.set(k, l);
    (vidas.get(k) ?? vidas.set(k, new Set()).get(k)!).add(r.codigo);
  }
  return [...out.entries()].map(([k, l]) => ({ ...l, vidas: vidas.get(k)!.size }));
}

const caches = new Map<string, Promise<RegSb[]>>();
/** arquivo "menu" não tem competência: período é ignorado. */
export async function carregarSb(de: number, ate: number, empresa: string, planos: string[], arquivo = "ard_mensal_sb_v2.csv") {
  if (!caches.has(arquivo)) caches.set(arquivo, fetch(`/data/${arquivo}`).then((r) => { if (!r.ok) throw new Error("CSV não encontrado"); return r.text(); }).then(parseSb));
  const semPeriodo = arquivo !== "ard_mensal_sb_v2.csv";
  return agregarSb(await caches.get(arquivo)!, semPeriodo ? 0 : de, semPeriodo ? 0 : ate, empresa, planos);
}
