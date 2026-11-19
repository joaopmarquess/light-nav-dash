/** Regras de apresentação de Carteira › Entradas/Saídas sobre as linhas já carregadas (não consulta a base). */
type Row = Record<string, unknown>;

/** Rótulo MM/AAAA de uma data ISO (AAAA-MM-DD…). */
export const mesAno = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Matrículas distintas por mês da data do movimento, em ordem cronológica e incluindo meses sem movimento entre De e Até. */
export function contagemMensal(rows: Row[], campo: string, de: string, ate: string): { mes: string; qtd: number }[] {
  const porMes = new Map<string, Set<string>>();
  for (const r of rows) {
    const d = String(r[campo] ?? "").slice(0, 7);
    if (d.length !== 7) continue;
    if (!porMes.has(d)) porMes.set(d, new Set());
    porMes.get(d)!.add(String(r.cd_mat_alternativa));
  }
  const out: { mes: string; qtd: number }[] = [];
  let [a, m] = [Number(de.slice(0, 4)), Number(de.slice(5, 7))];
  const [aF, mF] = [Number(ate.slice(0, 4)), Number(ate.slice(5, 7))];
  while (a < aF || (a === aF && m <= mF)) {
    const k = `${a}-${String(m).padStart(2, "0")}`;
    out.push({ mes: mesAno(k), qtd: porMes.get(k)?.size ?? 0 });
    m++; if (m > 12) { m = 1; a++; }
  }
  return out;
}

/** Visões do nível 1 do grid de Entradas (pedido do Dênis, 19/11/2026); Vendedor continua sendo o padrão. */
export const NIVEIS_ENTRADAS = [
  { id: "vendedor", rotulo: "Vendedor" },
  { id: "planoCodigo", rotulo: "Plano (código)" },
  { id: "produto", rotulo: "Descrição do plano" },
  { id: "grupo", rotulo: "Grupo de vendedor" },
  { id: "empresa", rotulo: "Empresa" },
  { id: "cidade", rotulo: "Cidade" },
] as const;
export type NivelEntradas = (typeof NIVEIS_ENTRADAS)[number]["id"];

/** Plano = 4 primeiros dígitos da matrícula (Plano 4 + Contrato 6 + Dep 2, com zeros à esquerda); vazio se a matrícula não tiver esse formato. */
export function codigoPlano(matricula: unknown): string {
  const d = String(matricula ?? "").replace(/\D/g, "");
  if (!d || d.length > 12 || /^0+$/.test(d)) return "";
  return d.padStart(12, "0").slice(0, 4);
}

/** Descrição mais frequente de cada código de plano nas linhas carregadas (empate: ordem alfabética), para nomear o grupo. */
export function descricoesPorPlano(rows: Row[]): Map<string, string> {
  const cont = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const c = codigoPlano(r.cd_mat_alternativa);
    const ds = String(r.ds_plano ?? "").trim();
    if (!c || !ds) continue;
    if (!cont.has(c)) cont.set(c, new Map());
    const m = cont.get(c)!;
    m.set(ds, (m.get(ds) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const [c, m] of cont) out.set(c, [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]);
  return out;
}

/** Chave do nível 1 de uma linha de Entradas. */
export function chaveEntrada(
  r: Row, nivel: NivelEntradas,
  ctx: { grupos: Record<string, string | undefined>; descricoes: Map<string, string> },
): string {
  const t = (v: unknown, padrao: string) => String(v ?? "").trim() || padrao;
  switch (nivel) {
    case "planoCodigo": {
      const c = codigoPlano(r.cd_mat_alternativa);
      if (!c) return "SEM PLANO";
      const ds = ctx.descricoes.get(c);
      return ds ? `${c} · ${ds}` : c;
    }
    case "produto": return t(r.ds_plano, "SEM PLANO");
    case "grupo": return t(ctx.grupos[String(r.cd_vendedor)], "SEM GRUPO");
    case "empresa": return t(r.nm_empresa_estipulante, "SEM EMPRESA");
    case "cidade": return r.nm_cidade_plano ? `${String(r.nm_cidade_plano).trim()}${r.cd_uf_plano ? ` (${r.cd_uf_plano})` : ""}` : "SEM CIDADE";
    default: return t(r.nm_vendedor, "SEM VENDEDOR");
  }
}
