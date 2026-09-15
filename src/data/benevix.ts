export type FaixaRow = {
  faixa: string;
  netApt: number | null;
  vendaApt: number | null;
  netEnf: number | null;
  vendaEnf: number | null;
  vidas: number | null;
};

export type CarteiraBase = {
  benevix: { rows: FaixaRow[]; spread: number; sin: number };
  lancers: { rows: FaixaRow[]; sin: number };
  proposta: { spread: number; sin: number };
};

// Base extraida da planilha SIMULACAO_BENEVIX.xlsx (abas #ADESAO e #PME).
export const benevixBase: Record<"adesao" | "pme", CarteiraBase> = {
  "adesao": {
    "benevix": {
      "rows": [
        {
          "faixa": "00 A 18",
          "netApt": 156.55,
          "vendaApt": 220.5,
          "netEnf": null,
          "vendaEnf": 147,
          "vidas": 1687
        },
        {
          "faixa": "19 A 23",
          "netApt": 156.55,
          "vendaApt": 220.5,
          "netEnf": null,
          "vendaEnf": 147,
          "vidas": 390
        },
        {
          "faixa": "24 A 28",
          "netApt": 183.62,
          "vendaApt": 258.63,
          "netEnf": null,
          "vendaEnf": 172.43,
          "vidas": 681
        },
        {
          "faixa": "29 A 33",
          "netApt": 202.92,
          "vendaApt": 285.82,
          "netEnf": null,
          "vendaEnf": 190.54,
          "vidas": 709
        },
        {
          "faixa": "34 A 38",
          "netApt": 237.75,
          "vendaApt": 334.86,
          "netEnf": null,
          "vendaEnf": 223.25,
          "vidas": 593
        },
        {
          "faixa": "39 A 43",
          "netApt": 272.71,
          "vendaApt": 384.11,
          "netEnf": null,
          "vendaEnf": 256.07,
          "vidas": 566
        },
        {
          "faixa": "44 A 48",
          "netApt": 362.75,
          "vendaApt": 510.93,
          "netEnf": null,
          "vendaEnf": 340.62,
          "vidas": 508
        },
        {
          "faixa": "49 A 53",
          "netApt": 419.28,
          "vendaApt": 590.55,
          "netEnf": null,
          "vendaEnf": 393.7,
          "vidas": 384
        },
        {
          "faixa": "54 A 58",
          "netApt": 558.23,
          "vendaApt": 786.27,
          "netEnf": null,
          "vendaEnf": 524.18,
          "vidas": 244
        },
        {
          "faixa": "59 OU +",
          "netApt": 831.07,
          "vendaApt": 1170.57,
          "netEnf": null,
          "vendaEnf": 780.38,
          "vidas": 338
        }
      ],
      "spread": 0.29,
      "sin": 0.77
    },
    "lancers": {
      "rows": [
        {
          "faixa": "00 A 18",
          "netApt": 154.92,
          "vendaApt": 201.21,
          "netEnf": 103.28,
          "vendaEnf": 134.14,
          "vidas": 1687
        },
        {
          "faixa": "19 A 23",
          "netApt": 180.79,
          "vendaApt": 234.81,
          "netEnf": 120.52,
          "vendaEnf": 156.54,
          "vidas": 390
        },
        {
          "faixa": "24 A 28",
          "netApt": 210.98,
          "vendaApt": 274.02,
          "netEnf": 140.64,
          "vendaEnf": 182.68,
          "vidas": 681
        },
        {
          "faixa": "29 A 33",
          "netApt": 232.49,
          "vendaApt": 301.97,
          "netEnf": 154.98,
          "vendaEnf": 201.31,
          "vidas": 709
        },
        {
          "faixa": "34 A 38",
          "netApt": 271.31,
          "vendaApt": 352.39,
          "netEnf": 180.86,
          "vendaEnf": 234.92,
          "vidas": 593
        },
        {
          "faixa": "39 A 43",
          "netApt": 310.1,
          "vendaApt": 402.78,
          "netEnf": 206.72,
          "vendaEnf": 268.51,
          "vidas": 566
        },
        {
          "faixa": "44 A 48",
          "netApt": 379.87,
          "vendaApt": 493.4,
          "netEnf": 253.23,
          "vendaEnf": 328.92,
          "vidas": 508
        },
        {
          "faixa": "49 A 53",
          "netApt": 473.69,
          "vendaApt": 615.26,
          "netEnf": 315.77,
          "vendaEnf": 410.16,
          "vidas": 384
        },
        {
          "faixa": "54 A 58",
          "netApt": 628.58,
          "vendaApt": 816.45,
          "netEnf": 419.02,
          "vendaEnf": 544.28,
          "vidas": 244
        },
        {
          "faixa": "59 OU +",
          "netApt": 929.35,
          "vendaApt": 1207.12,
          "netEnf": 619.52,
          "vendaEnf": 804.71,
          "vidas": 338
        }
      ],
      "sin": 0.65
    },
    "proposta": {
      "spread": 0.15,
      "sin": 0.77
    }
  },
  "pme": {
    "benevix": {
      "rows": [
        {
          "faixa": "00 A 18",
          "netApt": 147.37,
          "vendaApt": 207.57,
          "netEnf": 98.25,
          "vendaEnf": 138.38,
          "vidas": 331
        },
        {
          "faixa": "19 A 23",
          "netApt": 147.37,
          "vendaApt": 207.57,
          "netEnf": 98.25,
          "vendaEnf": 138.38,
          "vidas": 82
        },
        {
          "faixa": "24 A 28",
          "netApt": 172.92,
          "vendaApt": 243.55,
          "netEnf": 115.29,
          "vendaEnf": 162.39,
          "vidas": 133
        },
        {
          "faixa": "29 A 33",
          "netApt": 191.12,
          "vendaApt": 269.18,
          "netEnf": 127.45,
          "vendaEnf": 179.51,
          "vidas": 139
        },
        {
          "faixa": "34 A 38",
          "netApt": 223.97,
          "vendaApt": 315.46,
          "netEnf": 149.38,
          "vendaEnf": 210.4,
          "vidas": 116
        },
        {
          "faixa": "39 A 43",
          "netApt": 256.79,
          "vendaApt": 361.69,
          "netEnf": 171.28,
          "vendaEnf": 241.25,
          "vidas": 111
        },
        {
          "faixa": "44 A 48",
          "netApt": 341.9,
          "vendaApt": 481.57,
          "netEnf": 228.08,
          "vendaEnf": 321.24,
          "vidas": 99
        },
        {
          "faixa": "49 A 53",
          "netApt": 395.22,
          "vendaApt": 556.63,
          "netEnf": 263.67,
          "vendaEnf": 371.38,
          "vidas": 75
        },
        {
          "faixa": "54 A 58",
          "netApt": 526.31,
          "vendaApt": 741.31,
          "netEnf": 351.17,
          "vendaEnf": 494.63,
          "vidas": 48
        },
        {
          "faixa": "59 OU +",
          "netApt": 783.71,
          "vendaApt": 1103.78,
          "netEnf": 522.97,
          "vendaEnf": 736.6,
          "vidas": 66
        }
      ],
      "spread": null,
      "sin": 0.69
    },
    "lancers": {
      "rows": [
        {
          "faixa": "00 A 18",
          "netApt": 154.92,
          "vendaApt": 188.92,
          "netEnf": 103.28,
          "vendaEnf": 125.95,
          "vidas": 331
        },
        {
          "faixa": "19 A 23",
          "netApt": 180.79,
          "vendaApt": 220.46,
          "netEnf": 120.52,
          "vendaEnf": 146.98,
          "vidas": 82
        },
        {
          "faixa": "24 A 28",
          "netApt": 210.98,
          "vendaApt": 257.27,
          "netEnf": 140.64,
          "vendaEnf": 171.52,
          "vidas": 133
        },
        {
          "faixa": "29 A 33",
          "netApt": 232.49,
          "vendaApt": 283.51,
          "netEnf": 154.98,
          "vendaEnf": 189.01,
          "vidas": 139
        },
        {
          "faixa": "34 A 38",
          "netApt": 271.31,
          "vendaApt": 330.85,
          "netEnf": 180.86,
          "vendaEnf": 220.57,
          "vidas": 116
        },
        {
          "faixa": "39 A 43",
          "netApt": 310.1,
          "vendaApt": 378.16,
          "netEnf": 206.72,
          "vendaEnf": 252.11,
          "vidas": 111
        },
        {
          "faixa": "44 A 48",
          "netApt": 379.87,
          "vendaApt": 463.24,
          "netEnf": 253.23,
          "vendaEnf": 308.83,
          "vidas": 99
        },
        {
          "faixa": "49 A 53",
          "netApt": 473.69,
          "vendaApt": 577.66,
          "netEnf": 315.77,
          "vendaEnf": 385.11,
          "vidas": 75
        },
        {
          "faixa": "54 A 58",
          "netApt": 628.58,
          "vendaApt": 766.55,
          "netEnf": 419.02,
          "vendaEnf": 511.04,
          "vidas": 48
        },
        {
          "faixa": "59 OU +",
          "netApt": 929.35,
          "vendaApt": 1133.34,
          "netEnf": 619.52,
          "vendaEnf": 755.57,
          "vidas": 66
        }
      ],
      "sin": 0.65
    },
    "proposta": {
      "spread": 0.15,
      "sin": 0.69
    }
  }
};
