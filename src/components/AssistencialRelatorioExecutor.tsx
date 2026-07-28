import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { ChevronRight, Search, Loader2, FileDown, Printer, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import bensaudeLogoAsset from "@/assets/bensaude-logo.svg.asset.json";
const bensaudeLogoUrl = bensaudeLogoAsset.url;

type Row = {
  ideAssist: number | string | null;
  bscmp: number | string | null;
  cdpln: number | string | null;
  dspln: string | null;
  catipgui: string | null;
  cdcrdexe: string | number | null;
  dscrdexe: string | null;
  dsesp: string | null;
  nmclires: string | null;
  nmcli: string | null;
  cdcontrato: string | number | null;
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

const isHospital = (dsesp: string | null | undefined) =>
  String(dsesp ?? "").trim().toLowerCase().startsWith("hospita");

const getBscmpRange = (ini: number, fim: number): number[] => {
  const startYear = Math.floor(ini / 100);
  const startMonth = ini % 100;
  const endMonth = fim % 100;
  if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12 || ini > fim) return [];
  const months: number[] = [];
  let year = startYear;
  let month = startMonth;
  while (year * 100 + month <= fim && months.length < 240) {
    months.push(year * 100 + month);
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return months;
};

const parseCsvRow = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ";" && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

const brDateToIso = (s: string): string | null => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
};

const parseBRNum = (s: string): number => {
  const clean = String(s ?? "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

export default function AssistencialRelatorioExecutor({ source = "db" }: { source?: "db" | "csv2518" } = {}) {
  const [cdpln, setCdpln] = useState("2518");
  const [mabasIni, setMabasIni] = useState("202407");
  const [mabasFim, setMabasFim] = useState("202506");
  const [filtro, setFiltro] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggered, setTriggered] = useState(false);
  const [pdfDialog, setPdfDialog] = useState(false);
  const [pdfCdFilter, setPdfCdFilter] = useState("");
  const [preview, setPreview] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<string>("");

  const [expTipo, setExpTipo] = useState<Record<string, boolean>>({});
  const [expExe, setExpExe] = useState<Record<string, boolean>>({});
  const [expBenef, setExpBenef] = useState<Record<string, boolean>>({});

  const loadCsv = async () => {
    const ini = Number(mabasIni);
    const fim = Number(mabasFim);
    if (!Number.isFinite(ini) || !Number.isFinite(fim) || ini > fim) {
      setError("Período inválido.");
      setTriggered(true);
      return;
    }
    setLoading(true);
    setError(null);
    setRows([]);
    setTriggered(true);
    try {
      const res = await fetch("/data/2518_assistencial_processo.csv");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      const header = parseCsvRow(lines[0]);
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
      const iTG = idx("TG");
      const iDspln = idx("dspln");
      const iBscmp = idx("bscmp");
      const iCdreg = idx("cdregusr");
      const iDsctr = idx("dsctr");
      const iCdcontrato = idx("cdcontrato");
      const iNmcli = idx("nmcli");
      const iCdcrdexe = idx("cdcrdexe");
      const iDscrdexe = idx("dscrdexe");
      const iDsesp = idx("dsesp");
      const iDhexe = idx("dhexe");
      const iNrgui = idx("nrgui");
      const iTotal = idx("Total");
      const acc: Row[] = [];
      for (let li = 1; li < lines.length; li++) {
        const c = parseCsvRow(lines[li]);
        const bscmp = Number(c[iBscmp]);
        if (!Number.isFinite(bscmp) || bscmp < ini || bscmp > fim) continue;
        const tg = String(c[iTG] ?? "").trim();
        acc.push({
          ideAssist: li,
          bscmp,
          cdpln: "2518",
          dspln: c[iDspln] ?? "",
          catipgui: /^i/i.test(tg) ? "Internacao" : "Demais Tipos de Guia",
          cdcrdexe: c[iCdcrdexe] ?? "",
          dscrdexe: c[iDscrdexe] ?? "",
          dsesp: c[iDsesp] ?? "",
          nmclires: c[iDsctr] ?? "",
          nmcli: c[iNmcli] ?? "",
          cdcontrato: iCdcontrato >= 0 ? (c[iCdcontrato] ?? "") : "",
          cdregusr: c[iCdreg] ?? "",
          nrgui: String(c[iNrgui] ?? "").trim(),
          dtexe: brDateToIso(c[iDhexe] ?? ""),
          vrevt: parseBRNum(c[iTotal] ?? "0"),
        });
      }
      setRows(acc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar CSV.");
    } finally {
      setLoading(false);
    }
  };

  const loadDb = async () => {
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
            .select("ideAssist,bscmp,cdpln,dspln,catipgui,cdcrdexe,dscrdexe,dsesp,nmclires,nmcli,cdcontrato,cdregusr,nrgui,dtexe,vrevt")
            .eq("cdpln", cd)
            .eq("bscmp", bscmp)
            .order("ideAssist", { ascending: true })
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
    setRows(acc);
    setLoading(false);
  };

  const load = source === "csv2518" ? loadCsv : loadDb;

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.dscrdexe, r.nmcli, r.cdregusr, r.nrgui]
        .filter((v) => v != null)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, filtro]);

  const dspln = useMemo(() => {
    const found = rows.find((r) => r.dspln != null && String(r.dspln).trim() !== "");
    return found ? String(found.dspln) : "";
  }, [rows]);

  // Build report data
  const report = useMemo(() => {
    const isInt = (c: string | null) => String(c ?? "").trim().toLowerCase().startsWith("interna");

    // exe -> dsesp (first non-null)
    const exeEsp = new Map<string, string | null>();
    const exeCd = new Map<string, string>();
    for (const r of filtered) {
      const exe = r.dscrdexe ?? "(sem prestador)";
      if (!exeEsp.has(exe) || (exeEsp.get(exe) == null && r.dsesp)) {
        exeEsp.set(exe, r.dsesp ?? exeEsp.get(exe) ?? null);
      }
      if (r.cdcrdexe != null && !exeCd.has(exe)) {
        exeCd.set(exe, String(r.cdcrdexe));
      }
    }

    // Section 1: bscmp -> {int, dem}
    const s1 = new Map<string, { int: number; dem: number }>();
    for (const r of filtered) {
      const k = String(r.bscmp ?? "");
      const v = Number(r.vrevt ?? 0) || 0;
      const o = s1.get(k) ?? { int: 0, dem: 0 };
      if (isInt(r.catipgui)) o.int += v; else o.dem += v;
      s1.set(k, o);
    }
    const s1Rows = Array.from(s1.entries()).sort(([a], [b]) => a.localeCompare(b));
    const s1Tot = s1Rows.reduce(
      (acc, [, o]) => ({ int: acc.int + o.int, dem: acc.dem + o.dem }),
      { int: 0, dem: 0 },
    );

    // Section 2: exe -> (bscmp -> total)
    const s2 = new Map<string, Map<string, number>>();
    for (const r of filtered) {
      const exe = r.dscrdexe ?? "(sem prestador)";
      const k = String(r.bscmp ?? "");
      const v = Number(r.vrevt ?? 0) || 0;
      let m = s2.get(exe);
      if (!m) { m = new Map(); s2.set(exe, m); }
      m.set(k, (m.get(k) ?? 0) + v);
    }

    // Section 3: exe -> rows
    const s3 = new Map<string, Row[]>();
    for (const r of filtered) {
      const exe = r.dscrdexe ?? "(sem prestador)";
      const arr = s3.get(exe) ?? [];
      arr.push(r);
      s3.set(exe, arr);
    }

    // Sort executors: hospitais first (alpha), then others (alpha)
    const sortExe = (arr: string[]) => {
      const hosp = arr.filter((e) => isHospital(exeEsp.get(e))).sort((a, b) => a.localeCompare(b));
      const rest = arr.filter((e) => !isHospital(exeEsp.get(e))).sort((a, b) => a.localeCompare(b));
      return [...hosp, ...rest];
    };
    const exeSortedS2 = sortExe(Array.from(s2.keys()));
    const exeSortedS3 = sortExe(Array.from(s3.keys()));

    return { exeEsp, exeCd, s1Rows, s1Tot, s2, s3, exeSortedS2, exeSortedS3 };
  }, [filtered]);



  const exeLabel = (exe: string, includeEsp = true) => {
    const esp = report.exeEsp.get(exe);
    const cd = report.exeCd.get(exe);
    const base = cd ? `${cd} - ${exe}` : exe;
    return includeEsp && esp ? `${base} (${esp})` : base;
  };

  

  type GuiaNode = { nrgui: string; dtexe: string | null; valor: number };
  type BenefNode = {
    key: string;
    nmcli: string;
    cdregusr: string;
    guias: Map<string, GuiaNode>;
    valor: number;
  };
  type ExeNode = {
    exe: string;
    cdcrdexe: string;
    benef: Map<string, BenefNode>;
    guias: Set<string>;
    valor: number;
  };
  type TipoNode = {
    tipo: string;
    label: string;
    exe: Map<string, ExeNode>;
    guias: Set<string>;
    valor: number;
  };

  const tree = useMemo(() => {
    const tipos = new Map<string, TipoNode>();
    for (const r of filtered) {
      const cat = String(r.catipgui ?? "").trim();
      const isInt = cat.toLowerCase().startsWith("interna");
      const tipo = isInt ? "I" : "O";
      const label = isInt ? "Internação" : "Demais Tipos de Guia";
      const exe = r.dscrdexe ?? "(sem prestador executante)";
      const cdExe = String(r.cdcrdexe ?? "");
      const nm = r.nmcli ?? "-";
      const cd = String(r.cdregusr ?? "");
      const bkey = `${nm}|${cd}`;
      const nr = String(r.nrgui ?? "-");
      const valor = Number(r.vrevt ?? 0) || 0;
      const dt = r.dtexe ?? null;

      let t = tipos.get(tipo);
      if (!t) {
        t = { tipo, label, exe: new Map(), guias: new Set(), valor: 0 };
        tipos.set(tipo, t);
      }
      t.guias.add(nr);
      t.valor += valor;

      let e = t.exe.get(exe);
      if (!e) {
        e = { exe, cdcrdexe: cdExe, benef: new Map(), guias: new Set(), valor: 0 };
        t.exe.set(exe, e);
      } else if (!e.cdcrdexe && cdExe) {
        e.cdcrdexe = cdExe;
      }
      e.guias.add(nr);
      e.valor += valor;

      let b = e.benef.get(bkey);
      if (!b) {
        b = { key: bkey, nmcli: nm, cdregusr: cd, guias: new Map(), valor: 0 };
        e.benef.set(bkey, b);
      }
      b.valor += valor;

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
        exeArr: Array.from(t.exe.values())
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
      .sort((a, b) => (a.tipo === "I" ? -1 : b.tipo === "I" ? 1 : 0));
  }, [filtered]);

  const totals = useMemo(() => {
    const g = new Set<string>();
    let v = 0;
    for (const r of filtered) {
      g.add(String(r.nrgui ?? "-"));
      v += Number(r.vrevt ?? 0) || 0;
    }
    return { guias: g.size, valor: v };
  }, [filtered]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3 no-print">
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
          <button
            onClick={() => { setPdfCdFilter(""); setPdfDialog(true); }}
            disabled={loading || rows.length === 0}
            title="Gerar relatório"
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            Gerar PDF
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

      <div className="flex-1 min-h-0 overflow-auto no-print">
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
                <td className="px-3 py-1.5 text-right"></td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(totals.valor)}</td>
              </tr>
            </thead>
            <tbody>
              {tree.map((t) => {
                const tOpen = !!expTipo[t.tipo];
                return (
                  <Fragment key={`t:${t.tipo}`}>
                    <tr className="border-b border-border bg-accent/50 hover:bg-accent/70 font-bold">
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
                      <td className="px-3 py-1.5 text-right"></td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(t.valor)}</td>
                    </tr>
                    {tOpen &&
                      t.exeArr.map((e) => {
                        const eKey = `${t.tipo}||${e.exe}`;
                        const eOpen = !!expExe[eKey];
                        return (
                          <Fragment key={`e:${eKey}`}>
                            <tr className="border-b border-border/50 hover:bg-accent/40 font-medium">
                              <td className="px-3 py-1.5 pl-6">
                                <button
                                  className="inline-flex items-center gap-1"
                                  onClick={() => setExpExe((p) => ({ ...p, [eKey]: !p[eKey] }))}
                                >
                                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${eOpen ? "rotate-90" : ""}`} />
                                  <span>{e.cdcrdexe ? `${e.cdcrdexe} - ` : ""}{e.exe}</span>
                                </button>
                              </td>
                              <td className="px-3 py-1.5 text-right">{e.guias.size.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-1.5 text-right"></td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(e.valor)}</td>
                            </tr>
                            {eOpen &&
                              e.benefArr.map((b) => {
                                const bKey = `${eKey}||${b.key}`;
                                const bOpen = !!expBenef[bKey];
                                return (
                                  <Fragment key={`b:${bKey}`}>
                                    <tr className="border-b border-border/40 hover:bg-accent/30">
                                      <td className="px-3 py-1.5 pl-12">
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
                                      <td className="px-3 py-1.5 text-right"></td>
                                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(b.valor)}</td>
                                    </tr>
                                    {bOpen &&
                                      b.guiaArr.map((g) => (
                                        <tr key={`g:${bKey}||${g.nrgui}`} className="border-b border-border/30 hover:bg-accent/20 text-muted-foreground">
                                          <td className="px-3 py-1.5 pl-18">{g.nrgui}</td>
                                          <td className="px-3 py-1.5 text-right">1</td>
                                          <td className="px-3 py-1.5 text-right">{fmtDateBR(g.dtexe)}</td>
                                          <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmtBRL(g.valor)}</td>
                                        </tr>
                                      ))}
                                  </Fragment>
                                );
                              })}
                          </Fragment>
                        );
                      })}
                  </Fragment>
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

      {pdfDialog && (() => {
        const cdTrim = pdfCdFilter.trim();
        const matchExe = cdTrim
          ? report.exeSortedS3.find((e) => report.exeCd.get(e) === cdTrim) ?? null
          : null;
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-card border border-border rounded-lg shadow-xl w-[420px] p-5 space-y-4">
              <div className="text-sm font-medium">Gerar PDF</div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Filtrar por cdcrdexe (opcional — aplica apenas à Seção 3)
                </label>
                <input
                  type="text"
                  value={pdfCdFilter}
                  onChange={(e) => setPdfCdFilter(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="Deixe em branco para todos"
                  className="h-9 w-full px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {cdTrim && (
                  <div className="text-xs text-muted-foreground">
                    {matchExe
                      ? <>Executor: <span className="font-medium text-foreground">{matchExe}</span></>
                      : <span className="text-destructive">Nenhum executor encontrado com esse cdcrdexe.</span>}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setPdfDialog(false)}
                  className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setPreviewFilter(cdTrim);
                    setPdfDialog(false);
                    setPreview(true);
                  }}
                  disabled={!!cdTrim && !matchExe}
                  className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {preview && (
        <ReportPreview
          onClose={() => setPreview(false)}
          cdpln={cdpln}
          dspln={dspln}
          mabasIni={mabasIni}
          mabasFim={mabasFim}
          report={report}
          exeLabel={exeLabel}
          filterCd={previewFilter}
        />
      )}
    </section>
  );
}

// ============ Report Preview (real PDF in iframe) ============

type ReportData = {
  exeEsp: Map<string, string | null>;
  exeCd: Map<string, string>;
  s1Rows: [string, { int: number; dem: number }][];
  s1Tot: { int: number; dem: number };
  s2: Map<string, Map<string, number>>;
  s3: Map<string, Row[]>;
  exeSortedS2: string[];
  exeSortedS3: string[];
};

async function loadLogoAsPng(url: string): Promise<{ dataUrl: string; aspect: number }> {
  const res = await fetch(url);
  const svgText = await res.text();
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const objUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = objUrl;
    });
    const w = img.naturalWidth || 300;
    const h = img.naturalHeight || 100;
    const scale = 600 / w;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/png"), aspect: w / h };
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}


function buildPdf({
  cdpln,
  dspln,
  mabasIni,
  mabasFim,
  report,
  exeLabel,
  filterCd,
  logoDataUrl,
  logoAspect,
}: {
  cdpln: string;
  dspln: string;
  mabasIni: string;
  mabasFim: string;
  report: ReportData;
  exeLabel: (exe: string, includeEsp?: boolean) => string;
  filterCd?: string;
  logoDataUrl?: string;
  logoAspect?: number;
}): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 10;
  const marginR = 10;
  const marginT = 22;
  const marginB = 14;
  const usableW = pageW - marginL - marginR;

  const money = fmtBRL;

  const filterExe = filterCd
    ? report.exeSortedS3.find((e) => report.exeCd.get(e) === filterCd) ?? null
    : null;

  const header = () => {
    const line1Y = 10;
    // Logo (esquerda) — centralizado verticalmente na linha 1
    if (logoDataUrl) {
      const h = 10;
      const w = h * (logoAspect ?? 3);
      try {
        doc.addImage(logoDataUrl, "PNG", marginL, line1Y - h / 2, w, h);
      } catch {
        // ignore
      }
    }
    // Linha 1 centro: título | período
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    const titulo = `Relatório de Contas Médicas | ${mabasIni} a ${mabasFim}`;
    doc.text(titulo, pageW / 2, line1Y, { align: "center", baseline: "middle" });
    // Linha 2 esquerda: cdpln | dspln
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    const line2 = `${cdpln}${dspln ? ` | ${dspln}` : ""}`;
    doc.text(line2, marginL, 17);
    doc.setTextColor(0);
  };

  // Reserve room for the header on every page via didDrawPage.
  const commonTableOpts: Parameters<typeof autoTable>[1] = {
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1.2, lineColor: [140, 140, 140], lineWidth: 0.1, textColor: 20 },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: "bold", halign: "center", lineColor: [140, 140, 140], lineWidth: 0.1 },
    footStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: "bold" },
    theme: "grid",
    margin: { left: marginL, right: marginR, top: marginT + 4, bottom: marginB },
    didDrawPage: () => header(),
  };

  // Section page tracking for footer labels
  const sectionByPage: Record<number, string> = {};
  const markSectionPages = (label: string, fromPage: number) => {
    const to = doc.getNumberOfPages();
    for (let p = fromPage; p <= to; p++) sectionByPage[p] = label;
  };
  let sec1Start = doc.getNumberOfPages();

  // ---------- Section 1 ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Seção 1 - Competência (todos os executores)", marginL, marginT + 8);

  const s1Body = report.s1Rows.map(([k, o]) => [
    k,
    money(o.int),
    money(o.dem),
    money(o.int + o.dem),
  ]);
  const s1Foot = [[
    { content: "Total", styles: { halign: "left" as const } },
    { content: money(report.s1Tot.int), styles: { halign: "right" as const } },
    { content: money(report.s1Tot.dem), styles: { halign: "right" as const } },
    { content: money(report.s1Tot.int + report.s1Tot.dem), styles: { halign: "right" as const } },
  ]];
  autoTable(doc, {
    ...commonTableOpts,
    startY: marginT + 10,
    head: [[
      "bscmp",
      { content: "Internação", styles: { halign: "right" } },
      { content: "Demais Tipos de Guia", styles: { halign: "right" } },
      { content: "Total", styles: { halign: "right" } },
    ]],
    body: s1Body,
    foot: s1Foot,
    columnStyles: {
      0: { cellWidth: usableW * 0.22, halign: "center" },
      1: { cellWidth: usableW * 0.26, halign: "right" },
      2: { cellWidth: usableW * 0.26, halign: "right" },
      3: { cellWidth: usableW * 0.26, halign: "right" },
    },
  });

  // ---------- Section 2 ----------
  markSectionPages("Seção 1 - Competência", sec1Start);
  doc.addPage();
  const sec2Start = doc.getNumberOfPages();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Seção 2 - Executor", marginL, marginT + 8);

  let s2Y = marginT + 10;
  let s2Grand = 0;
  const selectedExe = filterCd
    ? report.exeSortedS2.find((e) => report.exeCd.get(e) === filterCd) ?? null
    : null;
  const s2Order = selectedExe
    ? [selectedExe, ...report.exeSortedS2.filter((e) => e !== selectedExe)]
    : report.exeSortedS2;
  for (const exe of s2Order) {
    const m = report.s2.get(exe)!;
    const rows = Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
    let sub = 0;
    const body = rows.map(([k, v]) => { sub += v; return [k, money(v)]; });
    s2Grand += sub;

    autoTable(doc, {
      ...commonTableOpts,
      startY: s2Y,
      showFoot: "lastPage",
      head: [
        [{ content: exeLabel(exe, false), colSpan: 3, styles: { halign: "left", fontStyle: "bold" } }],
        [{ content: "bscmp", colSpan: 2, styles: { halign: "center" } }, { content: "Total", styles: { halign: "right" } }],
      ],
      body: body.map(([k, v]) => [{ content: k, colSpan: 2, styles: { halign: "center" } }, v]),
      foot: [[
        { content: `Subtotal do Executor (${exe})`, colSpan: 2, styles: { halign: "left", fontStyle: "bold", fillColor: [245, 245, 245] } },
        { content: money(sub), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 245, 245] } },
      ]],
      columnStyles: {
        0: { cellWidth: usableW * 0.5 },
        1: { cellWidth: usableW * 0.3, halign: "center" },
        2: { cellWidth: usableW * 0.2, halign: "right" },
      },
    });
    s2Y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
    if (s2Y > pageH - marginB - 20) { doc.addPage(); s2Y = marginT + 6; }
  }
  autoTable(doc, {
    ...commonTableOpts,
    startY: s2Y,
    body: [[{ content: "Total Geral", styles: { fontStyle: "bold", halign: "left" } }, { content: money(s2Grand), styles: { halign: "right", fontStyle: "bold" } }]],
    bodyStyles: { fillColor: [235, 235, 235] },
    columnStyles: {
      0: { cellWidth: usableW * 0.4 },
      1: { cellWidth: usableW * 0.6, halign: "right" },
    },
  });

  // ---------- Section 3 ----------
  markSectionPages("Seção 2 - Executor", sec2Start);
  doc.addPage();
  const sec3Start = doc.getNumberOfPages();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Seção 3 - Geral", marginL, marginT + 8);

  let s3Y = marginT + 10;
  if (filterExe) {
    const cdExe = report.exeCd.get(filterExe) ?? "";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${cdExe} - ${filterExe}`, marginL, s3Y + 3);
    s3Y += 5;
  }
  let s3Grand = 0;
  const s3ExeList = filterExe ? [filterExe] : report.exeSortedS3;

  // Column widths (fractions of usableW) for Section 3
  const s3W = {
    nmcli: usableW * 0.42,
    dp: usableW * 0.06,
    nrgui: usableW * 0.16,
    dtexe: usableW * 0.12,
    bscmp: usableW * 0.12,
    total: usableW * 0.12,
  };
  const cellPad = 1.2;
  const truncFront = (s: string, colW: number) => {
    const maxW = colW - 2 * cellPad;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    if (!s) return s;
    if (doc.getTextWidth(s) <= maxW) return s;
    let out = s;
    while (out.length > 1 && doc.getTextWidth("..." + out) > maxW) {
      out = out.slice(1);
    }
    return "..." + out;
  };

  // Aggregate all executors' rows by contract -> guia
  type GAgg = {
    nrgui: string;
    nmcli: string;
    cdregusr: string;
    dtexe: string | null;
    bscmp: string;
    valor: number;
  };
  type CtAgg = {
    cdcontrato: string;
    nmclires: string;
    guias: Map<string, GAgg>;
  };
  const contratoMap = new Map<string, CtAgg>();
  for (const exe of s3ExeList) {
    for (const r of report.s3.get(exe) ?? []) {
      const ct = String(r.cdcontrato ?? "-");
      let cg = contratoMap.get(ct);
      if (!cg) {
        cg = { cdcontrato: ct, nmclires: String(r.nmclires ?? "-"), guias: new Map() };
        contratoMap.set(ct, cg);
      }
      if (!cg.nmclires || cg.nmclires === "-") cg.nmclires = String(r.nmclires ?? cg.nmclires);
      const key = String(r.nrgui ?? "-");
      const v = Number(r.vrevt ?? 0) || 0;
      const cur = cg.guias.get(key);
      if (!cur) {
        cg.guias.set(key, {
          nrgui: key,
          nmcli: String(r.nmcli ?? "-"),
          cdregusr: String(r.cdregusr ?? ""),
          dtexe: r.dtexe ?? null,
          bscmp: String(r.bscmp ?? ""),
          valor: v,
        });
      } else {
        cur.valor += v;
        if (r.dtexe && (!cur.dtexe || String(r.dtexe) < String(cur.dtexe))) cur.dtexe = r.dtexe;
      }
    }
  }

  const contratoList = Array.from(contratoMap.values()).sort((a, b) => {
    const n = a.nmclires.localeCompare(b.nmclires);
    if (n !== 0) return n;
    return a.cdcontrato.localeCompare(b.cdcontrato);
  });

  for (const cg of contratoList) {
    const guias = Array.from(cg.guias.values()).sort((a, b) => a.nrgui.localeCompare(b.nrgui));
    let sub = 0;
    const body: (string | { content: string; colSpan?: number; styles?: Record<string, unknown> })[][] = [];
    for (const g of guias) {
      sub += g.valor;
      const cd = String(g.cdregusr ?? "");
      const dp = cd ? String(Number(cd.slice(-2)) || 0) : "";
      body.push([
        truncFront(g.nmcli, s3W.nmcli),
        dp,
        g.nrgui,
        fmtDateBR(g.dtexe),
        g.bscmp,
        money(g.valor),
      ]);
    }
    s3Grand += sub;

    const headerLabel = `${cg.nmclires} (${cg.cdcontrato})`;
    autoTable(doc, {
      ...commonTableOpts,
      startY: s3Y,
      head: [
        [{ content: headerLabel, colSpan: 6, styles: { halign: "left", fontStyle: "bold", fillColor: [230, 230, 230] } }],
        [
          "Nome Beneficiário",
          { content: "dp", styles: { halign: "center" } },
          { content: "Guia", styles: { halign: "center" } },
          { content: "Execução", styles: { halign: "center" } },
          { content: "Competência", styles: { halign: "center" } },
          { content: "Total", styles: { halign: "right" } },
        ],
      ],
      body,
      foot: [[
        { content: `Subtotal (Contrato: ${cg.cdcontrato})`, colSpan: 5, styles: { halign: "left", fontStyle: "bold", fillColor: [245, 245, 245] } },
        { content: money(sub), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 245, 245] } },
      ]],
      columnStyles: {
        0: { cellWidth: s3W.nmcli },
        1: { cellWidth: s3W.dp, halign: "center" },
        2: { cellWidth: s3W.nrgui, halign: "center" },
        3: { cellWidth: s3W.dtexe, halign: "center" },
        4: { cellWidth: s3W.bscmp, halign: "center" },
        5: { cellWidth: s3W.total, halign: "right" },
      },
    });
    s3Y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
    if (s3Y > pageH - marginB - 20) { doc.addPage(); s3Y = marginT + 6; }
  }
  autoTable(doc, {
    ...commonTableOpts,
    startY: s3Y,
    body: [[
      { content: `TOTAL:  ${filterExe || "GERAL"}`, styles: { fontStyle: "bold", halign: "left" } },
      { content: money(s3Grand), styles: { halign: "right", fontStyle: "bold" } },
    ]],
    bodyStyles: { fillColor: [235, 235, 235] },
    columnStyles: {
      0: { cellWidth: s3W.nmcli + s3W.dp + s3W.nrgui + s3W.dtexe + s3W.bscmp },
      1: { cellWidth: s3W.total, halign: "right" },
    },
  });
  markSectionPages("Seção 3 - Geral", sec3Start);

  // ---------- Page numbers ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    const sec = sectionByPage[i] ?? "";
    if (sec) doc.text(sec, marginL, pageH - 6, { align: "left" });
    doc.text(`Página ${i} de ${total}`, pageW - marginR, pageH - 6, { align: "right" });
  }

  return doc;
}


function ReportPreview({
  onClose,
  cdpln,
  dspln,
  mabasIni,
  mabasFim,
  report,
  exeLabel,
  filterCd,
}: {
  onClose: () => void;
  cdpln: string;
  dspln: string;
  mabasIni: string;
  mabasFim: string;
  report: ReportData;
  exeLabel: (exe: string, includeEsp?: boolean) => string;
  filterCd?: string;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<jsPDF | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const logo = await loadLogoAsPng(bensaudeLogoUrl).catch(() => null);
      const doc = buildPdf({
        cdpln,
        dspln,
        mabasIni,
        mabasFim,
        report,
        exeLabel,
        filterCd,
        logoDataUrl: logo?.dataUrl,
        logoAspect: logo?.aspect,
      });
      docRef.current = doc;
      // Render each page as PNG via pdf.js — evita bloqueios de blob/data no Edge.
      const pdfjs = await import("pdfjs-dist");
      const workerMod: { default: string } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;
      const data = doc.output("arraybuffer");
      const pdf = await pdfjs.getDocument({ data }).promise;
      const imgs: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        imgs.push(canvas.toDataURL("image/png"));
        if (cancelled) return;
      }
      if (!cancelled) {
        setPages(imgs);
        setLoading(false);
      }
    })().catch((err) => {
      console.error("[ReportPreview] falha ao renderizar PDF:", err);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doDownload = () => {
    if (!docRef.current) return;
    docRef.current.save(`relatorio_executor_${cdpln}_${mabasIni}_${mabasFim}.pdf`);
  };

  const doPrint = () => {
    if (pages.length === 0) return;
    const w = window.open("", "_blank");
    if (!w) {
      // popup bloqueado — fallback: baixar
      doDownload();
      return;
    }
    const imgsHtml = pages
      .map(
        (src) =>
          `<img src="${src}" style="display:block;width:100%;page-break-after:always;" />`
      )
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { max-width: 100%; }
  @media print { img { page-break-after: always; } }
</style>
</head><body>${imgsHtml}<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250);};</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="bg-card border-b border-border p-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          Pré-visualização do Relatório (PDF) {pages.length > 0 && `— ${pages.length} página(s)`}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={doDownload}
            disabled={loading}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" /> Baixar PDF
          </button>
          <button
            onClick={doPrint}
            disabled={loading || pages.length === 0}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent inline-flex items-center gap-2"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-neutral-800 p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando PDF...
          </div>
        ) : pages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            Não foi possível gerar a pré-visualização.
          </div>
        ) : (
          <div className="mx-auto max-w-4xl flex flex-col gap-4">
            {pages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Página ${i + 1}`}
                className="w-full bg-white shadow-lg"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

