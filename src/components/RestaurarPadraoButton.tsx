import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Ícone "Restaurar padrão" dos blocos com parâmetros variáveis: pede confirmação e só então volta os valores ao padrão. */
export default function RestaurarPadraoButton({ alvo, onRestaurar, desativado = false, className }: {
  /** O que será restaurado, ex.: "Parâmetros" ou "PCA Adm.". */
  alvo: string; onRestaurar: () => void; desativado?: boolean; className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const dica = desativado ? "Já está no padrão" : "Restaurar padrão";
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button type="button" variant="ghost" size="icon" className={className ?? "h-6 w-6"} disabled={desativado}
              aria-label={`Restaurar padrão · ${alvo}`} onClick={() => setAberto(true)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{dica}</TooltipContent>
      </Tooltip>
      <AlertDialog open={aberto} onOpenChange={setAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar padrão?</AlertDialogTitle>
            <AlertDialogDescription>Os valores digitados em {alvo} voltam ao padrão. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onRestaurar(); setAberto(false); }}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
