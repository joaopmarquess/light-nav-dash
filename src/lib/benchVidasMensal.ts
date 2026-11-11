// Bench Vidas Mensal: leitura dos cubos mensais da ANS (PDA 024) e agregações da tela.
// Ativos são estoque do mês; adesões e cancelamentos são movimentos informados no mês. Nada é inferido.

export type Cubo = "A" | "M" | "P";
export type CampoMensal = "uf" | "municipio" | "sexo" | "faixa" | "faixaReaj" | "vigencia" | "contratacao" | "segmentacao" | "abrangencia" | "cobertura" | "vinculo" | "plano";
export type IndicadorMensal = "ativos" | "aderidos" | "cancelados" | "saldo";
export type Filtros = Partial<Record<CampoMensal, number>>;
export type Medidas = { ativos: number; aderidos: number; cancelados: number };
export type CatalogoMensal = { valores: Record<Exclude<CampoMensal, "municipio">, string[]>; municipios: [string, string, string][] };

export const CAMPOS_MENSAL: { id: CampoMensal; rotulo: string }[] = [
  { id: "uf", rotulo: "UF" }, { id: "municipio", rotulo: "Município" }, { id: "sexo", rotulo: "Sexo" },
  { id: "faixa", rotulo: "Faixa etária" }, { id: "faixaReaj", rotulo: "Faixa ANS" }, { id: "contratacao", rotulo: "Contratação" },
  { id: "segmentacao", rotulo: "Segmentação" }, { id: "abrangencia", rotulo: "Abrangência" }, { id: "cobertura", rotulo: "Cobertura" },
  { id: "vinculo", rotulo: "Vínculo" }, { id: "vigencia", rotulo: "Lei 9.656" }, { id: "plano", rotulo: "Plano" },
];
export const INDICADORES_MENSAL: { id: IndicadorMensal; rotulo: string }[] = [
  { id: "ativos", rotulo: "Ativos" }, { id: "aderidos", rotulo: "Adesões" }, { id: "cancelados", rotulo: "Cancelamentos" }, { id: "saldo", rotulo: "Adesões − Cancel." },
];

// Posição de cada campo na linha de cada cubo (coluna 0 = competência aaaamm; as três últimas = medidas).
const POSICOES: Record<Cubo, Partial<Record<CampoMensal, number>>> = {
  A: { uf: 1, sexo: 2, faixa: 3, faixaReaj: 4, vigencia: 5, contratacao: 6, segmentacao: 7, abrangencia: 8, cobertura: 9, vinculo: 10 },
  M: { municipio: 1, contratacao: 2, cobertura: 3, vinculo: 4 },
  P: { plano: 1, contratacao: 2, segmentacao: 3, abrangencia: 4, cobertura: 5, vigencia: 6 },
};
const ROTULOS_FIXOS: Partial<Record<CampoMensal, Record<string, string>>> = {
  sexo: { M: "Masculino", F: "Feminino" },
  vigencia: { A: "Antigo (antes da Lei 9.656/98)", P: "Novo (após a Lei 9.656/98)" },
};

/** Cubo usado para o campo detalhado e os filtros: município e plano têm cubos próprios. */
export function cuboPara(detalhar: CampoMensal, filtros: Filtros): Cubo {
  if (detalhar === "municipio" || filtros.municipio !== undefined) return "M";
  if (detalhar === "plano" || filtros.plano !== undefined) return "P";
  return "A";
}
/** No cubo de município, a UF vem do próprio município. */
export function campoDisponivel(cubo: Cubo, campo: CampoMensal): boolean {
  return POSICOES[cubo][campo] !== undefined || (cubo === "M" && campo === "uf");
}
/** Campos que podem ser usados juntos com o detalhamento atual. */
export function camposCompativeis(detalhar: CampoMensal, filtros: Filtros): CampoMensal[] {
  const cubo = cuboPara(detalhar, filtros);
  return CAMPOS_MENSAL.map(c => c.id).filter(c => {
    if (campoDisponivel(cubo, c)) return true;
    // Fora do cubo atual, só vale se trocar de cubo não exigir abandonar o detalhamento ou outro filtro.
    const alvo: Cubo | null = c === "municipio" ? "M" : c === "plano" ? "P" : null;
    if (!alvo || cubo !== "A") return false;
    return campoDisponivel(alvo, detalhar) && Object.keys(filtros).every(f => campoDisponivel(alvo, f as CampoMensal));
  });
}
/** Remove filtros que não convivem com o cubo do detalhamento escolhido. */
export function ajustarFiltros(detalhar: CampoMensal, filtros: Filtros): Filtros {
  const cubo = cuboPara(detalhar, {});
  const base = Object.fromEntries(Object.entries(filtros).filter(([c]) => campoDisponivel(cubo, c as CampoMensal) || (cubo === "A" && (c === "municipio" || c === "plano") && campoDisponivel(c === "municipio" ? "M" : "P", detalhar)))) as Filtros;
  const final = cuboPara(detalhar, base);
  return Object.fromEntries(Object.entries(base).filter(([c]) => campoDisponivel(final, c as CampoMensal))) as Filtros;
}

