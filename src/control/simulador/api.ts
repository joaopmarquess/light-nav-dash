import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { SimulationRecord } from "./model";
export async function listSimulations(): Promise<SimulationRecord[]> {
  const { data, error } = await supabase.from("simulador_simulacoes").select("*, simulador_visoes(*, simulador_etapas(*))").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(s => ({ ...s, simulador_visoes: s.simulador_visoes.map(v => ({ ...v, simulador_etapas: v.simulador_etapas.map(e => ({ ...e, data: e.data as Record<string, unknown> })).sort((a,b)=>a.stage-b.stage) })).sort((a,b)=>a.position-b.position) }));
}
export async function simulatorAction(action: "create"|"start"|"save"|"complete"|"reopen", simulation?: string, view = 0, stage = 0, data: Record<string, unknown> = {}, name?: string, expected?: string) {
  const { data: id, error } = await supabase.rpc("simulador_action_checked", { p_action: action, p_simulation: simulation, p_view: view, p_stage: stage, p_data: data as Json, p_name: name, p_expected_updated_at: expected });
  if (error) throw error;
  return id;
}export async function deleteSimulation(simulation: string) {
  const { error } = await supabase.rpc("simulador_delete", { p_simulation: simulation });
  if (error) throw error;
}
