/** A Home móvel mostra a movimentação desde o início de 2026 até a data atual. */
export function periodoHomeCelular(agora = new Date()) {
  const ate = agora.toISOString().slice(0, 10);
  return { de: "2026-01-01", ate, nome: `01/01/2026 até ${ate.slice(8, 10)}/${ate.slice(5, 7)}/${ate.slice(0, 4)}` };
}