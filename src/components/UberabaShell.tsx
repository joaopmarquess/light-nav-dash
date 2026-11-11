import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, Building2, Hospital } from "lucide-react";
import InteligenciaUberaba from "@/components/InteligenciaUberaba";
import InteligenciaUnimed from "@/components/InteligenciaUnimed";
import UberabaHospitais from "@/components/UberabaHospitais";
import EstudoSubNav from "@/components/EstudoSubNav";

type Tab = "ops" | "unimed" | "hospitais";

/** Abas adicionais exibidas só onde o painel é incorporado (ex.: Dados no Estudo); o painel autônomo não muda. */
export type PainelExtraTab = { id: string; label: string; icon: typeof Building2; title?: string; content: ReactNode };

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "ops", label: "Uberaba OPS", icon: Building2 },
  { id: "unimed", label: "Uberaba Unimed", icon: BarChart3 },
  { id: "hospitais", label: "Uberaba Hospitais", icon: Hospital },
];

const UberabaShell = ({ embedded = false, extraTabs = [], subNavTarget }: { embedded?: boolean; extraTabs?: PainelExtraTab[]; subNavTarget?: HTMLElement | null }) => {
  const [tab, setTab] = useState<Tab | string>("ops");
  const extra = extraTabs.find((t) => t.id === tab);
  const tabs: { id: string; label: string; icon: typeof Building2; title?: string }[] = [...TABS, ...extraTabs];

  useEffect(() => {
    const h = () => setTab("unimed");
    window.addEventListener("open-unimed-uberaba", h);
    return () => window.removeEventListener("open-unimed-uberaba", h);
  }, []);

  return (
    <div className="flex h-full flex-col gap-3">
      {embedded ? <EstudoSubNav itens={tabs} ativo={tab} onSelect={setTab} label="Seções do Painel" target={subNavTarget} /> : (
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.title}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>
      )}
      <div className={embedded ? "min-w-0" : "min-h-0 flex-1 overflow-auto pr-1"}>
        {extra ? extra.content : tab === "ops" ? <InteligenciaUberaba /> : tab === "unimed" ? <InteligenciaUnimed /> : <UberabaHospitais />}
      </div>
    </div>
  );
};

export default UberabaShell;
