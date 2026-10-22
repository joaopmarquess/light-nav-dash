import { normalizeMunicipality } from "./municipalHeatColors";

const additionalMunicipalities = new Set([
  "GURINHATA", "IPIACU", "SANTA VITORIA", "CACHOEIRA DOURADA", "CASCALHO RICO",
]);

export function isAdditionalUberabaStudyMember(uf: string, name: string): boolean {
  return uf === "MG" && additionalMunicipalities.has(normalizeMunicipality(name));
}