import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

/** Botão "Guardar como novo Default", abaixo dos campos editáveis das telas do Proj. Uberaba. */
export default function GuardarDefaultButton({ onGuardar, className = "" }: { onGuardar: () => void; className?: string }) {
  return (
    <div className={`mt-2 flex justify-end ${className}`}>
      <Button type="button" variant="outline" size="sm" onClick={() => { onGuardar(); toast({ title: "Novo Default guardado", description: "Os valores atuais passam a ser o padrão neste navegador." }); }}>
        <Save className="mr-1 h-4 w-4" /> Guardar como novo Default
      </Button>
    </div>
  );
}
