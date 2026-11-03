export type AxisAccess = { status: string; role: "admin" | "master" | "user"; permissions: string[] };
export const deniedAccess: AxisAccess = { status: "unassigned", role: "user", permissions: [] };
export function canAccess(access: AxisAccess, menu: string): boolean {
  if (access.status !== "ok") return false;
  if (access.role === "admin") return true;
  if (menu === "Configurações") return false;
  return access.role === "master" || access.permissions.includes(menu);
}