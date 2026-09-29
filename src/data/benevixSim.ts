// Base extraida da planilha SIMULACAO_BENEVIX (aba @Benevix).
export type SimParams = {
  /** Total de vidas digitado */
  vidas: number;
  /** % spread aplicado sobre o valor de venda */
  spread: number;
  /** % de coparticipacao sobre a receita net */
  copart: number;
  /** Sinistralidade de referencia */
  sinRef: number;
  /** Net percapta de referencia (R$) */
  netPercapta: number;
};

export type SimBase = SimParams & {
  faixas: { faixa: string; dfe: number; venda: number }[];
};

const FAIXAS = [
  "00 A 18",
  "19 A 23",
  "24 A 28",
  "29 A 33",
  "34 A 38",
  "39 A 43",
  "44 A 48",
  "49 A 53",
  "54 A 58",
  "59 OU +",
];

const mk = (dfe: number[], venda: number[]) =>
  FAIXAS.map((faixa, i) => ({ faixa, dfe: dfe[i], venda: venda[i] }));

export const simBase: Record<"adesao" | "pme", SimBase> = {
  adesao: {
    vidas: 6100,
    spread: 0.29,
    copart: 0,
    sinRef: 0.77,
    netPercapta: 210.03,
    faixas: mk(
      [0.23, 0.0721, 0.0913, 0.1087, 0.0922, 0.0827, 0.0872, 0.07, 0.0522, 0.1135],
      [147, 147, 172.43, 190.54, 223.25, 256.07, 340.62, 393.7, 524.18, 780.38],
    ),
  },
  pme: {
    vidas: 1200,
    spread: 0.29,
    copart: 0,
    sinRef: 0.65,
    netPercapta: 194.93,
    faixas: mk(
      [0.2245, 0.0384, 0.0709, 0.0827, 0.127, 0.1211, 0.1078, 0.0975, 0.0443, 0.0857],
      [98.25, 98.25, 115.29, 127.45, 149.38, 171.28, 228.08, 263.67, 351.17, 522.97],
    ),
  },
};

export const vendaSugerida: Record<"adesao" | "pme", number[]> = {
  adesao: [134.14, 156.54, 182.68, 201.31, 234.92, 268.51, 328.92, 410.16, 544.28, 804.71],
  pme: [125.95, 146.98, 171.52, 189.01, 220.57, 252.11, 308.83, 385.11, 511.04, 755.57],
};
