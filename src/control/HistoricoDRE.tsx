import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import DRETrial, { Barra, type DemoAba } from "@/control/DRETrial";
import { HISTORICO_ANOS, historicoDoAno } from "@/control/historicoDre";

export default function HistoricoDRE({ onAba, onAno }: { onAba?: (a: DemoAba) => void; onAno?: (ano: number) => void }) {
  const [ano, setAno] = useState(2025);
  const [aba, setAba] = useState<"Painel" | "DRE">("Painel");
  useEffect(() => { onAno?.(ano); }, [ano, onAno]);
  const { rows, meses } = useMemo(() => historicoDoAno(ano), [ano]);

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-0 flex-col gap-3">
      <div className="flex-1 min-h-0">
        <DRETrial key={ano} dados={rows} ano={ano} meses={meses} historico painel={aba === "Painel"} />
      </div>
      <Barra ativa="Histórico" onAba={onAba} extra={HISTORICO_ANOS.map((y) => (
        <Button key={y} variant="ghost" aria-pressed={ano === y} onClick={() => setAno(y)}
          className={`rounded-full px-3 py-1 text-[13px] h-auto font-medium transition-all duration-200 ${ano === y ? "bg-secondary text-secondary-foreground shadow-sm" : "text-foreground/70 hover:text-primary hover:bg-card"}`}>{y}</Button>
      ))} filho={(["Painel", "DRE"] as const).map((a) => (
        <Button key={a} variant="ghost" aria-pressed={aba === a} onClick={() => setAba(a)}
          className={`rounded-full px-3 py-1 text-[12px] h-auto font-medium transition-all duration-200 ${aba === a ? "bg-secondary text-secondary-foreground shadow-sm" : "text-foreground/70 hover:text-primary hover:bg-card"}`}>{a}</Button>
      ))} />
    </div>
  );
}
