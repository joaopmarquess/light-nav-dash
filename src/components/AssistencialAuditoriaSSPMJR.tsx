import { useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { ChevronRight, Search, Loader2 } from "lucide-react";

type Row = {
  ideAssist: number | string | null;
  bscmp: number | string | null;
  cdpln: number | string | null;
  catipgui: string | null;
  dscrdexe: string | null;
  nmcli: string | null;
  cdregusr: string | number | null;
  nrgui: string | number | null;
  dtexe: string | null;
  vrevt: number | string | null;
};

const PAGE = 500;

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDateBR = (s: string | null): string => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    // try YYYY-MM-DD raw
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return String(s);
  }
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};

const minDate = (a: string | null, b: string | null): string | null => {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
};

const getBscmpRange = (ini: number, fim: number): number[] => {
  const startYear = Math.floor(ini / 100);
  const startMonth = ini % 100;
  const endYear = Math.floor(fim / 100);
  const endMonth = fim % 100;
  if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12 || ini > fim) return [];

  const months: number[] = [];
  let year = startYear;
  let month = startMonth;
  while (year * 100 + month <= fim && months.length < 240) {
    months.push(year * 100 + month);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
};

export default function AssistencialAuditoriaSSPMJR() {
  const [cdpln, setCdpln] = useState("2518");
  const [mabasIni, setMabasIni] = useState("202407");
  const [mabasFim, setMabasFim] = useState("202506");
  const [filtro, setFiltro] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggered, setTriggered] = useState(false);

  const [expTipo, setExpTipo] = useState<Record<string, boolean>>({});
  const [expMabas, setExpMabas] = useState<Record<string, boolean>>({});
  const [expExe, setExpExe] = useState<Record<string, boolean>>({});
  const [expBenef, setExpBenef] = useState<Record<string, boolean>>({});

  const load = async () => {
    const cd = Number(cdpln);
    const ini = Number(mabasIni);
    const fim = Number(mabasFim);
    if (!Number.isFinite(cd) || !Number.isFinite(ini) || !Number.isFinite(fim)) return;
    const months = getBscmpRange(ini, fim);
    if (months.length === 0) {
      setError("Período inválido.");
      setTriggered(true);
      return;
    }
    setLoading(true);
    setError(null);
    setRows([]);
    setTriggered(true);
    const acc: Row[] = [];

    for (const bscmp of months) {
      let from = 0;
      while (true) {
        let attempt = 0;
        let chunk: Row[] | null = null;
        let lastError: string | null = null;
        while (attempt < 4) {
          const size = Math.max(100, PAGE >> attempt);
          const { data, error } = await hostinger
            .from("assistencial")
            .select("ideAssist,bscmp,cdpln,catipgui,dscrdexe,nmcli,cdregusr,nrgui,dtexe,vrevt")
            .eq("cdpln", cd)
            .eq("bscmp", bscmp)
            .range(from, from + size - 1);
          if (!error) {
            chunk = (data ?? []) as Row[];
            from += size;
            break;
          }
          lastError = error.message;
          if (!/timeout/i.test(error.message)) break;
          attempt += 1;
        }

        if (!chunk) {
          setError(lastError ?? "Erro ao carregar dados.");
          setLoading(false);
          return;
        }

        acc.push(...chunk);
        if (chunk.length < Math.max(100, PAGE >> attempt)) break;

        if (from > 100000) break;
      }
    }

    acc.sort((a, b) => {
      const aBscmp = String(a.bscmp ?? "");
      const bBscmp = String(b.bscmp ?? "");
      if (aBscmp !== bBscmp) return aBscmp.localeCompare(bBscmp);
      return Number(a.ideAssist ?? 0) - Number(b.ideAssist ?? 0);
    });
    setRows(acc);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.dscrdexe, r.nmcli, r.cdregusr, r.nrgui]
        .filter((v) => v != null)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, filtro]);

  type GuiaNode = { nrgui: string; dtexe: string | null; valor: number };
  type BenefNode = {
    key: string;
    nmcli: string;
    cdregusr: string;
    guias: Map<string, GuiaNode>;
    valor: number;
    dtexe: string | null;
  };
  type ExeNode = {
    exe: string;
    benef: Map<string, BenefNode>;
    guias: Set<string>;
    valor: number;
    dtexe: string | null;
  };
  type MabasNode = {
    bscmp: string;
    exe: Map<string, ExeNode>;
    guias: Set<string>;
    valor: number;
    dtexe: string | null;
  };
  type TipoNode = {
    tipo: string;
    label: string;
    mabas: Map<string, MabasNode>;
    guias: Set<string>;
    valor: number;
    dtexe: string | null;
  };

  const tree = useMemo(() => {
    const tipos = new Map<string, TipoNode>();
    for (const r of filtered) {
      const isInt = String(r.idtipgui ?? "").trim().toUpperCase() === "I";
      const tipo = isInt ? "I" : "O";
      const label = isInt ? "Internação" : "Demais Tipos de Guia";
      const bscmp = String(r.bscmp ?? "-");
      const exe = r.dscrdexe ?? "(sem prestador executante)";
      const nm = r.nmcli ?? "-";
      const cd = String(r.cdregusr ?? "");
      const bkey = `${nm}|${cd}`;
      const nr = String(r.nrgui ?? "-");
      const valor = Number(r.vrevt ?? 0) || 0;
      const dt = r.dtexe ?? null;

      let t = tipos.get(tipo);
      if (!t) {
        t = { tipo, label, mabas: new Map(), guias: new Set(), valor: 0, dtexe: null };
        tipos.set(tipo, t);
      }
      t.guias.add(nr);
      t.valor += valor;
      t.dtexe = minDate(t.dtexe, dt);

      let m = t.mabas.get(bscmp);
      if (!m) {
        m = { bscmp, exe: new Map(), guias: new Set(), valor: 0, dtexe: null };
        t.mabas.set(bscmp, m);
      }
      m.guias.add(nr);
      m.valor += valor;
      m.dtexe = minDate(m.dtexe, dt);

      let e = m.exe.get(exe);
      if (!e) {
        e = { exe, benef: new Map(), guias: new Set(), valor: 0, dtexe: null };
        m.exe.set(exe, e);
      }
      e.guias.add(nr);
      e.valor += valor;
      e.dtexe = minDate(e.dtexe, dt);

      let b = e.benef.get(bkey);
      if (!b) {
        b = { key: bkey, nmcli: nm, cdregusr: cd, guias: new Map(), valor: 0, dtexe: null };
        e.benef.set(bkey, b);
      }
      b.valor += valor;
      b.dtexe = minDate(b.dtexe, dt);

      let g = b.guias.get(nr);
      if (!g) {
        g = { nrgui: nr, dtexe: dt, valor: 0 };
        b.guias.set(nr, g);
      }
      g.dtexe = minDate(g.dtexe, dt);
      g.valor += valor;
    }
    return Array.from(tipos.values())
      .map((t) => ({
        ...t,
        mabasArr: Array.from(t.mabas.values())
          .map((m) => ({
            ...m,
            exeArr: Array.from(m.exe.values())
              .map((e) => ({
                ...e,
                benefArr: Array.from(e.benef.values())
                  .map((b) => ({
                    ...b,
                    guiaArr: Array.from(b.guias.values()).sort((x, y) => x.nrgui.localeCompare(y.nrgui)),
                  }))
                  .sort((a, b) => b.valor - a.valor),
              }))
              .sort((a, b) => b.valor - a.valor),
          }))
          .sort((a, b) => a.bscmp.localeCompare(b.bscmp)),
      }))
      .sort((a, b) => (a.tipo === "I" ? -1 : b.tipo === "I" ? 1 : 0));
  }, [filtered]);

  const totals = useMemo(() => {
    const g = new Set<string>();
    let v = 0;
    let dt: string | null = null;
    for (const r of filtered) {
      g.add(String(r.nrgui ?? "-"));
      v += Number(r.vrevt ?? 0) || 0;
      dt = minDate(dt, r.dtexe ?? null);
    }
    return { guias: g.size, valor: v, dtexe: dt };
  }, [filtered]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">cdpln</label>
          <input
            type="text"
            inputMode="numeric"
            value={cdpln}
            onChange={(e) => setCdpln(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="h-9 w-24 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <label className="text-xs text-muted-foreground ml-2">bscmp de</label>
          <input
            type="text"
            inputMode="numeric"
            value={mabasIni}
            onChange={(e) => setMabasIni(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="AAAAMM"
            className="h-9 w-24 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <label className="text-xs text-muted-foreground">até</label>
          <input
            type="text"
            inputMode="numeric"
            value={mabasFim}
            onChange={(e) => setMabasFim(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="AAAAMM"
            className="h-9 w-24 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={load}
            disabled={loading}
            className="ml-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Carregar
          </button>
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por prestador, beneficiário ou guia..."
            className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {error && <div className="p-4 text-sm text-destructive">Erro ao carregar: {error}</div>}

      <div className="flex-1 min-h-0 overflow-auto">
        {!triggered ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Configure os filtros e clique em Carregar.
          </div>
        ) : loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Carregando...
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">Prestador / Beneficiário / Guia</th>
                <th className="px-3 py-2 text-right">Guias</th>
                <th className="px-3 py-2 text-right">Data Execução</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
              <tr className="text-xs font-semibold bg-accent/50 border-b border-border">
                <td className="px-3 py-1.5">Total</td>
                <td className="px-3 py-1.5 text-right">{totals.guias.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-1.5 text-right">{fmtDateBR(totals.dtexe)}</td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(totals.valor)}</td>
              </tr>
            </thead>
            <tbody>
              {tree.map((t) => {
                const tOpen = !!expTipo[t.tipo];
                return (
                  <>
                    <tr key={`t:${t.tipo}`} className="border-b border-border bg-accent/50 hover:bg-accent/70 font-bold">
                      <td className="px-3 py-1.5">
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => setExpTipo((p) => ({ ...p, [t.tipo]: !p[t.tipo] }))}
                        >
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${tOpen ? "rotate-90" : ""}`} />
                          <span>{t.label}</span>
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-right">{t.guias.size.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-1.5 text-right">{fmtDateBR(t.dtexe)}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(t.valor)}</td>
                    </tr>
                    {tOpen &&
                      t.mabasArr.map((m) => {
                        const mKey = `${t.tipo}||${m.bscmp}`;
                        const mOpen = !!expMabas[mKey];
                        return (
                          <>
                            <tr key={`m:${mKey}`} className="border-b border-border bg-accent/30 hover:bg-accent/50 font-semibold">
                              <td className="px-3 py-1.5 pl-6">
                                <button
                                  className="inline-flex items-center gap-1"
                                  onClick={() => setExpMabas((p) => ({ ...p, [mKey]: !p[mKey] }))}
                                >
                                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${mOpen ? "rotate-90" : ""}`} />
                                  <span>{m.bscmp}</span>
                                </button>
                              </td>
                              <td className="px-3 py-1.5 text-right">{m.guias.size.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-right">{fmtDateBR(m.dtexe)}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(m.valor)}</td>
                            </tr>
                            {mOpen &&
                              m.exeArr.map((e) => {
                                const eKey = `${mKey}||${e.exe}`;
                                const eOpen = !!expExe[eKey];
                                return (
                                  <>
                                    <tr key={`e:${eKey}`} className="border-b border-border/50 hover:bg-accent/40 font-medium">
                                      <td className="px-3 py-1.5 pl-12">
                                        <button
                                          className="inline-flex items-center gap-1"
                                          onClick={() => setExpExe((p) => ({ ...p, [eKey]: !p[eKey] }))}
                                        >
                                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${eOpen ? "rotate-90" : ""}`} />
                                          <span>{e.exe}</span>
                                        </button>
                                      </td>
                                      <td className="px-3 py-1.5 text-right">{e.guias.size.toLocaleString("pt-BR")}</td>
                                      <td className="px-3 py-1.5 text-right">{fmtDateBR(e.dtexe)}</td>
                                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(e.valor)}</td>
                                    </tr>
                                    {eOpen &&
                                      e.benefArr.map((b) => {
                                        const bKey = `${eKey}||${b.key}`;
                                        const bOpen = !!expBenef[bKey];
                                        return (
                                          <>
                                            <tr key={`b:${bKey}`} className="border-b border-border/40 hover:bg-accent/30">
                                              <td className="px-3 py-1.5 pl-18">
                                                <button
                                                  className="inline-flex items-center gap-1"
                                                  onClick={() => setExpBenef((p) => ({ ...p, [bKey]: !p[bKey] }))}
                                                >
                                                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${bOpen ? "rotate-90" : ""}`} />
                                                  <span>
                                                    {b.nmcli} {b.cdregusr ? `(${b.cdregusr})` : ""}
                                                  </span>
                                                </button>
                                              </td>
                                              <td className="px-3 py-1.5 text-right">{b.guias.size.toLocaleString("pt-BR")}</td>
                                              <td className="px-3 py-1.5 text-right">{fmtDateBR(b.dtexe)}</td>
                                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(b.valor)}</td>
                                            </tr>
                                            {bOpen &&
                                              b.guiaArr.map((g) => (
                                                <tr key={`g:${bKey}||${g.nrgui}`} className="border-b border-border/30 hover:bg-accent/20 text-muted-foreground">
                                                  <td className="px-3 py-1.5 pl-24">{g.nrgui}</td>
                                                  <td className="px-3 py-1.5 text-right">1</td>
                                                  <td className="px-3 py-1.5 text-right">{fmtDateBR(g.dtexe)}</td>
                                                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(g.valor)}</td>
                                                </tr>
                                              ))}
                                          </>
                                        );
                                      })}
                                  </>
                                );
                              })}
                          </>
                        );
                      })}
                  </>
                );
              })}
              {tree.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum registro encontrado.
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
