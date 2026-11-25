import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { loadCPeriods } from "@/control/benchCLoader";

type Passo = "perguntar" | "verificando" | "disponivel" | "indisponivel" | "erro";
type Tri = { ano: number; tri: number };
const proximo = ({ ano, tri }: Tri): Tri => tri >= 4 ? { ano: ano + 1, tri: 1 } : { ano, tri: tri + 1 };
const rotulo = ({ ano, tri }: Tri) => `${tri}º tri/${ano}`;

/** Botão "Atualizar base" do Bench Contábil, nos mesmos termos do Bench Vidas: confere na ANS o trimestre seguinte e, se publicado, atualiza. */
export default function BenchCAtualizar({ ultima, disabled, onAtualizar }: { ultima?: Tri; disabled?: boolean; onAtualizar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<Passo>("perguntar");
  const [erro, setErro] = useState("");
  const seguinte = ultima ? proximo(ultima) : undefined;
  const verificar = async () => {
    if (!seguinte) return;
    setPasso("verificando");
    try {
      const p = await loadCPeriods(seguinte.ano);
      setPasso(p.year === seguinte.ano && (p.quarters ?? []).includes(seguinte.tri) ? "disponivel" : "indisponivel");
    } catch { setErro("Não foi possível consultar a ANS agora. Tente novamente."); setPasso("erro"); }
  };
  const texto: Record<Passo, string> = {
    perguntar: ultima && seguinte ? `A base está atualizada até o ${rotulo(ultima)}. Quer que eu verifique a disponibilidade do ${rotulo(seguinte)}?` : "Carregando a base…",
    verificando: seguinte ? `Verificando na ANS se o ${rotulo(seguinte)} já foi disponibilizado…` : "",
    disponivel: seguinte ? `O ${rotulo(seguinte)} está disponibilizado. Deseja continuar? O andamento aparece no termômetro desta tela.` : "",
    indisponivel: seguinte ? `O ${rotulo(seguinte)} ainda não está disponibilizado pela ANS.` : "",
    erro,
  };
  return <>
    <Button variant="outline" className="h-9 gap-2 rounded-full" disabled={disabled} onClick={() => { setPasso("perguntar"); setErro(""); setAberto(true); }}><RefreshCw className="h-4 w-4" />Atualizar base</Button>
    <AlertDialog open={aberto} onOpenChange={v => { if (passo !== "verificando") setAberto(v); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atualizar base trimestral da ANS</AlertDialogTitle>
          <AlertDialogDescription role="status">{texto[passo]}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {passo === "perguntar" && <><Button variant="outline" onClick={() => setAberto(false)}>Não</Button><Button disabled={!seguinte} onClick={verificar}>Sim</Button></>}
          {passo === "disponivel" && <><Button variant="outline" onClick={() => setAberto(false)}>Não</Button><Button onClick={() => { setAberto(false); onAtualizar(); }}>Sim</Button></>}
          {passo === "verificando" && <Button disabled>Aguarde…</Button>}
          {(passo === "indisponivel" || passo === "erro") && <Button onClick={() => setAberto(false)}>Fechar</Button>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