/** Opção agrupada do filtro de Segmentação: todas as segmentações médico-hospitalares (tudo, exceto Odontológico). */
export const SEGMENTACAO_PLANO_SAUDE = -1;
const SEGMENTACAO_ODONTO = "Odontológico";
/** Ao abrir o Mensal, Segmentação mostra tudo menos Odontológico. */
export const FILTROS_PADRAO_MENSAL: Filtros = { segmentacao: SEGMENTACAO_PLANO_SAUDE };
/** Índices reais do catálogo que uma opção de filtro representa. */
export function indicesDaOpcao(catalogo: CatalogoMensal, campo: CampoMensal, indice: number): number[] {
  if (campo === "segmentacao" && indice === SEGMENTACAO_PLANO_SAUDE)
    return catalogo.valores.segmentacao.map((v, i) => [v, i] as const).filter(([v]) => v !== SEGMENTACAO_ODONTO).map(([, i]) => i);
  return [indice];
}

export function rotuloValor(catalogo: CatalogoMensal, campo: CampoMensal, indice: number): string {
  if (campo === "segmentacao" && indice === SEGMENTACAO_PLANO_SAUDE) return "Plano de saúde";
  if (campo === "municipio") { const m = catalogo.municipios[indice]; return m ? `${m[1]} · ${m[2]}` : "—"; }
  const valor = catalogo.valores[campo]?.[indice] ?? "—";
  return ROTULOS_FIXOS[campo]?.[valor] ?? valor;
}
export function opcoesCampo(catalogo: CatalogoMensal, campo: CampoMensal): { indice: number; rotulo: string }[] {
  const n = campo === "municipio" ? catalogo.municipios.length : catalogo.valores[campo]?.length ?? 0;
  const opcoes = Array.from({ length: n }, (_, indice) => ({ indice, rotulo: rotuloValor(catalogo, campo, indice) }));
  if (campo !== "segmentacao") return opcoes;
  // Segmentação: primeiro "Plano de saúde" e "Odontológico"; depois o detalhe das segmentações de plano de saúde.
  const odonto = opcoes.filter(o => o.rotulo === SEGMENTACAO_ODONTO);
  return [{ indice: SEGMENTACAO_PLANO_SAUDE, rotulo: "Plano de saúde" }, ...odonto, ...opcoes.filter(o => o.rotulo !== SEGMENTACAO_ODONTO)];
}

function valorCampo(cubo: Cubo, campo: CampoMensal, linha: number[], catalogo: CatalogoMensal, ufIndice: Map<string, number>): number | undefined {
  const pos = POSICOES[cubo][campo];
  if (pos !== undefined) return linha[pos];
  if (cubo === "M" && campo === "uf") return ufIndice.get(catalogo.municipios[linha[1]]?.[2] ?? "");
  return undefined;
}

export const valorIndicador = (m: Medidas, indicador: IndicadorMensal) => indicador === "saldo" ? m.aderidos - m.cancelados : m[indicador];

