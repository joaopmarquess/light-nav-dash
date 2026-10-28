import cadastro from "@/data/hospitais/guia-medico-2026-10-28.json";

export interface HospitaisCidade {
  cidade: string;
  uf: string;
  quantidade: number;
  hospitais: string[];
}

const chave = (cidade: string, uf: string) => `${uf.trim().toUpperCase()}|${cidade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'").trim().toUpperCase()}`;

export function indexarHospitais(rows: readonly HospitaisCidade[]) {
  return new Map(rows.filter((row) => row.quantidade >= 1).map((row) => [chave(row.cidade, row.uf), row]));
}

const indice = indexarHospitais(cadastro);

export const cidadesComHospitais: readonly HospitaisCidade[] = [...indice.values()].sort((a, b) => a.cidade.localeCompare(b.cidade, "pt-BR") || a.uf.localeCompare(b.uf));

export function ordenarCidadesComHospitais(cityTotalsByUF: Record<string, Record<string, number>>, cidades: readonly HospitaisCidade[] = cidadesComHospitais) {
  const vidasPorCidade = new Map<string, number>();
  for (const [uf, cidadesUF] of Object.entries(cityTotalsByUF)) {
    for (const [cidade, vidas] of Object.entries(cidadesUF)) {
      const id = chave(cidade, uf);
      vidasPorCidade.set(id, (vidasPorCidade.get(id) ?? 0) + vidas);
    }
  }
  return cidades.map((row) => ({ ...row, vidas: vidasPorCidade.get(chave(row.cidade, row.uf)) ?? 0 }))
    .sort((a, b) => b.quantidade - a.quantidade || b.vidas - a.vidas || a.cidade.localeCompare(b.cidade, "pt-BR") || a.uf.localeCompare(b.uf));
}

export function hospitaisDaCidade(cidade: string, uf: string) {
  return indice.get(chave(cidade, uf));
}

export function quantidadeHospitaisPsiquiatricos(cidade: string, uf: string) {
  return chave(cidade, uf) === chave("São José do Rio Preto", "SP") ? 2 : 0;
}