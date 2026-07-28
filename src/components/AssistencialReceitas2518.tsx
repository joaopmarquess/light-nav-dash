import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import FunLoader from "@/components/FunLoader";

type Row = {
  bscmp: string;
  dsevento: string;
  valor: number;
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseNum = (s: string) => {
  if (!s) return 0;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].split(";").map((h) => h.trim());
  const idxBs = header.indexOf("bscmp");
  const idxEv = header.indexOf("dsevento");
  const idxVl = header.indexOf("valor");
  const out: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(";");
    out.push({
      bscmp: (c[idxBs] || "").trim(),
      dsevento: (c[idxEv] || "").trim(),
      valor: parseNum(c[idxVl] || "0"),
    });
  }
  return out;
}

export default function AssistencialReceitas2518() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/2518_receitas.csv");
        if (!res.ok) throw new Error("Falha ao ler CSV");
        const buf = await res.arrayBuffer();
        // Try UTF-8 then fallback ISO-8859-1
        let text = new TextDecoder("utf-8").decode(buf);
        if (text.includes("\uFFFD")) text = new TextDecoder("iso-8859-1").decode(buf);
        setRows(parseCsv(text));
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    if (!rows) return [];
    const byBs = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (!byBs.has(r.bscmp)) byBs.set(r.bscmp, new Map());
      const m = byBs.get(r.bscmp)!;
      m.set(r.dsevento, (m.get(r.dsevento) || 0) + r.valor);
    }
    const arr = Array.from(byBs.entries())
      .map(([bscmp, m]) => {
        const eventos = Array.from(m.entries())
          .map(([dsevento, valor]) => ({ dsevento, valor }))
          .sort((a, b) => b.valor - a.valor);
        const total = eventos.reduce((s, e) => s + e.valor, 0);
        return { bscmp, total, eventos };
      })
      .sort((a, b) => a.bscmp.localeCompare(b.bscmp));
    return arr;
  }, [rows]);

  const totalGeral = useMemo(
    () => grouped.reduce((s, g) => s + g.total, 0),
    [grouped]
  );

  if (error)
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-destructive">
        Erro: {error}
      </section>
    );
  if (!rows)
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center">
        <FunLoader />
      </section>
    );

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">2518 Processo Rec.</h2>
        <div className="text-xs text-muted-foreground">
          Total Geral: <span className="font-semibold text-foreground tabular-nums">{fmtBRL(totalGeral)}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/70 backdrop-blur">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Competência / Evento</th>
              <th className="px-3 py-2 font-medium text-right w-56">Valor</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => {
              const isOpen = !!open[g.bscmp];
              return (
                <>
                  <tr
                    key={g.bscmp}
                    className="border-t border-border hover:bg-accent/40 cursor-pointer"
                    onClick={() => setOpen((p) => ({ ...p, [g.bscmp]: !p[g.bscmp] }))}
                  >
                    <td className="px-3 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {g.bscmp}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtBRL(g.total)}</td>
                  </tr>
                  {isOpen &&
                    g.eventos.map((e) => (
                      <tr key={g.bscmp + "|" + e.dsevento} className="border-t border-border/60 bg-muted/20">
                        <td className="px-3 py-1.5 pl-10 text-foreground/80">{e.dsevento}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtBRL(e.valor)}</td>
                      </tr>
                    ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
