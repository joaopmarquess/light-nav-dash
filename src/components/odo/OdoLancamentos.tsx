import { useEffect, useMemo, useState } from "react";
import {
  odo,
  buildProtocoloMensal,
  diaDoVencimento,
  type OdoFornecedor,
  type OdoLog,
} from "@/lib/odoClient";
import { Loader2, FileText, Globe2, PlayCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const OPERADOR = { cd_operador: 1, operador: "Usuário" };

const openReport = (tipo: "lista" | "global", protocolo: string, mes: string) => {
  const url =
    tipo === "lista"
      ? `/odo-relatorio?tipo=lista&protocolo=${encodeURIComponent(protocolo)}&mes=${mes}`
      : `/odo-relatorio?tipo=global&mes=${mes}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

export default function OdoLancamentos() {
  const [mes, setMes] = useState<string>(new Date().toISOString().slice(0, 7));
  const [fornecedores, setFornecedores] = useState<OdoFornecedor[]>([]);
  const [logs, setLogs] = useState<OdoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  const load = async () => {
    setLoading(true);
    const [f, l] = await Promise.all([
      odo.from("odo_fornecedor").select("*").order("fornecedor"),
      odo
        .from("odo_log")
        .select("*")
        .like("protocolo", `${mes}-%`)
        .order("momento", { ascending: false }),
    ]);
    setFornecedores((f.data as OdoFornecedor[]) ?? []);
    setLogs((l.data as OdoLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [mes]);

  const logsPorFornecedor = useMemo(() => {
    const map = new Map<number, OdoLog[]>();
    logs.forEach((l) => {
      const parts = l.protocolo?.split("-") ?? [];
      const id = Number(parts[2] ?? 0);
      if (!id) return;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(l);
    });
    return map;
  }, [logs]);

  const gerarLote = async () => {
    setGerando(true);
    const protocolosExistentes = new Set(logs.map((l) => l.protocolo));
    const [y, m] = mes.split("-").map(Number);
    const ultimoDia = new Date(y, m, 0).getDate();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const novos = fornecedores
      .filter((f) => !protocolosExistentes.has(buildProtocoloMensal(mes, f.id)))
      .map((f) => {
        const dia = diaDoVencimento(f.vencimento) ?? 1;
        const diaSeguro = Math.min(dia, ultimoDia);
        const dataVenc = `${mes}-${String(diaSeguro).padStart(2, "0")}`;
        return {
          protocolo: buildProtocoloMensal(mes, f.id),
          ...OPERADOR,
          momento: now,
          acao: "Lançamento",
          descricao: `Pagamento previsto ${dataVenc} — ${f.fornecedor} — ${brl(f.vl_bruto)}`,
        };
      });

    if (novos.length === 0) {
      toast({ title: "Nada a gerar", description: "Todos os fornecedores já têm lançamento neste mês." });
      setGerando(false);
      return;
    }

    const { error } = await odo.from("odo_log").insert(novos);
    setGerando(false);
    if (error) {
      toast({ title: "Erro ao gerar lote", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${novos.length} lançamento(s) gerado(s)` });
    load();
  };

  const emitirAcao = async (
    tipo: "Por lista" | "Global",
    fornecedor: OdoFornecedor | null,
  ) => {
    const protocolo = fornecedor ? buildProtocoloMensal(mes, fornecedor.id) : `${mes}-GLOBAL`;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const { error } = await odo.from("odo_log").insert({
      protocolo,
      ...OPERADOR,
      momento: now,
      acao: tipo,
      descricao:
        tipo === "Por lista"
          ? `Emissão relatório por lista — ${fornecedor?.fornecedor} — ${mes}`
          : `Emissão relatório global do mês ${mes}`,
    });
    if (error) {
      toast({ title: "Erro ao registrar ação", description: error.message, variant: "destructive" });
      return;
    }
    openReport(tipo === "Por lista" ? "lista" : "global", protocolo, mes);
    load();
  };

  const totalPrevisto = useMemo(
    () => fornecedores.reduce((s, f) => s + (Number(f.vl_bruto) || 0), 0),
    [fornecedores],
  );
  const gerados = useMemo(
    () => fornecedores.filter((f) => (logsPorFornecedor.get(f.id) ?? []).some((l) => l.acao === "Lançamento")).length,
    [fornecedores, logsPorFornecedor],
  );

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">Lançamentos mensais</h2>
          <p className="text-xs text-muted-foreground">
            {gerados}/{fornecedores.length} gerado(s) · Previsão {brl(totalPrevisto)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
          <button
            onClick={gerarLote}
            disabled={gerando || loading}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Gerar pagamentos do mês
          </button>
          <button
            onClick={() => emitirAcao("Global", null)}
            className="h-9 px-4 rounded-md border border-border text-sm font-medium flex items-center gap-2 hover:bg-accent"
          >
            <Globe2 className="h-4 w-4" /> Relatório global
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur text-foreground/70">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Protocolo</th>
                <th className="text-left px-4 py-2 font-medium">Fornecedor</th>
                <th className="text-center px-4 py-2 font-medium">Tipo</th>
                <th className="text-center px-4 py-2 font-medium">Dia</th>
                <th className="text-right px-4 py-2 font-medium">Valor</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((f) => {
                const protocolo = buildProtocoloMensal(mes, f.id);
                const acoes = logsPorFornecedor.get(f.id) ?? [];
                const gerado = acoes.some((a) => a.acao === "Lançamento");
                const tipoRel: "Por lista" | "Global" | null =
                  f.tp_relatorio === "Por lista" || f.tp_relatorio === "Global"
                    ? (f.tp_relatorio as "Por lista" | "Global")
                    : null;
                const tipoNum = tipoRel === "Por lista" ? "1" : tipoRel === "Global" ? "2" : "-";
                return (
                  <tr key={f.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-2 font-mono text-xs">{protocolo}</td>
                    <td className="px-4 py-2 font-medium">{f.fornecedor}</td>
                    <td className="px-4 py-2 text-center">
                      {tipoRel ? (
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {tipoNum} · {tipoRel}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Não definido</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center font-mono">
                      {diaDoVencimento(f.vencimento)?.toString().padStart(2, "0") ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-right">{brl(f.vl_bruto)}</td>
                    <td className="px-4 py-2">
                      {gerado ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          Gerado · {acoes.length} ação(ões)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => tipoRel && emitirAcao(tipoRel, f)}
                        disabled={!gerado || !tipoRel}
                        className="h-7 px-2 inline-flex items-center gap-1 rounded text-xs hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                        title={tipoRel ? `Emitir relatório ${tipoNum} - ${tipoRel}` : "Defina o tipo no cadastro"}
                      >
                        {tipoRel === "Global" ? (
                          <Globe2 className="h-3.5 w-3.5" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        Emitir {tipoNum}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {fornecedores.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Nenhum fornecedor cadastrado. Cadastre em ODO-NRPS → Fornecedores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
