import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import FunLoader from "@/components/FunLoader";
import FiltersBar from "./FiltersBar";
import VisaoGeral from "./VisaoGeral";
import Balancete from "./Balancete";
import PlanoContas from "./PlanoContas";
import AnalisesGerenciais from "./AnalisesGerenciais";
import EvolucaoTemporal from "./EvolucaoTemporal";
import { ContabRow } from "./types";

export const CONTAB_SUBMENUS = [
  "Visão Geral",
  "Balancete",
  "Plano de Contas",
  "Análises Gerenciais",
  "Evolução Temporal",
] as const;

export default function ContabilidadeShell({ active }: { active: string }) {
  const [anos, setAnos] = useState<number[]>([]);
  const [ano, setAno] = useState<number | null>(null);
  const [mes, setMes] = useState<number | null>(null);
  const [trimestre, setTrimestre] = useState<number | null>(null);
  const [rows, setRows] = useState<ContabRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Descobrir anos
  useEffect(() => {
    (async () => {
      const { data, error } = await hostinger
        .from("contabilidade")
        .select("nr_ano")
        .limit(100000);
      if (error) { setError(error.message); return; }
      const arr = Array.from(new Set((data || []).map((r: any) => r.nr_ano as number))).sort((a, b) => b - a);
      setAnos(arr);
      if (arr.length && ano === null) setAno(arr[0]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Para Evolução Temporal, carregar TODOS os anos ignorando mes/trimestre.
  const isEvolucao = active === "Evolução Temporal";

  useEffect(() => {
    if (ano === null && !isEvolucao) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let q = hostinger.from("contabilidade").select("*").limit(50000);
        if (!isEvolucao) {
          if (ano !== null) q = q.eq("nr_ano", ano);
          if (mes !== null) q = q.eq("nr_mes", mes);
          if (trimestre !== null) q = q.eq("nr_trimestre", trimestre);
        }
        const { data, error } = await q;
        if (cancelled) return;
        if (error) throw error;
        setRows((data || []) as ContabRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ano, mes, trimestre, isEvolucao]);

  const content = useMemo(() => {
    if (loading) return <div className="h-full flex items-center justify-center"><FunLoader /></div>;
    if (error) return <div className="text-sm text-destructive p-4">Erro: {error}</div>;
    switch (active) {
      case "Visão Geral": return <VisaoGeral rows={rows} />;
      case "Balancete": return <Balancete rows={rows} />;
      case "Plano de Contas": return <PlanoContas rows={rows} />;
      case "Análises Gerenciais": return <AnalisesGerenciais rows={rows} />;
      case "Evolução Temporal": return <EvolucaoTemporal rows={rows} />;
      default: return null;
    }
  }, [active, loading, error, rows]);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <FiltersBar
          anos={anos}
          ano={ano}
          mes={mes}
          trimestre={trimestre}
          onAno={setAno}
          onMes={setMes}
          onTrim={setTrimestre}
          extra={
            isEvolucao ? (
              <div className="text-[11px] text-muted-foreground self-end pb-1">
                Evolução Temporal ignora filtros de Ano/Mês/Trimestre.
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground self-end pb-1">
                {rows.length.toLocaleString("pt-BR")} lançamentos
              </div>
            )
          }
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{content}</div>
    </div>
  );
}
