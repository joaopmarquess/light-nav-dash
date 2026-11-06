import type { BenchVida, PlanoVidas } from "./benchVidas";

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