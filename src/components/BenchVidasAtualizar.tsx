import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { mesAno, proximaCompetencia } from "@/lib/benchVidasEnvio";

type Passo = "perguntar" | "verificando" | "disponivel" | "indisponivel" | "registrando" | "registrado" | "erro";

/** Botão "Atualizar base": confere na ANS se o mês seguinte ao último guardado já foi publicado e registra o pedido. */
export function BenchVidasAtualizar({ ultima }: { ultima: string }) {
  const proxima = proximaCompetencia(ultima);
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<Passo>("perguntar");
  const [erro, setErro] = useState("");
  const abrir = () => { setPasso("perguntar"); setErro(""); setAberto(true); };
  const verificar = async () => {
    setPasso("verificando");
    const { data, error } = await supabase.functions.invoke("bench-vidas-mes", { body: { competencia: proxima } });
    if (error || data?.error) { setErro(data?.error ?? "Não foi possível consultar a ANS agora. Tente novamente."); setPasso("erro"); return; }
    setPasso(data.disponivel ? "disponivel" : "indisponivel");
  };
  const continuar = async () => {
    setPasso("registrando");
    const { error } = await supabase.from("bench_vidas_pedidos").insert({ competencia: proxima });
    if (error) { setErro("Não foi possível registrar o pedido. Tente novamente."); setPasso("erro"); return; }
    setPasso("registrado");
  };
  const texto: Record<Passo, string> = {
    perguntar: `A base está atualizada até o mês ${mesAno(ultima)}. Quer que eu verifique a disponibilidade do mês ${mesAno(proxima)}?`,
    verificando: `Verificando na ANS se o mês ${mesAno(proxima)} já foi disponibilizado…`,
    disponivel: `O mês ${mesAno(proxima)} está disponibilizado. Deseja continuar?`,
    indisponivel: `O mês ${mesAno(proxima)} ainda não está disponibilizado pela ANS.`,
    registrando: "Registrando o pedido…",
    registrado: `Pedido do mês ${mesAno(proxima)} registrado. Para baixar e preparar os dados, peça no chat do projeto: "Atualize Bench Vidas Mensal". O andamento aparece no termômetro desta tela.`,
    erro,
  };
  const ocupado = passo === "verificando" || passo === "registrando";
  return <>
    <Button variant="outline" className="h-9 gap-2 rounded-full" onClick={abrir}><RefreshCw className="h-4 w-4" />Atualizar base</Button>
    <AlertDialog open={aberto} onOpenChange={v => { if (!ocupado) setAberto(v); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atualizar base mensal da ANS</AlertDialogTitle>
          <AlertDialogDescription role="status">{texto[passo]}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {passo === "perguntar" && <><Button variant="outline" onClick={() => setAberto(false)}>Não</Button><Button onClick={verificar}>Sim</Button></>}
          {passo === "disponivel" && <><Button variant="outline" onClick={() => setAberto(false)}>Não</Button><Button onClick={continuar}>Sim</Button></>}
          {ocupado && <Button disabled>Aguarde…</Button>}
          {(passo === "indisponivel" || passo === "registrado" || passo === "erro") && <Button onClick={() => setAberto(false)}>Fechar</Button>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
