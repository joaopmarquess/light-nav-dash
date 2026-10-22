import type { ReactElement } from "react";
import { folhinhasUberaba } from "@/lib/uberabaCronograma";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function UberabaCalendario({ trigger }: { trigger: ReactElement }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-6xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-normal">Calendário · Bensaúde|Uberaba</DialogTitle>
          <DialogDescription>Datas planejadas · Outubro de 2026 a Janeiro de 2027</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {folhinhasUberaba().map(({ data, mes, ano, inicioSemana, ultimoDia, etapas, dataFinal }) => (
            <section key={data} aria-label={data} className="overflow-hidden rounded-md border border-border bg-card">
              <header className="relative bg-secondary px-4 pb-4 pt-6 text-center text-secondary-foreground">
                <div aria-hidden="true" className="absolute inset-x-0 top-0 flex justify-around"><span className="h-3 w-1 rounded-b bg-primary" /><span className="h-3 w-1 rounded-b bg-primary" /></div>
                <p className="text-xs font-semibold">{ano}</p><h3 className="mt-1 text-xl font-semibold">{mes}</h3>
              </header>
              <div className="p-3">
                <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">{["D", "S", "T", "Q", "Q", "S", "S"].map((dia, i) => <span key={i} className="py-2">{dia}</span>)}</div>
                <div className="grid grid-cols-7 grid-rows-6 text-center text-sm">
                  {Array.from({ length: 42 }, (_, i) => {
                    const dia = i - inicioSemana + 1;
                    return <div key={i} className="flex h-9 items-center justify-center">{dia > 0 && dia <= ultimoDia && <span aria-label={dia === ultimoDia ? `Data planejada: ${dataFinal}` : undefined} className={`flex h-8 w-8 items-center justify-center ${dia === ultimoDia ? "rounded-full border-2 border-destructive bg-destructive/5 font-bold text-destructive" : "text-foreground"}`}>{dia}</span>}</div>;
                  })}
                </div>
                <div className="mt-2 border-t border-border pt-3"><p className="text-sm font-semibold text-foreground">{dataFinal}</p><ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">{etapas.map((etapa) => <li key={etapa}>{etapa}</li>)}</ul></div>
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}