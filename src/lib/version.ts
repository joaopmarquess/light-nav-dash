declare const __BUILD_ID__: string;

// Versão principal (mudar só em grandes entregas). O build é gerado
// automaticamente a cada publicação: AAMMDD.HHMM (horário de Brasília).
export const APP_VERSION = "1.0";
export const BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
export const FULL_VERSION = `${APP_VERSION}.${BUILD_ID}`;
