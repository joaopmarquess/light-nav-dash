import { PLANOS_VIDAS, type BenchVida, type PlanoVidas } from "./benchVidas";

export function periodoPadraoVidasAns(data = new Date()) {
  const ano = data.getFullYear();
  return { de: ano, ate: ano };
}

export function limitesPeriodoVidasAns(anos: number[]) {
  return anos.length ? { de: Math.min(...anos), ate: Math.max(...anos) } : periodoPadraoVidasAns();
}

export function crescimentoPeriodoVidasAns(meses: { competencia: string; saldo: number | null }[]) {
  const ordenados = [...meses].sort((a, b) => a.competencia.localeCompare(b.competencia));
  const inicial = ordenados[0]?.saldo;
  const final = ordenados.at(-1)?.saldo;
  return inicial == null || final == null ? null : final - inicial;
}

export function escalaVidasAns(total: number | null) {
  const saldo = Math.max(0, total ?? 0);
  const arredondar = (valor: number) => Math.ceil(valor / 10000) * 10000;
  const limite = saldo > 0 ? arredondar(saldo * 1.8) : 10000;
  return { dominio: [0, limite] as [number, number], marcas: [...new Set([0, arredondar(saldo * 0.9), limite])] };
}

export function planosDisponiveisAns(dados: BenchVida[], operadora: string, ano: number, segmentacao = "todos", competencia?: string): PlanoVidas[] {
  const presentes = new Set(dados.filter(r => r.operadora === operadora && r.ano === ano && r.tipo === "saldo" && (segmentacao === "todos" || r.segmentacao === segmentacao) && (!competencia || r.competencia === competencia)).map(r => r.plano));
  return PLANOS_VIDAS.filter(p => presentes.has(p));
}

export function nomeOperadoraAns(nome: string): string {
  const titulo = (texto: string) => texto.toLocaleLowerCase("pt-BR").replace(/(^|[\s/\-])\p{L}/gu, s => s.toLocaleUpperCase("pt-BR")).replace(/\b(De|Do|Da|Dos|Das|E)\b/g, s => s.toLowerCase());
  const limpo = nome.trim().replace(/\s+/g, " ");
  if (/\bUNIMED\b/i.test(limpo)) {
    const local = limpo.replace(/^.*?\bUNIMED\b[\s-]*/i, "").replace(/^DE\s+/i, "").split(/\s*[-–]\s*(?=COOP|SOC|FED|CONF)|\b(?:COOP\w*\.?|SOCIEDADE|SOC\.|FEDERA\w*|FED\.|CONF\w*)(?=[\s.]|$)/i)[0].trim().replace(/(?:[/,\s-]+)(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i, "").replace(/[\s,-]+$/, "");
    return local ? `Unimed ${titulo(local)}` : "Unimed";
  }
  const primeiro = limpo.split(" ")[0] ?? "";
  return /^bensa[uú]de$/i.test(primeiro) ? "Bensaúde" : titulo(primeiro);
}

export type RegistroAnsVidas = [string, string, string, number, number];
const contratos: Record<string, PlanoVidas> = { "0": "Não informado", "1": "PIF", "2": "PCE", "3": "PCA", "4": "PIF + PCE" };

export function adaptarVidasAns(registros: RegistroAnsVidas[], nomes: Map<string, string>): BenchVida[] {
  return registros.flatMap(([operadora, competencia, contrato, medico, odonto]) => {
    const plano = contratos[contrato];
    if (!plano || !/^\d{4}(03|06|09|12)$/.test(competencia) || ![medico, odonto].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error("Registro ANS inválido.");
    return ([['Plano de saúde', medico], ['Odontológico', odonto]] as const).flatMap(([segmentacao, vidas]) => {
      const base = { operadora, nome: nomes.get(operadora) ?? `ANS ${operadora}`, competencia, ano: Number(competencia.slice(0, 4)), mes: Number(competencia.slice(4)), plano, segmentacao };
      return [{ ...base, tipo: "saldo" as const, vidas }, { ...base, tipo: "adesoes" as const, vidas: null }, { ...base, tipo: "cancelamentos" as const, vidas: null }];
    });
  });
}

const arquivos = import.meta.glob<{ default: { url: string } }>("../data/benchVidas/ans/*.asset.json", { eager: true });
const cache = new Map<number, Promise<RegistroAnsVidas[]>>();
export function carregarVidasAns(ano: number): Promise<RegistroAnsVidas[]> {
  const existente = cache.get(ano);
  if (existente) return existente;
  const fonte = arquivos[`../data/benchVidas/ans/${ano}.asset.json`]?.default;
  if (!fonte) return Promise.reject(new Error("Ano indisponível na base ANS."));
  const url = typeof window !== "undefined" && window.location.hostname === "localhost" ? new URL(fonte.url, "https://axisbensaude.lovable.app").href : fonte.url;
  const request = fetch(url).then(async response => {
    if (!response.ok) throw new Error("Não foi possível carregar a base ANS.");
    const registros: unknown = await response.json();
    if (!Array.isArray(registros) || registros.some(r => !Array.isArray(r) || r.length !== 5)) throw new Error("Base ANS inválida.");
    return registros as RegistroAnsVidas[];
  }).catch(error => { cache.delete(ano); throw error; });
  cache.set(ano, request);
  return request;
}