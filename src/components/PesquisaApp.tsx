import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Lock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { catalogoTelas, pesquisarTelas } from "@/lib/pesquisaApp";
import { cn } from "@/lib/utils";

/** "Pesquisar App": any user finds a screen, sees where it is in the menus and whether they may open it. */
export default function PesquisaApp({ can, onAbrir, disabled }: { can: (id: string) => boolean; onAbrir: (id: string) => void; disabled?: boolean }) {
  const [aberto, setAberto] = useState(false), [texto, setTexto] = useState(""), [foco, setFoco] = useState(0);
  const telas = useMemo(() => catalogoTelas(), []);
  const resultados = useMemo(() => pesquisarTelas(texto, telas).slice(0, 30), [texto, telas]);
  useEffect(() => setFoco(0), [texto]);
  useEffect(() => {
    const atalho = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (!disabled) setAberto(true); } };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, [disabled]);
  const abrir = (id: string) => { if (!can(id)) return; setAberto(false); setTexto(""); onAbrir(id); };
  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFoco(f => Math.min(f + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFoco(f => Math.max(f - 1, 0)); }
    else if (e.key === "Enter" && resultados[foco]) { e.preventDefault(); abrir(resultados[foco].id); }
  };
  return <>
    <Button type="button" variant="outline" disabled={disabled} onClick={() => setAberto(true)} className="h-9 gap-2 text-muted-foreground" title="Pesquisar App (Ctrl+K)">
      <Search className="h-4 w-4" /><span className="hidden md:inline">Pesquisar App</span><kbd className="hidden rounded border border-border px-1.5 text-[10px] font-medium lg:inline">Ctrl K</kbd>
    </Button>
    <Dialog open={aberto} onOpenChange={o => { setAberto(o); if (!o) setTexto(""); }}>
      <DialogContent className="max-w-2xl gap-3">
        <DialogHeader><DialogTitle>Pesquisar App</DialogTitle><DialogDescription>Digite parte do nome de uma tela para ver onde ela está e abri-la.</DialogDescription></DialogHeader>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus aria-label="Pesquisar telas" placeholder="Ex.: simulador, inadimplência, painel…" value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={teclas} className="pl-9" /></div>
        <div className="max-h-[55vh] overflow-auto" role="listbox" aria-label="Telas encontradas">
          {texto.trim() && resultados.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhuma tela encontrada para “{texto.trim()}”.</p>}
          {resultados.map((t, i) => { const ok = can(t.id); return (
            <div key={t.id} role="option" aria-selected={i === foco} onMouseEnter={() => setFoco(i)}
              className={cn("flex items-center justify-between gap-3 border-b border-border px-3 py-2.5", i === foco && "bg-muted/60")}>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{t.label}</p>
                <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">{t.caminho.map((c, j) => <span key={j} className="inline-flex items-center gap-1">{j > 0 && <ChevronRight className="h-3 w-3" />}{c}</span>)}</p>
              </div>
              {ok
                ? <Button size="sm" variant="ghost" className="shrink-0 gap-1 text-primary" onClick={() => abrir(t.id)}>Ir para a tela<ArrowRight className="h-4 w-4" /></Button>
                : <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground" title="Peça acesso ao administrador"><Lock className="h-3.5 w-3.5" />Sem permissão · peça ao administrador</span>}
            </div>); })}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
