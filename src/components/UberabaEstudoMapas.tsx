import CarteiraTrialGeo from "@/components/CarteiraTrialGeo";
import UberabaMapa from "@/components/UberabaMapa";

const UberabaEstudoMapas = () => (
  <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
    <section aria-label="Área Geográfica" className="flex min-h-[480px] min-w-0 flex-col gap-3 xl:min-h-0">
      <h3 className="text-base font-semibold text-foreground">Área Geográfica</h3>
      <div className="min-h-0 flex-1">
        <CarteiraTrialGeo />
      </div>
    </section>
    <section aria-label="Uberaba - Mapa" className="flex min-h-[480px] min-w-0 flex-col gap-3 xl:min-h-0">
      <h3 className="text-base font-semibold text-foreground">Uberaba - Mapa</h3>
      <div className="min-h-0 flex-1">
        <UberabaMapa embedded />
      </div>
    </section>
  </div>
);

export default UberabaEstudoMapas;