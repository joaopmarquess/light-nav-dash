export type TransfEv = { cpf: string; mat: string; nome: string; data: string };
export type TransfCand = { cpf: string; mat: string; vig: string; desl: string };
export type TransfItem = { cpf: string; nome: string; matAnterior: string | null; matNova: string | null; saida: string | null; entrada: string | null };
export type TransfGrupo = "veioAntes" | "dentroChegada" | "semAnterior" | "dentro" | "depois" | "semNova";

export const cpfChave = (v: unknown) => String(v ?? "").replace(/\D/g, "").replace(/^0+/, "");

/** Classifica transferências do período ligando matrículas somente por CPF. */
export function classificarTransferencias(chegadas: TransfEv[], partidas: TransfEv[], cand: TransfCand[], de: string, ate: string) {
  const porCpf = new Map<string, TransfCand[]>();
  for (const c of cand) {
    const k = cpfChave(c.cpf);
    if (!k) continue;
    (porCpf.get(k) ?? porCpf.set(k, []).get(k)!).push(c);
  }
  const g: Record<TransfGrupo, TransfItem[]> = { veioAntes: [], dentroChegada: [], semAnterior: [], dentro: [], depois: [], semNova: [] };

  for (const e of chegadas) {
    const ant = (porCpf.get(cpfChave(e.cpf)) ?? [])
      .filter((c) => c.mat !== e.mat && c.desl && c.desl <= e.data)
      .sort((a, b) => b.desl.localeCompare(a.desl))[0];
    const item: TransfItem = { cpf: e.cpf, nome: e.nome, matAnterior: ant?.mat ?? null, matNova: e.mat, saida: ant?.desl ?? null, entrada: e.data };
    if (!ant) g.semAnterior.push(item);
    else if (ant.desl < de) g.veioAntes.push(item);
    else g.dentroChegada.push(item);
  }

  for (const e of partidas) {
    const nova = (porCpf.get(cpfChave(e.cpf)) ?? [])
      .filter((c) => c.mat !== e.mat && c.vig && c.vig >= e.data)
      .sort((a, b) => a.vig.localeCompare(b.vig))[0];
    const item: TransfItem = { cpf: e.cpf, nome: e.nome, matAnterior: e.mat, matNova: nova?.mat ?? null, saida: e.data, entrada: nova?.vig ?? null };
    if (!nova) g.semNova.push(item);
    else if (nova.vig > ate) g.depois.push(item);
    else g.dentro.push(item);
  }

  const saldo = g.veioAntes.length + g.semAnterior.length - g.depois.length - g.semNova.length;
  return { grupos: g, saldo };
}
