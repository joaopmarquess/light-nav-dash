import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { proximaVersaoProposta, registrarVersaoProposta, type FechoProposta } from "@/lib/propostaVersao";

/** Pede a nota da última página antes de gerar a proposta; ao confirmar, emite a próxima versão (sequencial desde v2). */
export default function PropostaFechoDialog({ id, aberto, onCancelar, onConfirmar }: {
  id: string; aberto: boolean; onCancelar: () => void; onConfirmar: (f: FechoProposta) => void;
}) {
  const [nota, setNota] = useState("");
  const versao = proximaVersaoProposta(id);
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) onCancelar(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Versão {versao}</DialogTitle>
          <DialogDescription>Digite o texto que aparece no fim da última página, após “Versão {versao} |”.</DialogDescription>
        </DialogHeader>
        <Textarea autoFocus rows={4} value={nota} onChange={(e) => setNota(e.target.value)}
          placeholder="Ex.: Revisão realizada após troca de mensagens do grupo de whatsapp..." />
        <DialogFooter>
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button disabled={!nota.trim()} onClick={() => { registrarVersaoProposta(id, versao); onConfirmar({ versao, nota: nota.trim(), data: new Date() }); setNota(""); }}>Gerar proposta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
