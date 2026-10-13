import { useEffect, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";

let cache: Record<string, string> | null = null;

export function useGruposVendedor() {
  const [m, setM] = useState<Record<string, string>>(cache ?? {});
  useEffect(() => {
    if (cache) return;
    hostinger.from("vendedor_grupo").select("cd_vendedor,grupo").then(({ data }) => {
      cache = Object.fromEntries((data ?? []).map((r: any) => [String(r.cd_vendedor), String(r.grupo).trim()]));
      setM(cache);
    });
  }, []);
  return m;
}
