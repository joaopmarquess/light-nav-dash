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

export function hospitaisDaCidade(cidade: string, uf: string) {
  return indice.get(chave(cidade, uf));
}