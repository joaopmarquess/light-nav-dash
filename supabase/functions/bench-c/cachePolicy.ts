export const CACHE_REVISION = 1;
export const RECENT_CACHE_MS = 24 * 60 * 60 * 1000;
export function cacheIsFresh(year: number, updatedAt: string, revision: number, now = Date.now()): boolean {
  if (revision !== CACHE_REVISION) return false;
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp) || timestamp > now) return false;
  return year < new Date(now).getUTCFullYear() - 1 || now - timestamp < RECENT_CACHE_MS;
}