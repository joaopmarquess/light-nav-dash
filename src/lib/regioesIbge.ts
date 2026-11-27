import { MUNICIPIO_IMEDIATA, REGIOES_IMEDIATAS, REGIOES_INTERMEDIARIAS } from "@/data/ibgeRegioes";

export type NivelRegiaoIbge = "intermediaria" | "imediata";
export type LinhaRegiaoIbge = { id: string; nome: string; uf: string; total: number };

/** Normaliza o nome da cidade como na chave do IBGE: maiúsculas, só letras, sem acentos. */
export const chaveCidade = (uf: string, cidade: string) =>
  `${(uf ?? "").trim().toUpperCase()}|${(cidade ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "")}`;

/** Grafias da Carteira e distritos → município IBGE ao qual pertencem. */
export const ALIASES_CIDADE: Record<string, string> = {
  "MG|LIMEIRADOESTE": "MG|LIMEIRADOOESTE",
  "SP|BANDEIRANTESDOESTE": "SP|SUDMENNUCCI",
  "MS|PARAISODAAGUAS": "MS|PARAISODASAGUAS",
  "SP|SAOJOSERIOPRETO": "SP|SAOJOSEDORIOPRETO",
  "SP|ENGENHEIROSCHMITT": "SP|SAOJOSEDORIOPRETO",
  "SP|ENGENHEIROSCHMIDT": "SP|SAOJOSEDORIOPRETO",
  "SP|TALHADO": "SP|SAOJOSEDORIOPRETO",
  "SP|PLANALTOANDRADINA": "SP|ANDRADINA",
  "SP|SIMONSEN": "SP|SANTAFEDOSUL",
  "SP|NOVAITAPIREMA": "SP|NOVAALIANCA",
  "SP|ENGENHEIROBALDUINO": "SP|MONTEAPRAZIVEL",
  "SP|IDAIOLANDA": "SP|NHANDEARA",
  "SP|IBIPORANGA": "SP|TANABI",
  "SP|BAGUACU": "SP|OLIMPIA",
  "SP|SAOJOAODEITAGUACU": "SP|URUPES",
  "SP|MARCONDESIA": "SP|MONTEAZULPAULISTA",
  "SP|VICENTINOPOLIS": "SP|SANTOANTONIODOARACANGUA",
  "MG|SAOSEBASTIAODOPONTAL": "MG|CARNEIRINHO",
  "MG|ALEXANDRITA": "MG|ITURAMA",
  "MG|HONOROPOLIS": "MG|CAMPINAVERDE",
  "MG|APARECIDADEMINAS": "MG|FRUTAL",
  "GO|TERMASDEITAJA": "GO|ITAJA",
  "MS|SAOJOAODOAPORE": "MS|PARANAIBA",
};

export function regiaoImediataDaCidade(uf: string, cidade: string): number | null {
  const k = chaveCidade(uf, cidade);
  return MUNICIPIO_IMEDIATA[ALIASES_CIDADE[k] ?? k] ?? null;
}

/** Soma as vidas por região do IBGE; cidades sem correspondência vão para "Não identificada". Total preservado. */
export function vidasPorRegiaoIbge(rows: { uf: string; cidade: string; ativos: number }[], nivel: NivelRegiaoIbge): LinhaRegiaoIbge[] {
  const acc = new Map<string, LinhaRegiaoIbge>();
  for (const r of rows) {
    const im = regiaoImediataDaCidade(r.uf, r.cidade);
    let linha: Omit<LinhaRegiaoIbge, "total">;
    if (im == null || !REGIOES_IMEDIATAS[im]) linha = { id: "?", nome: "Não identificada", uf: "" };
    else if (nivel === "imediata") { const [nome, , uf] = REGIOES_IMEDIATAS[im]; linha = { id: String(im), nome, uf }; }
    else { const it = REGIOES_IMEDIATAS[im][1]; const [nome, uf] = REGIOES_INTERMEDIARIAS[it]; linha = { id: String(it), nome, uf }; }
    const atual = acc.get(linha.id) ?? { ...linha, total: 0 };
    atual.total += r.ativos;
    acc.set(linha.id, atual);
  }
  return [...acc.values()].sort((a, b) => (a.id === "?" ? 1 : b.id === "?" ? -1 : b.total - a.total || a.nome.localeCompare(b.nome)));
}
