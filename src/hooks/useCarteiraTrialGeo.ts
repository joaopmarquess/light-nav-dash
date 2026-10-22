import { useQuery } from "@tanstack/react-query";
import { hostinger } from "@/lib/hostingerClient";

export type GeographicRow = { uf: string; cidade: string; ativos: number };
export const geographicToday = () => new Date().toISOString().slice(0, 10);

export function useCarteiraTrialGeo(date: string) {
  return useQuery({
    queryKey: ["carteira-trial-geo", date],
    staleTime: 60_000,
    queryFn: async (): Promise<GeographicRow[]> => {
      const { data, error } = await hostinger.rpc("carteira_trial_geo", { p_data: date });
      if (error) throw error;
      return (data ?? []).map((row: GeographicRow) => ({ uf: String(row.uf ?? "").trim().toUpperCase(), cidade: String(row.cidade ?? ""), ativos: Number(row.ativos) || 0 }));
    },
  });
}