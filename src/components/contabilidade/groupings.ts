import { ContabRow } from "./types";

const ACRONYMS = ["EBITDA", "TI"];

export const toSentence = (s: string) => {
  if (!s) return s;
  let r = s.toLowerCase();
  r = r.charAt(0).toUpperCase() + r.slice(1);
  for (const a of ACRONYMS) r = r.replace(new RegExp(`\\b${a.toLowerCase()}\\b`, "gi"), a);
  return r;
};

/** Remove o prefixo numérico "NN|" e aplica sentence-case + siglas. Mesma regra do DRE. */
export const stripPrefix = (s: string | null | undefined) => {
  if (!s) return "";
  return toSentence(String(s).replace(/^\d+\|/, ""));
};

/** Filtro N2 usado no DRE: N2 iniciando com 31–49 ou 61. */
export const isDreRow = (r: ContabRow) => {
  const n2 = (r.N2 as string | null) || "";
  const code = parseInt(n2.split("|")[0], 10);
  if (!Number.isFinite(code)) return false;
  return (code >= 31 && code <= 49) || code === 61;
};
