import { useState } from "react";
import UberabaMapa from "@/components/UberabaMapa";
import UberabaShell from "@/components/UberabaShell";
import UberabaDados from "@/components/UberabaDados";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Database, House, LayoutDashboard, MapPinned } from "lucide-react";
import { geographicToday } from "@/hooks/useCarteiraTrialGeo";
import TimelinePresentationHeader from "@/components/TimelinePresentationHeader";

import { UBERABA_ESTUDO } from "@/lib/uberabaEstudo";
import estudoImagem from "@/assets/projeto-uberaba-home-transparente.svg.asset.json";

const UberabaEstudoMapas = () => {
  const [selected, setSelected] = useState<"home" | "painel" | "uberaba" | "dados">("home");
  const [date] = useState(geographicToday);
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  return (
    <div className={`flex min-h-[400px] min-w-0 flex-col gap-3 ${selected === "dados" ? "shrink-0" : "flex-1"}`}>
      <div className="flex shrink-0 flex-wrap items-end gap-4" aria-label="Cabeçalho de Estudo">
      <TimelinePresentationHeader title="Estudo" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Visões do Estudo">
        <Button variant={selected === "home" ? "default" : "outline"} aria-pressed={selected === "home"} onClick={() => setSelected("home")}><House />Home</Button>
        <Button variant={selected === "painel" ? "default" : "outline"} aria-pressed={selected === "painel"} onClick={() => setSelected("painel")}><LayoutDashboard />Painel</Button>
        <Button variant={selected === "uberaba" ? "default" : "outline"} aria-pressed={selected === "uberaba"} onClick={() => setSelected("uberaba")}><MapPinned />Área</Button>
        <Tooltip><TooltipTrigger asChild><Button variant={selected === "dados" ? "default" : "outline"} aria-pressed={selected === "dados"} onClick={() => setSelected("dados")}><Database />Dados</Button></TooltipTrigger><TooltipContent>Fonte: Antônio Justo e César Martins (Lancers)</TooltipContent></Tooltip>
      </div>
      <div ref={setToolbar} className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3" />
      </div>
      <section aria-label={selected === "home" ? "Home do Estudo" : selected === "painel" ? "Painel" : selected === "dados" ? "Dados" : "Área"} className={`flex min-h-0 min-w-0 flex-col ${selected === "dados" ? "shrink-0" : "flex-1"}`}>
        {selected === "home" && <article lang="pt-BR" className="space-y-5 text-justify text-xl leading-7 text-foreground/85 hyphens-auto">
          <img src={estudoImagem.url} loading="eager" decoding="sync" alt="Outdoor do Bensaúde com Hospital Mário Palmério e SIGA: Estamos chegando, Uberaba" className="max-h-[60vh] w-full object-contain" />
          {UBERABA_ESTUDO.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph.split("**").map((text, part) => part % 2 ? <strong key={part} className="font-semibold text-foreground">{text}</strong> : text)}</p>)}
        </article>}
        {selected === "painel" && <UberabaShell embedded />}
        {selected === "uberaba" && <UberabaMapa embedded selectedDate={date} toolbarTarget={toolbar} />}
        {selected === "dados" && <UberabaDados />}
      </section>
    </div>
  );
};

export default UberabaEstudoMapas;