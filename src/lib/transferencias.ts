// Conceito de Transferência (ligação somente por CPF):
// uma saída com motivo do grupo "Transferência" é transferência quando o mesmo CPF
// tem nova matrícula com entrada no mesmo mês da saída ou no mês seguinte.
// Tipo da reentrada: Pura (vendedor 273/274) ou Revenda (qualquer outro vendedor).

export const VEND_PURA = new Set([273, 274]);
export type TipoReentrada = "Pura" | "Revenda";
export type TransfMat = { cpf: string; mat: string; nome: string; vig: string; desl: string; vendedor: number | null; nmVendedor?: string; motivo: number | null };
export type TransfPar = { cpf: string; nome: string; matAnterior: string; saida: string; motivo: number | null; matNova: string; entrada: string; vendedor: number | null; nmVendedor?: string; tipo: TipoReentrada };

export const cpfChave = (v: unknown) => String(v ?? "").replace(/\D/g, "").replace(/^0+/, "");
const mesIdx = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7));
/** Entrada no mesmo mês da saída ou no mês seguinte. */
export const mesValido = (saida: string, entrada: string) => { const d = mesIdx(entrada) - mesIdx(saida); return d === 0 || d === 1; };
export const tipoReentrada = (vend: number | null): TipoReentrada => (vend != null && VEND_PURA.has(Number(vend)) ? "Pura" : "Revenda");

function porCpf(cand: TransfMat[]) {
  const m = new Map<string, TransfMat[]>();
  for (const c of cand) { const k = cpfChave(c.cpf); if (k) (m.get(k) ?? m.set(k, []).get(k)!).push(c); }
  return m;
}

/** Saídas do período com motivo de transferência que têm reentrada válida. */
export function transfSaidas(saidas: TransfMat[], cand: TransfMat[], motT: Set<number>): Map<string, TransfPar> {
  const idx = porCpf(cand); const out = new Map<string, TransfPar>();
  for (const s of saidas) {
    if (!s.desl || s.motivo == null || !motT.has(Number(s.motivo))) continue;
    const nova = (idx.get(cpfChave(s.cpf)) ?? [])
      .filter((c) => c.mat !== s.mat && c.vig && mesValido(s.desl, c.vig))
      .sort((a, b) => Math.abs(+new Date(a.vig) - +new Date(s.desl)) - Math.abs(+new Date(b.vig) - +new Date(s.desl)))[0];
    if (!nova) continue;
    out.set(`${s.mat}|${s.desl}`, { cpf: s.cpf, nome: s.nome, matAnterior: s.mat, saida: s.desl, motivo: s.motivo, matNova: nova.mat, entrada: nova.vig, vendedor: nova.vendedor, nmVendedor: nova.nmVendedor, tipo: tipoReentrada(nova.vendedor) });
  }
  return out;
}

/** Entradas do período que são reentrada de uma saída por transferência válida. */
export function transfEntradas(entradas: TransfMat[], cand: TransfMat[], motT: Set<number>): Map<string, TransfPar> {
  const idx = porCpf(cand); const out = new Map<string, TransfPar>();
  for (const e of entradas) {
    if (!e.vig) continue;
    const ant = (idx.get(cpfChave(e.cpf)) ?? [])
      .filter((c) => c.mat !== e.mat && c.desl && c.motivo != null && motT.has(Number(c.motivo)) && mesValido(c.desl, e.vig))
      .sort((a, b) => Math.abs(+new Date(a.desl) - +new Date(e.vig)) - Math.abs(+new Date(b.desl) - +new Date(e.vig)))[0];
    if (!ant) continue;
    out.set(`${e.mat}|${e.vig}`, { cpf: e.cpf, nome: e.nome, matAnterior: ant.mat, saida: ant.desl, motivo: ant.motivo, matNova: e.mat, entrada: e.vig, vendedor: e.vendedor, nmVendedor: e.nmVendedor, tipo: tipoReentrada(e.vendedor) });
  }
  return out;
}
