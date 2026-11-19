// Cópia literal da tabela "Concorrentes" enviada pelo Dênis em 19/11/2026 (R$/mês por beneficiário, Uberaba (MG)).
// Valores em centavos, na ordem das faixas 00 a 18 … 59 ou +; não recalcular.
// `rotulo`: nome curto nas colunas da tela (Hapvida 1–4, pedido de 19/11/2026), para não quebrar o texto.
export type ConcorrenteUberaba = { numero: number; produto: string; rotulo: string; centavos: readonly number[] };

export const CONCORRENTES_UBERABA: readonly ConcorrenteUberaba[] = [
  { numero: 11, produto: "Unimed Uberaba", rotulo: "Unimed Uberaba", centavos: [27882, 32067, 36877, 42409, 48770, 56090, 68424, 88951, 115619, 167185] },
  { numero: 21, produto: "Evo Uberaba", rotulo: "Evo Uberaba", centavos: [16311, 19900, 23879, 27460, 30755, 36906, 40599, 49935, 65913, 97553] },
  { numero: 31, produto: "Hapvida Copart. Parcial 1", rotulo: "Hapvida 1", centavos: [15893, 17800, 19936, 22926, 26365, 31374, 39218, 49023, 83339, 93340] },
  { numero: 32, produto: "Hapvida Copart. Parcial 2", rotulo: "Hapvida 2", centavos: [14317, 16035, 17959, 20653, 23751, 28264, 35330, 44163, 75077, 84086] },
  { numero: 33, produto: "Hapvida Copart. Normal 1", rotulo: "Hapvida 3", centavos: [12059, 13506, 15127, 17396, 20005, 23806, 29758, 37198, 63237, 70825] },
  { numero: 34, produto: "Hapvida Copart. Normal 2", rotulo: "Hapvida 4", centavos: [10803, 12099, 13551, 15584, 17922, 21327, 26659, 33324, 56651, 63449] },
];
