import { useState } from "react";
import { ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useContabilidadeCharts } from "@/control/contabilidadeCharts";

const Card = ({ title, subtitle, children }: { title: string; subtitle?: string | undefined; children: React.ReactNode }) => (
  <section className="bg-card rounded-xl border border-border shadow-sm p-3 flex flex-col min-h-0">
    <header className="mb-1">
      <h3 className="text-[15px] font-semibold text-foreground leading-tight">{title}</h3>
      {subtitle ? <p className="text-[12px] text-muted-foreground leading-tight">{subtitle}</p> : null}
    </header>
    <div className="flex-1 min-h-0">{children}</div>
  </section>
);

const ContabilidadeGraficos = () => {
  const { charts, loading, error } = useContabilidadeCharts();
  const [pagina, setPagina] = useState(1);

  if (loading) {
    return <div className="h-full grid place-items-center text-sm text-muted-foreground">Carregando gráficos…</div>;
  }

  const visiveis = pagina === 1 ? charts.slice(0, 4) : charts.slice(4, 8);

  return (
    <div className="h-full flex flex-col min-h-0 gap-2">
      {error ? <div className="text-[11px] text-destructive">erro: {error}</div> : null}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Página {pagina} de 2</span>
        {pagina === 1 ? (
          <button
            onClick={() => setPagina(2)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-accent"
          >
            Página 2 <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={() => setPagina(1)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-accent"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 gap-3">
        {visiveis.map((c) => (
          <Card key={c.key} title={c.title} subtitle={c.subtitle}>
            <ResponsiveContainer width="100%" height="100%">
              {c.chart as React.ReactElement}
            </ResponsiveContainer>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ContabilidadeGraficos;
