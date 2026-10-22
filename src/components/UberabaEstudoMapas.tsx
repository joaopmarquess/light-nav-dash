import { useState } from "react";
import UberabaMapa from "@/components/UberabaMapa";
import UberabaShell from "@/components/UberabaShell";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, MapPinned } from "lucide-react";
import { geographicToday } from "@/hooks/useCarteiraTrialGeo";
import TimelinePresentationHeader from "@/components/TimelinePresentationHeader";

const UberabaEstudoMapas = () => {
  const [selected, setSelected] = useState<"painel" | "uberaba">("uberaba");
  const [date] = useState(geographicToday);
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  return (
    <div className="flex min-h-[400px] min-w-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end gap-4" aria-label="Cabeçalho de Estudo">
      <TimelinePresentationHeader title="Estudo" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Mapas do Estudo">
        <Button variant={selected === "painel" ? "default" : "outline"} aria-pressed={selected === "painel"} onClick={() => setSelected("painel")}><LayoutDashboard />Painel</Button>
        <Button variant={selected === "uberaba" ? "default" : "outline"} aria-pressed={selected === "uberaba"} onClick={() => setSelected("uberaba")}><MapPinned />Área</Button>
      </div>
      <div ref={setToolbar} className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3" />
      </div>
      <section aria-label={selected === "painel" ? "Painel" : "Área"} className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected === "painel" && <UberabaShell embedded />}
        {selected === "uberaba" && <UberabaMapa embedded selectedDate={date} toolbarTarget={toolbar} />}
      </section>
    </div>
  );
};

export default UberabaEstudoMapas;