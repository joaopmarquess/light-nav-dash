import { useDWCarteira } from "@/lib/dwCarteiraDados";

export function useCarteiraGraficosData() {
  return useDWCarteira(true);
}
