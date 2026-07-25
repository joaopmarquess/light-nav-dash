import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Search } from "lucide-react";
import FunLoader from "@/components/FunLoader";

type Row = {
  ideAssist: number;
  bscmp: number | null;
  dtexe: string | null;
  nmcli: string | null;
  catipgui: string | null;
  idtipprc: string | null;
  dsamb: string | null;
  dsesp: string | null;
  dscrdexe: string | null;
  dspln: string | null;
  vrtotgui: number | string | null;
};

const PAGE = 200;

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (s: string | null) => {
  if (!s) return "-";
  const [y, m, d] = s.split("-");
  return d ? `${d}/${m}/${y}` : s;
};

const currentPeriod = () => {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
};

export default function Assistencial() {
  const [periodo, setPeriodo] = useState<string>(currentPeriod());
  const [periodoInput, setPeriodoInput] = useState<string>(currentPeriod());
  const [filtro, setFiltro] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setRows([]);
    setReachedEnd(false);
    (async () => {
      const bs = Number(periodo);
      if (!Number.isFinite(bs)) {
        setLoading(false);
        return;
      }
      let from = 0;
      const acc: Row[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await hostinger
          .from("assistencial")
          .select(
            "ideAssist,bscmp,dtexe,nmcli,catipgui,idtipprc,dsamb,dsesp,dscrdexe,dspln,vrtotgui",
          )
          .eq("bscmp", bs)
          .order("ideAssist", { ascending: true })
          .range(from, from + PAGE - 1);
        if (!alive) return;
        if (error) {
          setError(error.message);
          break;
        }
        const chunk = (data ?? []) as Row[];
        acc.push(...chunk);
        setRows([...acc]);
        if (chunk.length < PAGE) {
          setReachedEnd(true);
          break;
        }
        from += PAGE;
        if (from > 20000) break; // safety cap
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [periodo]);

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.nmcli, r.dscrdexe, r.dsamb, r.dsesp, r.catipgui, r.idtipprc, r.dspln]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, filtro]);

  const totals = useMemo(() => {
    let vr = 0;
    for (const r of filtered) vr += Number(r.vrtotgui ?? 0);
    return { count: filtered.length, vr };
  }, [filtered]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Período (AAAAMM)</label>
          <input
            type="text"
            value={periodoInput}
            onChange={(e) => setPeriodoInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onBlur={() => periodoInput.length === 6 && setPeriodo(periodoInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && periodoInput.length === 6) setPeriodo(periodoInput);
            }}
            placeholder="202606"
            className="h-9 w-28 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por beneficiário, prestador, procedimento, plano..."
            className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {loading ? "Carregando..." : `${totals.count.toLocaleString("pt-BR")} guias`} · R$ {fmtBRL(totals.vr)}
          {!loading && !reachedEnd && rows.length > 0 && " (parcial)"}
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-destructive">Erro ao carregar: {error}</div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {loading && rows.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <FunLoader />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Data Exec.</th>
                <th className="px-3 py-2">Beneficiário</th>
                <th className="px-3 py-2">Plano</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Procedimento</th>
                <th className="px-3 py-2">Ambulatorial</th>
                <th className="px-3 py-2">Especialidade</th>
                <th className="px-3 py-2">Prestador</th>
                <th className="px-3 py-2 text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.ideAssist} className="border-b border-border/50 hover:bg-accent/40">
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(r.dtexe)}</td>
                  <td className="px-3 py-1.5">{r.nmcli ?? "-"}</td>
                  <td className="px-3 py-1.5">{r.dspln ?? "-"}</td>
                  <td className="px-3 py-1.5">{r.catipgui ?? "-"}</td>
                  <td className="px-3 py-1.5">{r.idtipprc ?? "-"}</td>
                  <td className="px-3 py-1.5">{r.dsamb ?? "-"}</td>
                  <td className="px-3 py-1.5">{r.dsesp ?? "-"}</td>
                  <td className="px-3 py-1.5">{r.dscrdexe ?? "-"}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(Number(r.vrtotgui ?? 0))}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum registro encontrado para o período {periodo}.
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
