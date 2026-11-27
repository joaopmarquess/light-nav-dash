import { useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/** Envia por e-mail, a todos os usuários com situação OK, o aviso de atualização escrito pelo administrador. */
export function AvisoAtualizacaoButton({ ativos }: { ativos: number }) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  async function enviar() {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("avisar-atualizacao", { body: { novidades: texto } });
    setBusy(false);
    if (error || data?.error) { toast.error(data?.error ?? "Não foi possível enviar o aviso."); return; }
    toast.success(`Aviso enviado a ${data.enviados} de ${data.total} usuários.${data.bloqueados ? ` ${data.bloqueados} descadastrado(s) do e-mail.` : ""}${data.falhas ? ` ${data.falhas} falha(s).` : ""}`);
    setOpen(false); setTexto("");
  }
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><Megaphone className="mr-2 h-4 w-4" />Avisar atualização</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>Avisar usuários sobre a atualização</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Label htmlFor="aviso-novidades">O que mudou (uma novidade por linha)</Label>
        <Textarea id="aviso-novidades" rows={6} maxLength={3000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={"Área Geográfica no celular\nRegiões do IBGE no mapa"} />
        <p className="text-xs text-muted-foreground">Vai por e-mail para os {ativos} usuários com situação OK, com o botão "Abrir o AXIS".</p>
        <Button onClick={enviar} disabled={busy || texto.trim().length < 3}>{busy ? "Enviando…" : "Enviar aviso"}</Button>
      </div>
    </DialogContent></Dialog>
  </>;
}
