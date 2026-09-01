import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, Building2 } from "lucide-react";

type Op = { registro: string; nome: string; ades: number; canc: number; vidas: number; serie: number[] };
type Data = { municipio: string; meses: string[]; operadoras: Op[] };

const RIO_PRETO = ["AUSTACLINICAS", "UNIMED SAO JOSÉ DO RIO PRETO", "BENSAUDE", "H.B. SAÚDE"];
const isRioPreto = (nome: string) => RIO_PRETO.some((k) => nome.toUpperCase().includes(k.toUpperCase()));

const fmt = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtSigned = (v: number) => `${v > 0 ? "+" : ""}${fmt(v)}`;

const TOP_N = 20;

const InteligenciaUberaba = () => {
  const [data, setData] = useState<Data | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ n1: true, n2: true, n3: false });

  useEffect(() => {
    fetch("/data/inteligencia_uberaba.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const groups = useMemo(() => {
    if (!data) return null;
    const term = q.trim().toLowerCase();
    const match = (o: Op) => !term || o.nome.toLowerCase().includes(term) || o.registro.includes(term);
    const all = [...data.operadoras].sort((a, b) => b.vidas - a.vidas);
    const n1 = all.filter((o) => isRioPreto(o.nome));
    const rest = all.filter((o) => !isRioPreto(o.nome));
    const n2 = rest.slice(0, TOP_N);
    const n3 = rest.slice(TOP_N);
    return [
      { id: "n1", titulo: "Nível 1 · Operadoras de Rio Preto", rows: n1.filter(match) },
      { id: "n2", titulo: `Nível 2 · Top ${TOP_N} por Vidas em junho/2026`, rows: n2.filter(match) },
      { id: "n3", titulo: "Nível 3 · Outras operadoras", rows: n3.filter(match) },
    ];
  }, [data, q]);

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
          { l: "Município", v: data.municipio, sub: `${data.operadoras.length} operadoras` },
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
            placeholder="Filtrar operadora ou registro…"
            className="h-9 w-80 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Operadora</th>
              <th className="text-right px-4 py-2 font-medium">Adesões</th>
              <th className="text-right px-4 py-2 font-medium">Cancelamentos</th>
              <th className="text-right px-4 py-2 font-medium">Crescimento</th>
              <th className="text-right px-4 py-2 font-medium">Vidas jun/2026</th>
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
                    g.rows.map((o) => (
                      <tr key={g.id + o.registro} className="border-t border-border/60 hover:bg-accent/30">
                        <td className="px-4 py-1.5 pl-11 text-foreground/80">
                          <span className="inline-flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span title={`Registro ANS ${o.registro}`}>{o.nome}</span>
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-right">{fmt(o.ades)}</td>
                        <td className="px-4 py-1.5 text-right">{fmt(o.canc)}</td>
                        <td className={`px-4 py-1.5 text-right ${o.ades - o.canc < 0 ? "text-destructive" : "text-emerald-600"}`}>
                          {fmtSigned(o.ades - o.canc)}
                        </td>
                        <td className="px-4 py-1.5 text-right font-medium">{fmt(o.vidas)}</td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InteligenciaUberaba;
