import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mensagemErroDados, servidorIndisponivel } from "@/lib/erroDados";

/** Aviso padrão das telas de Carteira quando os dados não chegam, com botão para tentar de novo. */
export function AvisoErroDados({ erro, onTentar, className = "" }: { erro: unknown; onTentar?: () => void; className?: string }) {
  if (!erro) return null;
  const off = servidorIndisponivel(erro);
  const Icone = off ? WifiOff : AlertTriangle;
  return (
    <div role="alert" className={`flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive ${className}`}>
      <Icone className="h-4 w-4 shrink-0" />
      <span className="flex-1">{mensagemErroDados(erro)}</span>
      {onTentar && <Button size="sm" variant="outline" onClick={onTentar}><RefreshCw className="h-3.5 w-3.5 mr-1" />Tentar de novo</Button>}
    </div>
  );
}
