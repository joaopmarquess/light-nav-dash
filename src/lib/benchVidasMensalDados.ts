import type { Cubo } from "./benchVidasMensal";

// Índice gerado por scripts/bench-vidas/import_ans_mensal_todas_*.py: por operadora e cubo, um arquivo
// com todos os anos ({ "2021": linhas, ... }) ou um arquivo por ano (linhas).
type Indice = Record<string, Partial<Record<Cubo, string | Record<string, string>>>>;
let indice: Promise<Indice> | null = null;
const carregarIndice = () => indice ??= import("@/data/benchVidas/mensal/indice.json").then(m => m.default as unknown as Indice).catch(e => { indice = null; throw e; });
const arquivos = new Map<string, Promise<unknown>>();

function urlAsset(id: string, nome: string) {
  const caminho = `/__l5e/assets-v1/${id}/${nome}`;
  return typeof window !== "undefined" && window.location.hostname === "localhost" ? new URL(caminho, "https://axisbensaude.lovable.app").href : caminho;
}
function baixar(id: string, nome: string): Promise<unknown> {
  const existente = arquivos.get(id);
  if (existente) return existente;
  const request = fetch(urlAsset(id, nome)).then(r => { if (!r.ok) throw new Error("Não foi possível carregar a base mensal da ANS."); return r.json(); })
    .catch(e => { arquivos.delete(id); throw e; });
  arquivos.set(id, request);
  return request;
}
const linhasValidas = (v: unknown): number[][] => {
  if (!Array.isArray(v) || v.some(l => !Array.isArray(l))) throw new Error("Base mensal da ANS inválida.");
  return v as number[][];
};

export async function carregarVidasMensal(reg: string, anos: number[], cubo: Cubo): Promise<number[][]> {
  const fonte = (await carregarIndice())[reg]?.[cubo];
  if (!fonte) return [];
  if (typeof fonte === "string") {
    const todos = await baixar(fonte, `bench-vidas-mensal-${reg}-${cubo}.json`) as Record<string, unknown>;
    return anos.flatMap(a => todos[String(a)] ? linhasValidas(todos[String(a)]) : []);
  }
  const partes = await Promise.all(anos.map(a => fonte[String(a)] ? baixar(fonte[String(a)], `bench-vidas-mensal-${reg}-${a}-${cubo}.json`).then(linhasValidas) : Promise.resolve([])));
  return partes.flat();
}
