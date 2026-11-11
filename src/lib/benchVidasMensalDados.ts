import type { Cubo } from "./benchVidasMensal";

// Arquivos por operadora, ano e cubo, gerados por scripts/bench-vidas/import_ans_mensal_*.py.
const arquivos = import.meta.glob<{ default: { url: string } }>("../data/benchVidas/mensal/*.asset.json", { eager: true });
const cache = new Map<string, Promise<number[][]>>();

export const parteDisponivel = (reg: string, ano: number, cubo: Cubo) => !!arquivos[`../data/benchVidas/mensal/${reg}-${ano}-${cubo}.asset.json`];

function carregarParte(reg: string, ano: number, cubo: Cubo): Promise<number[][]> {
  const chave = `${reg}-${ano}-${cubo}`;
  const existente = cache.get(chave);
  if (existente) return existente;
  const fonte = arquivos[`../data/benchVidas/mensal/${chave}.asset.json`]?.default;
  if (!fonte) return Promise.resolve([]);
  const url = typeof window !== "undefined" && window.location.hostname === "localhost" ? new URL(fonte.url, "https://axisbensaude.lovable.app").href : fonte.url;
  const request = fetch(url).then(async response => {
    if (!response.ok) throw new Error("Não foi possível carregar a base mensal da ANS.");
    const linhas: unknown = await response.json();
    if (!Array.isArray(linhas) || linhas.some(l => !Array.isArray(l))) throw new Error("Base mensal da ANS inválida.");
    return linhas as number[][];
  }).catch(error => { cache.delete(chave); throw error; });
  cache.set(chave, request);
  return request;
}

export async function carregarVidasMensal(reg: string, anos: number[], cubo: Cubo): Promise<number[][]> {
  const partes = await Promise.all(anos.map(ano => carregarParte(reg, ano, cubo)));
  return partes.flat();
}
