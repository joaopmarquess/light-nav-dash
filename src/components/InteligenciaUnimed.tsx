import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, Building2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type Tipo = { tipo: string; ades: number; canc: number; vidas: number; serie: number[] };
type Op = { registro: string; nome: string; ades: number; canc: number; vidas: number; serie: number[]; tipos?: Tipo[] };
type Data = { municipio: string; meses: string[]; operadoras: Op[] };

const fmt = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtSigned = (v: number) => `${v > 0 ? "+" : ""}${fmt(v)}`;

const TOP_N = 20;

type SortKey = "nome" | "ades" | "canc" | "cres" | "vidas";

const COLS: { key: SortKey; label: string; align: string }[] = [
  { key: "nome", label: "Cidade", align: "text-left" },
  { key: "ades", label: "Adesões", align: "text-right" },
  { key: "canc", label: "Cancelamentos", align: "text-right" },
  { key: "cres", label: "Crescimento", align: "text-right" },
  { key: "vidas", label: "Vidas jun/2026", align: "text-right" },
];

const InteligenciaUnimed = () => {
  const [data, setData] = useState<Data | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ n2: true, n3: false });
  const [openOp, setOpenOp] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("vidas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "nome" ? "asc" : "desc");
    }
  };

  useEffect(() => {
    fetch("/data/inteligencia_unimed_uberaba.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const sortRows = <T extends { ades: number; canc: number; vidas: number }>(
    rows: T[],
    nameOf: (r: T) => string,
  ) => {
    const mult = sortDir === "asc" ? 1 : -1;
    const val = (r: T) =>
      sortKey === "cres" ? r.ades - r.canc : sortKey === "nome" ? 0 : (r[sortKey as "ades" | "canc" | "vidas"] as number);
    return [...rows].sort((a, b) =>
      sortKey === "nome"
        ? nameOf(a).localeCompare(nameOf(b), "pt-BR") * mult
        : (val(a) - val(b)) * mult,
    );
  };

  const groups = useMemo(() => {
    if (!data) return null;
    const term = q.trim().toLowerCase();
    const match = (o: Op) => !term || o.nome.toLowerCase().includes(term) || o.registro.includes(term);
    const all = [...data.operadoras].sort((a, b) => b.vidas - a.vidas);
    const prep = (rows: Op[]) => sortRows(rows.filter(match), (o) => o.nome);
    return [
      { id: "n2", titulo: `Nível 1 · Top ${TOP_N} cidades por Vidas em junho/2026`, rows: prep(all.slice(0, TOP_N)) },
      { id: "n3", titulo: "Nível 2 · Outras cidades", rows: prep(all.slice(TOP_N)) },
    ];
  }, [data, q, sortKey, sortDir]);

  if (!data || !groups)
    return <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Carregando dados…</div>;

  const tot = (rows: Op[]) =>
    rows.reduce(
      (a, o) => ({ vidas: a.vidas + o.vidas, cres: a.cres + (o.ades - o.canc), ades: a.ades + o.ades, canc: a.canc + o.canc }),
      { vidas: 0, cres: 0, ades: 0, canc: 0 },
    );

  const geral = tot(data.operadoras);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Operadora", v: data.municipio, sub: `${data.operadoras.length} cidades` },
          { l: "Vidas jun/2026", v: fmt(geral.vidas), sub: "soma de beneficiários" },
          { l: "Crescimento", v: fmtSigned(geral.cres), sub: "adesões − cancelamentos" },
          { l: "Período", v: `${data.meses[0]} → ${data.meses[data.meses.length - 1]}`, sub: `${data.meses.length} competências` },
        ].map((c) => (
          <div key={c.l} className="rounded-xl border border-border bg-card p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.l}</div>
            <div className="text-base font-semibold text-foreground mt-1">{c.v}</div>
            <div className="text-[11px] text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar cidade…"
            className="h-9 w-80 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              {COLS.map((c) => {
                const active = sortKey === c.key;
                const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`${c.align} px-4 py-2 font-medium cursor-pointer select-none hover:text-foreground`}
                  >
                    <span className={`inline-flex items-center gap-1 ${c.align === "text-right" ? "flex-row-reverse" : ""}`}>
                      {c.label}
                      <Icon className={`h-3 w-3 ${active ? "text-foreground" : "opacity-50"}`} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const t = tot(g.rows);
              const isOpen = open[g.id];
              return (
                <Fragment key={g.id}>
                  <tr
                    onClick={() => setOpen((p) => ({ ...p, [g.id]: !p[g.id] }))}
                    className="cursor-pointer bg-accent/50 hover:bg-accent border-t border-border"
                  >
                    <td className="px-4 py-2 font-semibold text-primary">
                      <span className="inline-flex items-center gap-2">
                        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        {g.titulo}
                        <span className="text-muted-foreground font-normal">({g.rows.length})</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{fmt(t.ades)}</td>
                    <td className="px-4 py-2 text-right font-medium">{fmt(t.canc)}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${t.cres < 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {fmtSigned(t.cres)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{fmt(t.vidas)}</td>
                  </tr>
                  {isOpen &&
                    g.rows.map((o) => {
                      const opKey = g.id + o.registro;
                      const tipos = sortRows(o.tipos ?? [], (t) => t.tipo);
                      const opOpen = !!openOp[opKey];
                      return (
                        <Fragment key={opKey}>
                          <tr
                            onClick={() => tipos.length > 0 && setOpenOp((p) => ({ ...p, [opKey]: !p[opKey] }))}
                            className={`border-t border-border/60 hover:bg-accent/30 ${tipos.length ? "cursor-pointer" : ""}`}
                          >
                            <td className="px-4 py-1.5 pl-8 text-foreground/80">
                              <span className="inline-flex items-center gap-2">
                                {tipos.length > 0 ? (
                                  <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${opOpen ? "rotate-90" : ""}`} />
                                ) : (
                                  <span className="w-3.5" />
                                )}
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>{o.nome}</span>
                              </span>
                            </td>
                            <td className="px-4 py-1.5 text-right">{fmt(o.ades)}</td>
                            <td className="px-4 py-1.5 text-right">{fmt(o.canc)}</td>
                            <td className={`px-4 py-1.5 text-right ${o.ades - o.canc < 0 ? "text-destructive" : "text-emerald-600"}`}>
                              {fmtSigned(o.ades - o.canc)}
                            </td>
                            <td className="px-4 py-1.5 text-right font-medium">{fmt(o.vidas)}</td>
                          </tr>
                          {opOpen &&
                            tipos.map((t) => (
                              <tr key={opKey + t.tipo} className="border-t border-border/40 bg-muted/20">
                                <td className="px-4 py-1 pl-20 text-xs text-muted-foreground">{t.tipo}</td>
                                <td className="px-4 py-1 text-right text-xs">{fmt(t.ades)}</td>
                                <td className="px-4 py-1 text-right text-xs">{fmt(t.canc)}</td>
                                <td className={`px-4 py-1 text-right text-xs ${t.ades - t.canc < 0 ? "text-destructive" : "text-emerald-600"}`}>
                                  {fmtSigned(t.ades - t.canc)}
                                </td>
                                <td className="px-4 py-1 text-right text-xs font-medium">{fmt(t.vidas)}</td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InteligenciaUnimed;
