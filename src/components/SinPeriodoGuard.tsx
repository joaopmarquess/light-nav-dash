import { CalendarCheck } from "lucide-react";
import { useSinPeriodo } from "@/lib/sinistralidadePeriodoStore";

/** Bloqueia submenus de Sinistralidade até que o Período seja definido. */
export default function SinPeriodoGuard({
  children,
  onDefinir,
}: {
  children: React.ReactNode;
  onDefinir: () => void;
}) {
  const cfg = useSinPeriodo();
  if (cfg) return <>{children}</>;
  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col items-center justify-center gap-3 text-center px-6">
      <CalendarCheck className="h-8 w-8 text-primary" />
      <h2 className="text-base font-semibold text-foreground">Período não definido</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Antes de consultar, defina a base final e a quantidade de meses no submenu
        “Definir Período”. Os períodos serão gerados a partir dos mabas.
      </p>
      <button
        type="button"
        onClick={onDefinir}
        className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
      >
        Definir Período
      </button>
    </section>
  );
}
