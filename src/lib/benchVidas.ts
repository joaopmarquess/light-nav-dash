import Papa from "papaparse";

export const TIPOS_VIDAS = ["saldo", "adesoes", "cancelamentos"] as const;
export type TipoVidas = typeof TIPOS_VIDAS[number];
export const PLANOS_VIDAS = ["PIF", "PCA", "PCE", "Não informado"] as const;
export type PlanoVidas = typeof PLANOS_VIDAS[number];
export const ROTULOS_VIDAS: Record<TipoVidas, string> = { saldo: "Saldo de vidas", adesoes: "Adesões", cancelamentos: "Cancelamentos" };
export type BenchVida = { operadora: string; nome: string; competencia: string; ano: number; mes: number; segmentacao: string; plano: PlanoVidas; tipo: TipoVidas; vidas: number | null };
export type MesVidas = { competencia: string; ano: number; mes: number; saldo: number | null; adesoes: number | null; cancelamentos: number | null; planos: Record<PlanoVidas, Record<TipoVidas, number | null>> };

export function parseBenchVidas(csv: string): BenchVida[] {
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: true });
  if (parsed.errors.length) throw new Error("Não foi possível ler o CSV de vidas.");
  return parsed.data.map(r => {
    const competencia = r.mesano;
    const vidas = Number(r.vidas);
    if (!/^\d{4}(0[1-9]|1[0-2])$/.test(competencia) || !TIPOS_VIDAS.includes(r.tipo as TipoVidas) || !PLANOS_VIDAS.includes(r.contratacao as PlanoVidas) || !Number.isFinite(vidas) || vidas < 0 || !r["cod.operadora"] || !r.nome_ops) throw new Error("O CSV contém um registro de vidas inválido.");
    return { operadora: r["cod.operadora"], nome: r.nome_ops, competencia, ano: Number(competencia.slice(0, 4)), mes: Number(competencia.slice(4)), segmentacao: r.segmentacao, plano: r.contratacao as PlanoVidas, tipo: r.tipo as TipoVidas, vidas };
  });
}

export function parseBenchVidasUnificado(csv: string) {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) throw new Error("Não foi possível ler a planilha de vidas.");
  const linhas = parsed.data;
  const data = (r: Record<string, string>) => r["Mês Competência Normalizado"];
  const chave = (r: Record<string, string>) => `${r.Registro}|${data(r)}`;
  const versao = (r: Record<string, string>) => {
    const [mes, ano] = r["Competência do Arquivo"].split("/");
    return `${ano}${mes.padStart(2, "0")}`;
  };
  const validas = linhas.filter(r => /^\d{4}-(0[1-9]|1[0-2])-01$/.test(data(r)));
  const recentes = new Map<string, string>();
  validas.forEach(r => { if (versao(r) > (recentes.get(chave(r)) ?? "")) recentes.set(chave(r), versao(r)); });
  const selecionadas = validas.filter(r => versao(r) === recentes.get(chave(r)));
  const contratos: Record<string, PlanoVidas> = { "Individual ou Familiar": "PIF", "Coletivo por Adesão": "PCA", "Coletivo Empresarial": "PCE", "": "Não informado" };
  const campos: Record<TipoVidas, string> = { saldo: "Quantidade de Beneficiários", adesoes: "Qtd Adesões", cancelamentos: "Qtd Cancelamentos" };
  const dados: BenchVida[] = selecionadas.flatMap(r => {
    const competencia = data(r).slice(0, 7).replace("-", "");
    const plano = contratos[r["Tipo Contratação do Plano"]];
    if (!plano) throw new Error("Contratação não reconhecida na planilha de vidas.");
    return TIPOS_VIDAS.map(tipo => {
      const raw = r[campos[tipo]];
      const vidas = raw === "" ? null : Number(raw);
      if (vidas !== null && (!Number.isFinite(vidas) || vidas < 0)) throw new Error("Quantidade inválida na planilha de vidas.");
      return { operadora: r.Registro, nome: r["Razão Social"], competencia, ano: Number(competencia.slice(0, 4)), mes: Number(competencia.slice(4)), segmentacao: r["Cobertura Assistencial"].includes("ODONTOL") ? "Odontológico" : "Plano de saúde", plano, tipo, vidas };
    });
  });
  return { dados, totalLinhas: linhas.length, linhasSelecionadas: selecionadas.length, semCompetencia: linhas.length - validas.length, versoesAnteriores: validas.length - selecionadas.length };
}

const somar = (a: number | null, b: number | null) => a === null || b === null ? null : a + b;

export function mesesBenchVidas(dados: BenchVida[], operadora: string, ano: number, plano = "todos", segmentacao = "todos"): MesVidas[] {
  const meses = new Map<string, MesVidas>();
  dados.filter(r => r.operadora === operadora && r.ano === ano && (plano === "todos" || r.plano === plano) && (segmentacao === "todos" || r.segmentacao === segmentacao)).forEach(r => {
    let mes = meses.get(r.competencia);
    if (!mes) {
      mes = { competencia: r.competencia, ano: r.ano, mes: r.mes, saldo: 0, adesoes: 0, cancelamentos: 0, planos: { PIF: { saldo: 0, adesoes: 0, cancelamentos: 0 }, PCA: { saldo: 0, adesoes: 0, cancelamentos: 0 }, PCE: { saldo: 0, adesoes: 0, cancelamentos: 0 }, "Não informado": { saldo: 0, adesoes: 0, cancelamentos: 0 } } };
      meses.set(r.competencia, mes);
    }
    mes[r.tipo] = somar(mes[r.tipo], r.vidas);
    mes.planos[r.plano][r.tipo] = somar(mes.planos[r.plano][r.tipo], r.vidas);
  });
  return [...meses.values()].sort((a, b) => a.competencia.localeCompare(b.competencia));
}

// Saldo is a monthly snapshot supplied by the CSV, never a sum over months or net movement.
export function resumoBenchVidas(meses: MesVidas[]) {
  return { saldo: meses.length ? meses[meses.length - 1].saldo : 0, adesoes: meses.reduce<number | null>((s, m) => somar(s, m.adesoes), 0), cancelamentos: meses.reduce<number | null>((s, m) => somar(s, m.cancelamentos), 0) };
}

export const nomeBenchVidas = (nome: string) => nome === "Bensaude" ? "Bensaúde" : nome === "unimed" ? "Unimed" : nome;
export const competenciaVidas = (competencia: string) => `${competencia.slice(4)}/${competencia.slice(0, 4)}`;