export type ResultadoMensal = {
  competencias: number[];
  total: Map<number, Medidas>;
  linhas: { indice: number; rotulo: string; meses: Map<number, Medidas> }[];
};
/** Soma os cubos pelo campo detalhado, nas competências do período e com os filtros informados. */
export function agregarMensal(linhas: number[][], cubo: Cubo, catalogo: CatalogoMensal, opcoes: { de: number; ate: number; detalhar: CampoMensal; filtros: Filtros }): ResultadoMensal {
  const ufIndice = new Map(catalogo.valores.uf.map((v, i) => [v, i]));
  const filtros = (Object.entries(opcoes.filtros) as [CampoMensal, number][]).map(([campo, v]) => [campo, new Set(indicesDaOpcao(catalogo, campo, v))] as const);
  const grupos = new Map<number, Map<number, Medidas>>(); const total = new Map<number, Medidas>(); const comps = new Set<number>();
  const somar = (mapa: Map<number, Medidas>, comp: number, l: number[]) => {
    const m = mapa.get(comp) ?? { ativos: 0, aderidos: 0, cancelados: 0 };
    m.ativos += l[l.length - 3]; m.aderidos += l[l.length - 2]; m.cancelados += l[l.length - 1]; mapa.set(comp, m);
  };
  for (const l of linhas) {
    const comp = l[0];
    if (comp < opcoes.de || comp > opcoes.ate) continue;
    if (filtros.some(([campo, aceitos]) => { const v = valorCampo(cubo, campo, l, catalogo, ufIndice); return v === undefined || !aceitos.has(v); })) continue;
    comps.add(comp);
    const chave = valorCampo(cubo, opcoes.detalhar, l, catalogo, ufIndice) ?? -1;
    if (!grupos.has(chave)) grupos.set(chave, new Map());
    somar(grupos.get(chave)!, comp, l); somar(total, comp, l);
  }
  const competencias = [...comps].sort((a, b) => a - b);
  const ultima = competencias.at(-1);
  const peso = (meses: Map<number, Medidas>) => (ultima !== undefined ? meses.get(ultima)?.ativos ?? 0 : 0) * 1e9 + [...meses.values()].reduce((s, m) => s + m.aderidos + m.cancelados, 0);
  return {
    competencias, total,
    linhas: [...grupos.entries()].map(([indice, meses]) => ({ indice, rotulo: indice < 0 ? "Não informado" : rotuloValor(catalogo, opcoes.detalhar, indice), meses }))
      .sort((a, b) => peso(b.meses) - peso(a.meses) || a.rotulo.localeCompare(b.rotulo, "pt-BR")),
  };
}

/** Total do período: ativos = último mês (estoque, nunca somado); movimentos = soma dos meses. */
export function totalPeriodo(meses: Map<number, Medidas>, competencias: number[], indicador: IndicadorMensal): number | null {
  if (!competencias.length) return null;
  if (indicador === "ativos") return meses.get(competencias.at(-1)!)?.ativos ?? 0;
  return competencias.reduce((s, c) => s + valorIndicador(meses.get(c) ?? { ativos: 0, aderidos: 0, cancelados: 0 }, indicador), 0);
}
export function resumoMensal(total: Map<number, Medidas>, competencias: number[]) {
  if (!competencias.length) return null;
  const inicio = competencias[0], fim = competencias.at(-1)!;
  const ativosInicio = total.get(inicio)?.ativos ?? 0, ativosFim = total.get(fim)?.ativos ?? 0;
  return { inicio, fim, ativosInicio, ativosFim, aderidos: totalPeriodo(total, competencias, "aderidos") ?? 0, cancelados: totalPeriodo(total, competencias, "cancelados") ?? 0, variacao: ativosFim - ativosInicio, percentual: ativosInicio ? (ativosFim - ativosInicio) / ativosInicio * 100 : null };
}

export const competenciaMensal = (c: number | string) => { const s = String(c); return `${s.slice(4, 6)}/${s.slice(0, 4)}`; };
export function anosDoPeriodo(de: number, ate: number): number[] {
  const anos: number[] = []; for (let a = Math.floor(de / 100); a <= Math.floor(ate / 100); a++) anos.push(a); return anos;
}
/** Período padrão: 12 meses terminando na última competência disponível. */
export function periodoPadrao(competencias: number[]): { de: number; ate: number } {
  const ate = competencias.at(-1)!; return { de: competencias[Math.max(0, competencias.length - 12)], ate };
}
