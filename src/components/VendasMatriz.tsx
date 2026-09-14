import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, ChevronDown, ChevronRight, Loader2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import VendasVendedorProdutoChart from "@/components/VendasVendedorProdutoChart";

type Node = {
  label: string;
  byMonth: Record<string, number>;
  total: number;
  children: Node[];
};

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const LEVEL_LABELS = ["Ano", "Recurso", "Agente", "Vendedor", "Tipo de Produto"];

const fmt = (n: number) => (n ? n.toLocaleString("pt-BR") : "—");

const matches = (n: Node, q: string): boolean =>
  n.label.toLowerCase().includes(q) || n.children.some((c) => matches(c, q));

export default function VendasMatriz() {
  const [data, setData] = useState<{ months: string[]; rows: Node[] } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [mesDe, setMesDe] = useState("1");
  const [mesAte, setMesAte] = useState("12");
  const [view, setView] = useState<"tabela" | "grafico">("tabela");

  useEffect(() => {
    fetch("/data/vendas_ate082026.json")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => console.error(e));
  }, []);

  const query = q.trim().toLowerCase();
  const rows = useMemo(() => {
    if (!data) return [];
    if (!query) return data.rows;
    const filter = (list: Node[]): Node[] =>
      list
        .filter((n) => matches(n, query))
        .map((n) => ({ ...n, children: filter(n.children) }));
    return filter(data.rows);
  }, [data, query]);

  const allMonths = data?.months ?? [];
  const fullRange = mesDe === "1" && mesAte === "12";
  const months = useMemo(
    () =>
      allMonths.filter((m) => Number(m) >= Number(mesDe) && Number(m) <= Number(mesAte)),
    [allMonths, mesDe, mesAte],
  );

  const rowTotal = (n: Node) =>
    fullRange ? n.total : months.reduce((s, m) => s + (n.byMonth[m] ?? 0), 0);

  const totals = useMemo(() => {
    const byMonth: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      for (const m of months) byMonth[m] = (byMonth[m] ?? 0) + (r.byMonth[m] ?? 0);
      total += fullRange ? r.total : months.reduce((s, m) => s + (r.byMonth[m] ?? 0), 0);
    }
    return { byMonth, total };
  }, [rows, months, fullRange]);

  const toggle = (key: string) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderRows = (list: Node[], depth: number, parentKey: string): JSX.Element[] =>
    list.flatMap((n) => {
      const key = `${parentKey}/${n.label}`;
      const isOpen = !!open[key] || (!!query && depth < 4);
      const hasKids = n.children.length > 0;
      const out: JSX.Element[] = [
        <tr
          key={key}
          className={`border-b border-border/60 hover:bg-accent/40 ${
            depth === 0 ? "bg-accent/30 font-semibold" : ""
          }`}
        >
          <td className="sticky left-0 z-10 bg-card px-2 py-1.5">
            <button
              type="button"
              onClick={() => hasKids && toggle(key)}
              className="flex items-center gap-1 text-left"
              style={{ paddingLeft: depth * 16 }}
            >
              {hasKids ? (
                isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )
              ) : (
                <span className="w-3.5" />
              )}
              <span className={depth === 0 ? "" : "text-foreground"}>{n.label}</span>
            </button>
          </td>
          {months.map((m) => (
            <td key={m} className="px-2 py-1.5 text-right tabular-nums">
              {fmt(n.byMonth[m] ?? 0)}
            </td>
          ))}
          <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
            {fmt(rowTotal(n))}
          </td>
        </tr>,
      ];
      if (isOpen && hasKids) out.push(...renderRows(n.children, depth + 1, key));
      return out;
    });

  return (
    <section className="h-full flex flex-col min-h-0 gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar recurso, produto, agente ou vendedor..."
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">De</span>
          <Select value={mesDe} onValueChange={setMesDe}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nome, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">Até</span>
          <Select value={mesAte} onValueChange={setMesAte}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nome, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          Níveis: {LEVEL_LABELS.join(" › ")}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={view === "grafico" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setView(view === "grafico" ? "tabela" : "grafico")}
          >
            {view === "grafico" ? (
              <>
                <Table2 className="h-4 w-4" /> Voltar à matriz
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" /> Gráfico Agente × Produto
              </>
            )}
          </Button>
          <Button
            variant={view === "pizza" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setView(view === "pizza" ? "tabela" : "pizza")}
          >
            {view === "pizza" ? (
              <>
                <Table2 className="h-4 w-4" /> Voltar à matriz
              </>
            ) : (
              <>
                <PieChartIcon className="h-4 w-4" /> Pizza por Produto
              </>
            )}
          </Button>
        </div>
      </div>

      {view === "grafico" && <VendasVendedorProdutoChart />}
      {view === "pizza" && <VendasProdutoPizza />}
      {view === "tabela" && (

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="shrink-0 py-3">
          <CardTitle className="text-base">
            Vendas até 08/2026 — vidas (contagem distinta)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto p-0">
          {!data ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20 bg-secondary">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="sticky left-0 z-30 bg-secondary px-2 py-2 text-left">
                    Ano / Recurso / Agente / Vendedor / Produto
                  </th>
                  {months.map((m) => (
                    <th key={m} className="px-2 py-2 text-right">
                      {MESES[Number(m) - 1] ?? m}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>{renderRows(rows, 0, "")}</tbody>
              <tfoot className="sticky bottom-0 bg-secondary">
                <tr className="font-semibold">
                  <td className="sticky left-0 z-10 bg-secondary px-2 py-2">Total</td>
                  {months.map((m) => (
                    <td key={m} className="px-2 py-2 text-right tabular-nums">
                      {fmt(totals.byMonth[m] ?? 0)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>
      )}
    </section>
  );
}
