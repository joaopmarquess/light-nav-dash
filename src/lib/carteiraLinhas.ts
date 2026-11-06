export function filtrarLinhasSaidas<T extends { eq: (campo: string, valor: string) => T }>(
  consulta: T, modo: "entradas" | "saidas",
): T {
  return modo === "saidas" ? consulta.eq("tp_linha", "S") : consulta;
}