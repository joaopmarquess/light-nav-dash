import { Fragment, useRef, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hostinger } from "@/lib/hostingerClient";
import { normalizarEstipulantes, type SuspEstipulante } from "@/lib/consultaSuspensos";

type Props = { rows: [string, number][]; total: number; params: { p_data: string; p_de: string; p_q: string | null; p_empresa: string | null; p_cidade: string | null } };
type Detail = SuspEstipulante[] | "loading" | "missing" | "error";

export default function SuspensosContratacao({ rows, total, params }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const requested = useRef(new Set<string>());
  const percent = (v: number) => total ? `${(v / total * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "—";
  const toggle = async (sigla: string) => {
    setOpen((old) => { const next = new Set(old); if (next.has(sigla)) next.delete(sigla); else next.add(sigla); return next; });
    if (requested.current.has(sigla)) return;
    requested.current.add(sigla);
    setDetails((old) => ({ ...old, [sigla]: "loading" }));
    const { data, error } = await hostinger.rpc("carteira_trial_suspensos_estipulantes", { ...params, p_sigla: sigla });
    setDetails((old) => ({ ...old, [sigla]: error ? (error.code === "PGRST202" || error.code === "42883" ? "missing" : "error") : normalizarEstipulantes(data ?? []) }));
  };
  return (
    <table className="w-full text-sm table-fixed">
      <thead><tr className="text-muted-foreground"><th className="text-left font-medium py-1 w-3/5">Contratação / Nome_Estipulante</th><th className="text-center font-medium">Vidas</th><th className="text-center font-medium">% suspensos</th></tr></thead>
      <tbody>{rows.map(([sigla, vidas]) => {
        const detail = details[sigla];
        return <Fragment key={sigla}>
          <tr className="border-t border-border">
            <td><Button variant="ghost" size="sm" className="h-8 px-1 gap-1" aria-expanded={open.has(sigla)} aria-label={`${open.has(sigla) ? "Recolher" : "Expandir"} ${sigla}`} onClick={() => void toggle(sigla)}><ChevronRight className={`h-4 w-4 transition-transform ${open.has(sigla) ? "rotate-90" : ""}`} />{sigla}</Button></td>
            <td className="text-center tabular-nums">{vidas.toLocaleString("pt-BR")}</td><td className="text-center tabular-nums">{percent(vidas)}</td>
          </tr>
          {open.has(sigla) && (Array.isArray(detail) ? detail.length ? detail.map((r) => <tr key={r.nome_estipulante} className="border-t border-border bg-muted/30"><td className="py-2 pl-6 break-words">{r.nome_estipulante}</td><td className="text-center tabular-nums">{r.vidas.toLocaleString("pt-BR")}</td><td className="text-center tabular-nums">{percent(r.vidas)}</td></tr>) : <tr><td colSpan={3} className="py-2 pl-6 text-muted-foreground">Nenhum estipulante encontrado.</td></tr> : <tr><td colSpan={3} className="py-2 pl-6 text-muted-foreground">{!detail || detail === "loading" ? <span className="inline-flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Carregando estipulantes…</span> : detail === "missing" ? "Detalhamento por estipulante aguarda instalação na Hostinger." : "Não foi possível carregar os estipulantes."}</td></tr>)}
        </Fragment>;
      })}</tbody>
    </table>
  );
}