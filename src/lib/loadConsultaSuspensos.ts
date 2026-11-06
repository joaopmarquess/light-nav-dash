import { hostinger } from "@/lib/hostingerClient";
import { matriculasSuspensas, type SuspPeriodoValor, type SuspensaoRegistro } from "@/lib/consultaSuspensos";

// Mirrors the existing Hostinger function's latest-suspension selection.
// The caller still applies the portfolio's aggregated active rule.
export async function loadConsultaSuspensos(periodo: SuspPeriodoValor, cancelled: () => boolean) {
  const registros: SuspensaoRegistro[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await hostinger.from("beneficiarios")
      .select("cd_mat_alternativa,dt_ult_suspensao,dt_ult_reat_suspensao")
      .gte("dt_ult_suspensao", periodo.de).lt("dt_ult_suspensao", `${periodo.ate}T23:59:59.999999`)
      .order("cd_mat_alternativa").order("dt_ult_suspensao", { ascending: false }).range(from, from + 999);
    if (error) throw error;
    if (cancelled()) return [];
    registros.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return matriculasSuspensas(registros, periodo);
}