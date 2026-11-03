const projectId = "627def1f-fd7a-43f0-b494-ed91ad01bed2";
const allowedOrigins = new Set([
  "https://axisbensaude.lovable.app",
  "http://localhost:8080",
  `https://id-preview--${projectId}.lovable.app`,
  `https://preview--${projectId}.lovable.app`,
  `https://${projectId}.lovable.app`,
  `https://${projectId}.lovableproject.com`,
]);

export function isAxisInviteOriginAllowed(value: string, requestOrigin: string | null): boolean {
  try {
    const origin = new URL(value).origin;
    return allowedOrigins.has(origin) && requestOrigin === origin;
  } catch {
    return false;
  }
}