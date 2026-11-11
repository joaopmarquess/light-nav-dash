import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PauseCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { avaliarEnvio, type EnvioRegistro } from "@/lib/benchVidasEnvio";

const nf = (v: number) => v.toLocaleString("pt-BR");
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const duracao = (ms: number) => { const m = Math.floor(ms / 60_000); return m < 1 ? `${Math.max(1, Math.floor(ms / 1000))} s` : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

/** Termômetro do envio mais recente dos dados mensais; lê a contagem real gravada pelo programa de envio. */
export function BenchVidasEnvio() {
  const [registro, setRegistro] = useState<(EnvioRegistro & { rotulo: string }) | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    let ativo = true;
    const ler = async () => {
      const { data } = await supabase.from("bench_vidas_envio").select("*").order("atualizado_em", { ascending: false }).limit(1).maybeSingle();
      if (ativo) { setRegistro(data); setAgora(Date.now()); }
    };
    ler();
    const t = window.setInterval(ler, 15_000);
    return () => { ativo = false; window.clearInterval(t); };
  }, []);
  if (!registro) return null;
  const a = avaliarEnvio(registro, agora);
  if (!a.visivel) return null;
  const alerta = a.estado === "parado" || a.estado === "erro";
  const situacao = {
    andamento: <><Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />Em andamento · último sinal há {duracao(a.semSinalMs)}</>,
    sem_avanco: <><PauseCircle className="h-3.5 w-3.5" />Sem avanço há {duracao(a.semAvancoMs)} · nenhum arquivo novo desde {hora(registro.progresso_em)}</>,
    parado: <><AlertTriangle className="h-3.5 w-3.5" />Envio parado desde {hora(registro.atualizado_em)} · sem sinal há {duracao(a.semSinalMs)}</>,
    erro: <><AlertTriangle className="h-3.5 w-3.5" />Envio interrompido{registro.mensagem ? ` · ${registro.mensagem}` : ""}</>,
    concluido: <><CheckCircle2 className="h-3.5 w-3.5" />Concluído às {hora(registro.atualizado_em)}{registro.mensagem ? ` · ${registro.mensagem}` : ""}</>,
  }[a.estado];
  return <section aria-label="Andamento do envio" className="bench-filters space-y-1.5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
      <span><strong>Envio · {registro.rotulo}</strong> <span className="text-muted-foreground">· Etapa {registro.etapa_ordem} de {registro.etapas}: {registro.etapa}</span></span>
      <span className="tabular-nums"><strong>{nf(a.feitos)}</strong> de {nf(a.total)} arquivos · faltam <strong>{nf(a.pendentes)}</strong>{registro.falhas > 0 && <span className="text-destructive"> · {nf(registro.falhas)} com falha</span>} · {a.percentual}%</span>
    </div>
    <div role="progressbar" aria-valuemin={0} aria-valuemax={a.total} aria-valuenow={a.feitos} aria-label={`${registro.etapa}: ${a.feitos} de ${a.total}`} className="h-2.5 overflow-hidden rounded-full bg-muted">
      <div className={`h-full transition-[width] duration-700 motion-reduce:transition-none ${alerta ? "bg-destructive" : "bg-primary"}`} style={{ width: `${a.total ? (a.feitos / a.total) * 100 : 0}%` }} />
    </div>
    <p role="status" className={`flex items-center gap-1.5 text-xs ${alerta ? "text-destructive" : "text-muted-foreground"}`}>{situacao}</p>
  </section>;
}
