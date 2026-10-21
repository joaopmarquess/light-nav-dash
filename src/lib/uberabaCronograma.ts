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

export function mesesPlanejadosUberaba() {
  const meses: { data: string; etapas: string[] }[] = [];
  for (const nome of Object.keys(CRONOGRAMA_UBERABA)) {
    const data = dataPlanejadaUberaba(nome);
    if (!data) continue;
    const ultimo = meses[meses.length - 1];
    if (ultimo?.data === data) ultimo.etapas.push(nome);
    else meses.push({ data, etapas: [nome] });
  }
  return meses;
}