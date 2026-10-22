import { useState } from "react";
import CarteiraTrialGeo from "@/components/CarteiraTrialGeo";
import UberabaMapa from "@/components/UberabaMapa";
import { Button } from "@/components/ui/button";
import { Map, MapPinned } from "lucide-react";
import { geographicToday } from "@/hooks/useCarteiraTrialGeo";
import TimelinePresentationHeader from "@/components/TimelinePresentationHeader";

const UberabaEstudoMapas = () => {
  const [selected, setSelected] = useState<"geo" | "uberaba">("geo");
  const [date, setDate] = useState(geographicToday);
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  return (
    <div className="flex min-h-[400px] min-w-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end gap-4" aria-label="Cabeçalho de Estudo">
      <TimelinePresentationHeader title="Estudo" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Mapas do Estudo">
        <Button variant={selected === "geo" ? "default" : "outline"} aria-pressed={selected === "geo"} onClick={() => setSelected("geo")}><Map />Área Geográfica</Button>
        <Button variant={selected === "uberaba" ? "default" : "outline"} aria-pressed={selected === "uberaba"} onClick={() => setSelected("uberaba")}><MapPinned />Mapa Uberaba</Button>
      </div>
      <div ref={setToolbar} className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3" />
      </div>
      <section aria-label={selected === "geo" ? "Área Geográfica" : "Mapa Uberaba"} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className={selected === "geo" ? "min-h-0 flex-1" : "hidden"}><CarteiraTrialGeo embedded selectedDate={date} onDateChange={setDate} toolbarTarget={selected === "geo" ? toolbar : null} /></div>
        {selected === "uberaba" && <UberabaMapa embedded selectedDate={date} toolbarTarget={toolbar} />}
      </section>
    </div>
  );
};

export default UberabaEstudoMapas;