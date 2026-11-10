import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FlaskConical, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { MenuItem } from "@/lib/axisNavigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "axis.labNav.recolhido";

type Props = {
  items: MenuItem[];
  active: string;
  canHome: boolean;
  onSelect: (id: string) => void;
  onMenuOpenChange?: (label: string | null) => void;
};

const itemId = (c: { id?: string; label: string }) => c.id ?? c.label;

export default function LaboratoryNav({ items, active, canHome, onSelect, onMenuOpenChange }: Props) {
  const [recolhido, setRecolhido] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const grupoAtivo = items.find((g) => g.children?.some((c) => itemId(c) === active))?.label;
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(grupoAtivo ? [grupoAtivo] : []));

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, recolhido ? "1" : "0"); } catch { /* sem armazenamento */ }
  }, [recolhido]);

  useEffect(() => {
    if (grupoAtivo) setAbertos((s) => (s.has(grupoAtivo) ? s : new Set(s).add(grupoAtivo)));
  }, [grupoAtivo]);

  const alternarGrupo = (label: string) =>
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(label)) n.delete(label); else n.add(label);
      return n;
    });

  const base = "flex w-full items-center gap-2 rounded-md text-sm transition-colors";
  const linha = recolhido ? "h-9 justify-center px-0" : "px-3 py-2";
  const estilo = (ativo: boolean) => (ativo ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent");

  const comDica = (label: string, el: React.ReactElement) =>
    recolhido ? (
      <Tooltip>
        <TooltipTrigger asChild>{el}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    ) : el;

  return (
    <nav
      aria-label="Menu Laboratory"
      className={cn(
        "flex min-h-0 shrink-0 flex-col gap-1 overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-card p-2 shadow-sm transition-[width] duration-200",
        recolhido ? "w-14" : "w-60",
      )}
    >
      <div className={cn("mb-1 flex items-center gap-1", recolhido ? "flex-col" : "justify-between")}>
        {comDica("Laboratory",
          <button
            disabled={!canHome}
            type="button"
            onClick={() => onSelect("Laboratory")}
            className={cn(base, linha, "font-semibold", active === "Laboratory" ? "bg-accent text-primary" : "text-primary hover:bg-accent", !recolhido && "flex-1")}
          >
            <FlaskConical className="h-4 w-4 shrink-0" />
            {!recolhido && <span className="truncate">Laboratory</span>}
          </button>,
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={recolhido ? "Mostrar nomes do menu" : "Recolher nomes do menu"}
              aria-expanded={!recolhido}
              onClick={() => setRecolhido((v) => !v)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary"
            >
              {recolhido ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{recolhido ? "Mostrar nomes" : "Recolher nomes"}</TooltipContent>
        </Tooltip>
      </div>
      <div className="mb-1 h-px shrink-0 bg-border" />

      {items.map((g) => {
        const nome = g.label.trim();
        if (!g.children) {
          const ativo = g.label === active;
          return (
            <div key={g.label}>
              {comDica(nome,
                <button type="button" title={recolhido ? undefined : nome} onClick={() => onSelect(g.label)} className={cn(base, linha, estilo(ativo))}>
                  <g.icon className="h-4 w-4 shrink-0" />
                  {!recolhido && <span className="truncate">{nome}</span>}
                </button>,
              )}
            </div>
          );
        }

        const ativo = g.children.some((c) => itemId(c) === active);

        if (recolhido) {
          return (
            <DropdownMenu key={g.label} onOpenChange={(o) => onMenuOpenChange?.(o ? g.label : null)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger aria-label={nome} className={cn(base, linha, estilo(ativo))}>
                    <g.icon className="h-4 w-4 shrink-0" />
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">{nome}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>{nome}</DropdownMenuLabel>
                {g.children.map((c) => (
                  <DropdownMenuItem key={itemId(c)} onSelect={() => onSelect(itemId(c))} className={cn(itemId(c) === active && "bg-accent text-primary")}>
                    <c.icon className="mr-2 h-4 w-4" />{c.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        const aberto = abertos.has(g.label);
        return (
          <div key={g.label} className="flex flex-col gap-0.5">
            <button
              type="button"
              aria-expanded={aberto}
              onClick={() => alternarGrupo(g.label)}
              className={cn(base, linha, ativo && !aberto ? "bg-primary text-primary-foreground" : ativo ? "font-semibold text-primary hover:bg-accent" : "text-foreground hover:bg-accent")}
            >
              <g.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">{nome}</span>
              {aberto ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            </button>
            {aberto && (
              <div className="ml-4 flex flex-col gap-0.5 border-l border-border pl-2">
                {g.children.map((c) => {
                  const sel = itemId(c) === active;
                  return (
                    <button
                      key={itemId(c)}
                      type="button"
                      title={c.label}
                      onClick={() => onSelect(itemId(c))}
                      className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors", estilo(sel))}
                    >
                      <c.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
