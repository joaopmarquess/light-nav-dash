export const FAIXAS_ANS = ["00 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 ou +"];
const LIMITES = [18, 23, 28, 33, 38, 43, 48, 53, 58];

export type BenefTabela = {
  nr_cpf: string | null;
  tp_acomodacao: string | null;
  dt_nascimento: string | null;
  dt_vigencia_beneficiario: string | null;
  dt_desligamento: string | null;
  dt_reativacao: string | null;
  vl_tmm?: number | null;
};

export const idadeEm = (nasc: string, ref: string) => {
  const [y, m, d] = nasc.slice(0, 10).split("-").map(Number);
  const [ry, rm, rd] = ref.split("-").map(Number);
  return ry - y - (rm < m || (rm === m && rd < d) ? 1 : 0);
};

export const faixaIndex = (idade: number) => {
  const i = LIMITES.findIndex((l) => idade <= l);
  return i === -1 ? 9 : i;
};

export const ativoEm = (r: BenefTabela, ref: string) => {
  const vig = r.dt_vigencia_beneficiario?.slice(0, 10);
  if (!vig || vig > ref) return false;
  const desl = r.dt_desligamento?.slice(0, 10);
  if (!desl || desl > ref) return true;
  const reat = r.dt_reativacao?.slice(0, 10);
  return !!reat && reat >= desl && reat <= ref;
};

/** Faixas para matrículas cujo cd_mat_alternativa começa com o plano (bigint). */
export const planoOrFilter = (plano: string) =>
  `(${Array.from({ length: 12 }, (_, k) => `and(cd_mat_alternativa.gte.${plano}${"0".repeat(k)},cd_mat_alternativa.lt.${Number(plano) + 1}${"0".repeat(k)})`).join(",")})`;

/** Enfermaria = PRATA; Apartamento = OURO. Conta CPFs distintos ativos na data. */
export function agruparFaixas(rows: BenefTabela[], ref: string) {
  const enf = FAIXAS_ANS.map(() => new Set<string>());
  const apt = FAIXAS_ANS.map(() => new Set<string>());
  const tEnf = FAIXAS_ANS.map(() => [] as number[]);
  const tApt = FAIXAS_ANS.map(() => [] as number[]);
  for (const r of rows) {
    if (!r.nr_cpf || !r.dt_nascimento || !ativoEm(r, ref)) continue;
    const ac = (r.tp_acomodacao ?? "").toUpperCase();
    const alvo = ac === "PRATA" ? enf : ac === "OURO" ? apt : null;
    if (!alvo) continue;
    const i = faixaIndex(idadeEm(r.dt_nascimento, ref));
    alvo[i].add(r.nr_cpf);
    if (r.vl_tmm != null) (alvo === enf ? tEnf : tApt)[i].push(Number(r.vl_tmm));
  }
  const faixaTmm = (v: number[]) => (v.length ? { min: Math.min(...v), max: Math.max(...v) } : null);
  return FAIXAS_ANS.map((faixa, i) => ({
    faixa, enfermaria: enf[i].size, apartamento: apt[i].size, total: enf[i].size + apt[i].size,
    tmmEnfermaria: faixaTmm(tEnf[i]), tmmApartamento: faixaTmm(tApt[i]),
  }));
}
