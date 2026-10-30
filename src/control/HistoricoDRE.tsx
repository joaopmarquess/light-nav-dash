import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import DRETrial from "@/control/DRETrial";
import { HISTORICO_ANOS, historicoDoAno } from "@/control/historicoDre";

export default function HistoricoDRE() {
  const [ano, setAno] = useState(2026);
  const [aba, setAba] = useState<"Painel" | "DRE">("Painel");
  const { rows, meses } = useMemo(() => historicoDoAno(ano), [ano]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <nav aria-label="Ano do histórico" className="flex shrink-0 flex-wrap gap-1 rounded-lg border border-border bg-card p-2">
        {HISTORICO_ANOS.map((y) => (
          <Button key={y} size="sm" variant={ano === y ? "default" : "ghost"} aria-pressed={ano === y} onClick={() => setAno(y)}>
            {y}
          </Button>
        ))}
      </nav>
      <div className="flex-1 min-h-0">
        <DRETrial key={ano} dados={rows} ano={ano} meses={meses} historico painel={aba === "Painel"} onAba={setAba} />
      </div>
    </div>
  );
}