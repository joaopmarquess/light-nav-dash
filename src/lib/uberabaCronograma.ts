export const CRONOGRAMA_UBERABA = {
  "Estudo": { mes: "Outubro", ano: 2026 },
  "Hospital Mário Palmério": { mes: "Novembro", ano: 2026 },
  "Modelo de Atuação": { mes: "Novembro", ano: 2026 },
  "Plano de Marketing": { mes: "Novembro", ano: 2026 },
  "Formalização": { mes: "Dezembro", ano: 2026 },
  "Implantação": { mes: "Janeiro", ano: 2027 },
  "Operação Iniciada": { mes: "Janeiro", ano: 2027 },
} as const;

export function dataPlanejadaUberaba(etapa: string) {
  const data = Object.entries(CRONOGRAMA_UBERABA).find(([nome]) => nome === etapa)?.[1];
  return data ? `${data.mes}/${data.ano}` : null;
}