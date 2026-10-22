import { useState } from "react";
import CarteiraTrialGeo from "@/components/CarteiraTrialGeo";
import UberabaMapa from "@/components/UberabaMapa";
import { Button } from "@/components/ui/button";
import { Map, MapPinned } from "lucide-react";

const UberabaEstudoMapas = () => {
  const [selected, setSelected] = useState<"geo" | "uberaba">("geo");
  return (
    <div className="flex min-h-[560px] min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Mapas do Estudo">
        <Button variant={selected === "geo" ? "default" : "outline"} aria-pressed={selected === "geo"} onClick={() => setSelected("geo")}><Map />Área Geográfica</Button>
        <Button variant={selected === "uberaba" ? "default" : "outline"} aria-pressed={selected === "uberaba"} onClick={() => setSelected("uberaba")}><MapPinned />Mapa Uberaba</Button>
      </div>
      <section aria-label={selected === "geo" ? "Área Geográfica" : "Mapa Uberaba"} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className={selected === "geo" ? "min-h-0 flex-1" : "hidden"}><CarteiraTrialGeo embedded /></div>
        {selected === "uberaba" && <UberabaMapa embedded />}
      </section>
    </div>
  );
};

export default UberabaEstudoMapas;