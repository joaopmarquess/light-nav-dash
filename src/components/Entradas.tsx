import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";

type Row = {
  CDREGUSR: number | string | null;
  NOME_BENEFICIARIO: string | null;
  NOME_PLANO: string | null;
  Plano_de: string | null;
  Ds_Agente_Comercial: string | null;
  VENDEDOR: string | null;
  Data_ocorrencia: string | null;
  TIPO_LINHA: string | null;
  Ocorrencia: string | null;
};

const fmtInt = (n: number) => n.toLocaleString("pt-BR");

const toISO = (br: string): string | null => {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || yyyy < 1900) return null;
  const lastDay = new Date(yyyy, mm, 0).getDate();
  const day = Math.min(dd, lastDay);
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const isoToBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const firstOfYearBR = () => `01/01/${new Date().getFullYear()}`;
const todayBR = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const PAGE = 1000;

type GroupBy = "agente" | "plano";

interface EntradasProps {
  embedded?: boolean;
  initialDe?: string;
  initialAte?: string;
  initialGroupBy?: GroupBy;
  initialPlanoDe?: string;
}

const Entradas = ({ embedded = false, initialDe, initialAte, initialGroupBy, initialPlanoDe }: EntradasProps = {}) => {
  const [de, setDe] = useState(initialDe ?? firstOfYearBR());
  const [ate, setAte] = useState(initialAte ?? todayBR());
  const [planoDe, setPlanoDe] = useState<string>(initialPlanoDe ?? "Saúde");
  const [groupBy, setGroupBy] = useState<GroupBy>(initialGroupBy ?? "agente");
  const [filtro, setFiltro] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const consultar = async () => {
    const deISO = toISO(de);
    const ateISO = toISO(ate);
    if (!deISO || !ateISO) {
      setError("Datas inválidas. Use dd/mm/aaaa.");
      return;
    }
    setError(null);
    setLoading(true);
    setRows(null);
    setProgress(0);
    setExpanded({});

    const all: Row[] = [];
    let from = 0;
    const pageSize = embedded ? 500 : PAGE;
    while (true) {
      let lastErr: string | null = null;
      let batch: Row[] | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        let q = hostinger
          .from("carteira_movimentacao")
          .select(
            'CDREGUSR,NOME_BENEFICIARIO,NOME_PLANO,Plano_de,Ds_Agente_Comercial,VENDEDOR,Data_ocorrencia,TIPO_LINHA,Ocorrencia'
          )
          .like("Ocorrencia", "ENTRADA%")
          .eq("TIPO_LINHA", "E")
          .gte("Data_ocorrencia", deISO)
          .lte("Data_ocorrencia", `${ateISO} 23:59:59`)
          .range(from, from + pageSize - 1);
        if (!embedded) q = q.order("Data_ocorrencia", { ascending: false });
        if (planoDe && planoDe !== "Todos") q = q.eq("Plano_de", planoDe);
        const { data, error } = await q;
        if (!error) {
          batch = (data ?? []) as Row[];
          lastErr = null;
          break;
        }
        lastErr = error.message;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
      if (batch === null) {
        setError(lastErr ?? "Erro ao consultar");
        setLoading(false);
        return;
      }
      all.push(...batch);
      setProgress(all.length);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    setRows(all);
    setLoading(false);
  };

  const didAutoRun = useRef(false);
  useEffect(() => {
    if (didAutoRun.current) return;
    didAutoRun.current = true;
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    if (!rows) return null;
    const f = filtro.trim().toLowerCase();
    if (!f) return rows;
    return rows.filter((r) =>
      [
        r.NOME_BENEFICIARIO,
        r.NOME_PLANO,
        r.Ds_Agente_Comercial,
        r.VENDEDOR,
        r.CDREGUSR,
      ]
        .map((v) => (v ?? "").toString().toLowerCase())
        .some((s) => s.includes(f))
    );
  }, [rows, filtro]);

  const grouped = useMemo(() => {
    if (!filteredRows) return [] as { key: string; qtd: number; itens: Row[] }[];
    const keyOf = (r: Row) => {
      if (groupBy === "agente") return (r.Ds_Agente_Comercial ?? r.VENDEDOR ?? "").toString().trim() || "SEM AGENTE";
      return (r.NOME_PLANO ?? "").toString().trim() || "SEM PLANO";
    };
    const map = new Map<string, Row[]>();
    for (const r of filteredRows) {
      const k = keyOf(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries())
      .map(([key, itens]) => ({ key, qtd: itens.length, itens }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [filteredRows, groupBy]);

  const total = filteredRows?.length ?? 0;
  const max = grouped[0]?.qtd ?? 0;

  return (
    <section className={embedded ? "h-full w-full flex flex-col" : "bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-9rem)] flex flex-col"}>
      {!embedded && (
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">De</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              onBlur={(e) => { const iso = toISO(e.target.value); if (iso) setDe(isoToBR(iso)); }}
              placeholder="dd/mm/aaaa"
              className="h-9 w-36 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Até</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              onBlur={(e) => { const iso = toISO(e.target.value); if (iso) setAte(isoToBR(iso)); }}
              placeholder="dd/mm/aaaa"
              className="h-9 w-36 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Plano de</label>
          <select
            value={planoDe}
            onChange={(e) => setPlanoDe(e.target.value)}
            className="h-9 rounded-md border border-border bg-background text-sm px-2"
          >
            <option value="Todos">Todos</option>
            <option value="Saúde">Saúde</option>
            <option value="Odonto">Odonto</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Agrupar por</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="h-9 rounded-md border border-border bg-background text-sm px-2"
          >
            <option value="agente">Agente Comercial</option>
            <option value="plano">Plano</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Filtrar</label>
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por nome, agente, plano…"
            className="h-9 w-full px-3 rounded-md border border-border bg-background text-sm"
          />
        </div>
        <button
          onClick={consultar}
          disabled={loading}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {fmtInt(progress)}…
            </span>
          ) : (
            "Consultar"
          )}
        </button>
      </div>
      )}

      {error && <div className="mb-3 text-sm text-destructive">Erro: {error}</div>}

      {rows && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>
              Período: <span className="text-foreground font-medium">{de}</span> a{" "}
              <span className="text-foreground font-medium">{ate}</span>
            </span>
            <span>
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(total)}</span> entrada(s) ·{" "}
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(grouped.length)}</span> grupo(s)
            </span>
          </div>

          <div className="flex-1 overflow-auto border border-border rounded-lg p-4">
            {grouped.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Nenhuma entrada no período.
              </div>
            ) : (
              <div className="space-y-2">
                {grouped.map((g) => {
                  const pct = max ? (g.qtd / max) * 100 : 0;
                  const share = total ? (g.qtd / total) * 100 : 0;
                  const isOpen = !!expanded[g.key];
                  return (
                    <div key={g.key} className="border border-border/60 rounded-md">
                      <button
                        onClick={() => setExpanded((p) => ({ ...p, [g.key]: !p[g.key] }))}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent/40 rounded-md"
                      >
                        <div className="w-64 shrink-0 text-xs font-medium text-foreground truncate text-left" title={g.key}>
                          {g.key}
                        </div>
                        <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                          <div className="h-full bg-primary/80" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-32 shrink-0 text-right text-xs tabular-nums text-foreground">
                          {fmtInt(g.qtd)}{" "}
                          <span className="text-muted-foreground">({share.toFixed(1)}%)</span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="max-h-80 overflow-auto border-t border-border/60">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40 sticky top-0">
                              <tr>
                                <th className="px-3 py-1.5 text-left">CDREGUSR</th>
                                <th className="px-3 py-1.5 text-left">Beneficiário</th>
                                <th className="px-3 py-1.5 text-left">Plano</th>
                                <th className="px-3 py-1.5 text-left">Agente</th>
                                <th className="px-3 py-1.5 text-left">Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.itens.map((r, i) => (
                                <tr key={i} className="border-t border-border/60">
                                  <td className="px-3 py-1 tabular-nums">{r.CDREGUSR ?? "—"}</td>
                                  <td className="px-3 py-1">{r.NOME_BENEFICIARIO ?? "—"}</td>
                                  <td className="px-3 py-1">{r.NOME_PLANO ?? "—"}</td>
                                  <td className="px-3 py-1" title={r.VENDEDOR ? `Vendedor: ${r.VENDEDOR}` : undefined}>{r.Ds_Agente_Comercial ?? r.VENDEDOR ?? "—"}</td>
                                  <td className="px-3 py-1 tabular-nums">
                                    {r.Data_ocorrencia ? isoToBR(String(r.Data_ocorrencia).slice(0, 10)) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default Entradas;
