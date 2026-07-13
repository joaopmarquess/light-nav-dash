import { useSearchParams } from "react-router-dom";
import OdoRelatorioView, { type OdoRelatorioTipo } from "@/components/odo/OdoRelatorioView";

export default function OdoRelatorio() {
  const [params] = useSearchParams();
  const tipo = (params.get("tipo") ?? "lista") as OdoRelatorioTipo;
  const protocolo = params.get("protocolo") ?? "";
  const mes = params.get("mes") ?? "";
  const autoPrint = params.get("print") === "1";
  return (
    <div className="min-h-screen bg-white">
      <OdoRelatorioView tipo={tipo} protocolo={protocolo} mes={mes} autoPrint={autoPrint} />
    </div>
  );
}
