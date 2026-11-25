import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { proximaVersaoProposta, registrarVersaoProposta, type FechoProposta } from "@/lib/propostaVersao";

/** Pede a nota da última página antes de gerar a proposta; ao confirmar, emite a próxima versão (sequencial desde v2). */
export default function PropostaFechoDialog({ id, aberto, onCancelar, onConfirmar }: {
  id: string; aberto: boolean; onCancelar: () => void; onConfirmar: (f: FechoProposta) => void;
}) {
  const [nota, setNota] = useState("");
  const sugerida = proximaVersaoProposta(id);
  const [texto, setTexto] = useState(String(sugerida));
  useEffect(() => { if (aberto) setTexto(String(proximaVersaoProposta(id))); }, [aberto, id]);
  const n = Number(texto);
  const valida = /^\d+$/.test(texto.trim()) && n >= 1;
  const versao = valida ? n : sugerida;
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) onCancelar(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Versão {versao}</DialogTitle>
          <DialogDescription>Digite o texto que aparece no fim da última página, após “Versão {versao} |”.</DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 text-sm">Número da versão (sugerida: {sugerida})
          <Input className="w-24" inputMode="numeric" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <Textarea autoFocus rows={4} value={nota} onChange={(e) => setNota(e.target.value)}
          placeholder="Ex.: Revisão realizada após troca de mensagens do grupo de whatsapp..." />
        <DialogFooter>
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button disabled={!nota.trim() || !valida} onClick={() => { registrarVersaoProposta(id, versao); onConfirmar({ versao, nota: nota.trim(), data: new Date() }); setNota(""); }}>Gerar proposta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
