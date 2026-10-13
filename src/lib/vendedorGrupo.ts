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

let cacheMot: Record<string, { gp: string; ds: string }> | null = null;
export function useGruposMotivo() {
  const [m, setM] = useState(cacheMot ?? {});
  useEffect(() => {
    if (cacheMot) return;
    hostinger.from("motivo_cancelamento_grupo").select("cd_motivo_cancelamento,ds_motivo_cancelamento_sb,gp_motivo_cancelamento").then(({ data }) => {
      cacheMot = Object.fromEntries((data ?? []).map((r: any) => [String(r.cd_motivo_cancelamento), { gp: String(r.gp_motivo_cancelamento).trim(), ds: String(r.ds_motivo_cancelamento_sb).trim() }]));
      setM(cacheMot);
    });
  }, []);
  return m;
}
