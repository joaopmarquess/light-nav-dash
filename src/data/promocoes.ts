export type Categoria = "promotor" | "hunter";

export type Participante = {
  nome: string;
  categoria: Categoria;
  lancers: number;
  outros: number;
  crescLancers: number;
  crescOutros: number;
};

// Base: 3º trimestre (julho a setembro) — planilha Metas_Promotores_Julho_Dezembro_2026
// Outros Produtos Bensaúde considera vigências 11/2026 e 12/2026.
export const participantesIniciais: Participante[] = [
  { nome: "LARISSA ELLEN DE OLIVEIRA FERREIRA", categoria: "promotor", lancers: 208, outros: 70, crescLancers: 0.1, crescOutros: 0.5 },
  { nome: "DEBORA FERNANDA GOMES MAIA", categoria: "promotor", lancers: 242, outros: 34, crescLancers: 0.1, crescOutros: 0.35 },
  { nome: "VINICIUS FERNANDO HERNANDES", categoria: "promotor", lancers: 172, outros: 76, crescLancers: 0.1, crescOutros: 0.45 },
  { nome: "ISABELLA CHARLES QUARTIERI", categoria: "promotor", lancers: 180, outros: 34, crescLancers: 0.1, crescOutros: 0.3 },
  { nome: "CARINA RAMOS SILVA", categoria: "promotor", lancers: 153, outros: 43, crescLancers: 0.1, crescOutros: 0.3 },
  { nome: "CARLOS HENRIQUE ROCHA DOS SANTOS", categoria: "promotor", lancers: 132, outros: 28, crescLancers: 0.1, crescOutros: 0.3 },
  { nome: "DANITCHELE FERRAZ DA SILVA", categoria: "promotor", lancers: 93, outros: 37, crescLancers: 0.1, crescOutros: 0.3 },
  { nome: "KARINA CRISTINA FURLANETTO CHIACHIO", categoria: "promotor", lancers: 107, outros: 15, crescLancers: 0.1, crescOutros: 0.3 },
  { nome: "LETICIA SILVA GARCIA", categoria: "promotor", lancers: 94, outros: 15, crescLancers: 0.1, crescOutros: 0.3 },
];

export const metasIniciais = {
  promotor: { lancers: 120, outros: 100, total: 220 },
  hunter: { lancers: 120, outros: 240, total: 360 },
};

export const premiosIniciais = {
  promotor: { podio: [4000, 3000, 2000], demais: 500 },
  hunter: { podio: [3000], demais: 500 },
};
