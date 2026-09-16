import { useEffect, useState } from "react";
import { BarChart3, Building2, Hospital } from "lucide-react";
import InteligenciaUberaba from "@/components/InteligenciaUberaba";
import InteligenciaUnimed from "@/components/InteligenciaUnimed";
import UberabaHospitais from "@/components/UberabaHospitais";

type Tab = "ops" | "unimed" | "hospitais";

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "ops", label: "Uberaba OPS", icon: Building2 },
  { id: "unimed", label: "Uberaba Unimed", icon: BarChart3 },
  { id: "hospitais", label: "Uberaba Hospitais", icon: Hospital },
];

const UberabaShell = () => {
  const [tab, setTab] = useState<Tab>("ops");

  useEffect(() => {
    const h = () => setTab("unimed");
    window.addEventListener("open-unimed-uberaba", h);
    return () => window.removeEventListener("open-unimed-uberaba", h);
  }, []);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
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
      <div className="min-h-0 flex-1 overflow-auto pr-1">
        {tab === "ops" ? <InteligenciaUberaba /> : tab === "unimed" ? <InteligenciaUnimed /> : <UberabaHospitais />}
      </div>
    </div>
  );
};

export default UberabaShell;
