import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { ChevronRight, Search, Loader2, FileDown, Printer, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Row = {
  ideAssist: number | string | null;
  bscmp: number | string | null;
  cdpln: number | string | null;
  catipgui: string | null;
  cdcrdexe: string | number | null;
  dscrdexe: string | null;
  dsesp: string | null;
  nmclires: string | null;
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

export default function AssistencialRelatorioExecutor() {
  const [cdpln, setCdpln] = useState("2518");
  const [mabasIni, setMabasIni] = useState("202407");
  const [mabasFim, setMabasFim] = useState("202506");
  const [filtro, setFiltro] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggered, setTriggered] = useState(false);
  const [preview, setPreview] = useState(false);

  const [expTipo, setExpTipo] = useState<Record<string, boolean>>({});
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
            .select("ideAssist,bscmp,cdpln,catipgui,cdcrdexe,dscrdexe,dsesp,nmclires,nmcli,cdregusr,nrgui,dtexe,vrevt")
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

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.dscrdexe, r.nmcli, r.cdregusr, r.nrgui]
        .filter((v) => v != null)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, filtro]);

  // Build report data
  const report = useMemo(() => {
    const isInt = (c: string | null) => String(c ?? "").trim().toLowerCase().startsWith("interna");

    // exe -> dsesp (first non-null)
    const exeEsp = new Map<string, string | null>();
    for (const r of filtered) {
      const exe = r.dscrdexe ?? "(sem prestador)";
      if (!exeEsp.has(exe) || (exeEsp.get(exe) == null && r.dsesp)) {
        exeEsp.set(exe, r.dsesp ?? exeEsp.get(exe) ?? null);
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

    return { exeEsp, s1Rows, s1Tot, s2, s3, exeSortedS2, exeSortedS3 };
  }, [filtered]);

  const exeLabel = (exe: string) => {
    const esp = report.exeEsp.get(exe);
    return esp ? `${exe} (${esp})` : exe;
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
        e = { exe, benef: new Map(), guias: new Set(), valor: 0 };
        t.exe.set(exe, e);
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
            onClick={() => setPreview(true)}
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
                                  <span>{e.exe}</span>
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

      {preview && (
        <ReportPreview
          onClose={() => setPreview(false)}
          cdpln={cdpln}
          mabasIni={mabasIni}
          mabasFim={mabasFim}
          report={report}
          exeLabel={exeLabel}
        />
      )}
    </section>
  );
}

// ============ Report Preview (real PDF in iframe) ============

type ReportData = {
  exeEsp: Map<string, string | null>;
  s1Rows: [string, { int: number; dem: number }][];
  s1Tot: { int: number; dem: number };
  s2: Map<string, Map<string, number>>;
  s3: Map<string, Row[]>;
  exeSortedS2: string[];
  exeSortedS3: string[];
};

function buildPdf({
  cdpln,
  mabasIni,
  mabasFim,
  report,
  exeLabel,
}: {
  cdpln: string;
  mabasIni: string;
  mabasFim: string;
  report: ReportData;
  exeLabel: (exe: string) => string;
}): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 10;
  const marginR = 10;
  const marginT = 12;
  const marginB = 14;
  const usableW = pageW - marginL - marginR;

  const money = fmtBRL;

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Relatório Assistencial (Por Executor)", marginL, marginT - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(
      `cdpln: ${cdpln}   |   Período: ${mabasIni} a ${mabasFim}`,
      marginL,
      marginT,
    );
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
    "Total",
    money(report.s1Tot.int),
    money(report.s1Tot.dem),
    money(report.s1Tot.int + report.s1Tot.dem),
  ]];
  autoTable(doc, {
    ...commonTableOpts,
    startY: marginT + 10,
    head: [["bscmp", "Internação", "Demais Tipos de Guia", "Total"]],
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
  for (const exe of report.exeSortedS2) {
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
        [{ content: exeLabel(exe), colSpan: 2, styles: { halign: "left", fontStyle: "bold" } }],
        ["bscmp", "Total"],
      ],
      body,
      foot: [[{ content: "Subtotal", styles: { halign: "left" } }, { content: money(sub), styles: { halign: "right" } }]],
      columnStyles: {
        0: { cellWidth: usableW * 0.4, halign: "center" },
        1: { cellWidth: usableW * 0.6, halign: "right" },
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
  let s3Grand = 0;
  for (const exe of report.exeSortedS3) {
    const list = report.s3.get(exe)!
      .slice()
      .sort((a, b) => String(a.bscmp).localeCompare(String(b.bscmp)));
    let sub = 0;
    const body = list.map((r) => {
      const v = Number(r.vrevt ?? 0) || 0;
      sub += v;
      return [
        r.nmclires ?? "-",
        r.nmcli ?? "-",
        String(r.cdregusr ?? ""),
        String(r.nrgui ?? ""),
        fmtDateBR(r.dtexe),
        String(r.bscmp ?? ""),
        money(v),
      ];
    });
    s3Grand += sub;

    autoTable(doc, {
      ...commonTableOpts,
      startY: s3Y,
      showFoot: "lastPage",
      head: [
        [{ content: exeLabel(exe), colSpan: 7, styles: { halign: "left", fontStyle: "bold" } }],
        ["nmclires", "nmcli", "cdregusr", "nrgui", "dtexe", "bscmp", "Total"],
      ],
      body,
      foot: [[
        { content: "Subtotal", colSpan: 6, styles: { halign: "left" } },
        { content: money(sub), styles: { halign: "right" } },
      ]],
      columnStyles: {
        0: { cellWidth: usableW * 0.22 },
        1: { cellWidth: usableW * 0.22 },
        2: { cellWidth: usableW * 0.11, halign: "center", overflow: "visible" },
        3: { cellWidth: usableW * 0.09, halign: "center" },
        4: { cellWidth: usableW * 0.08, halign: "center" },
        5: { cellWidth: usableW * 0.08, halign: "center" },
        6: { cellWidth: usableW * 0.20, halign: "right" },
      },
    });
    s3Y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
    if (s3Y > pageH - marginB - 20) { doc.addPage(); s3Y = marginT + 6; }
  }
  autoTable(doc, {
    ...commonTableOpts,
    startY: s3Y,
    body: [[
      { content: "Total Geral", colSpan: 6, styles: { fontStyle: "bold", halign: "left" } },
      { content: money(s3Grand), styles: { halign: "right", fontStyle: "bold" } },
    ]],
    bodyStyles: { fillColor: [235, 235, 235] },
    columnStyles: {
      0: { cellWidth: usableW * 0.22 },
      1: { cellWidth: usableW * 0.22 },
      2: { cellWidth: usableW * 0.11 },
      3: { cellWidth: usableW * 0.09 },
      4: { cellWidth: usableW * 0.08 },
      5: { cellWidth: usableW * 0.08 },
      6: { cellWidth: usableW * 0.20, halign: "right" },
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
  mabasIni,
  mabasFim,
  report,
  exeLabel,
}: {
  onClose: () => void;
  cdpln: string;
  mabasIni: string;
  mabasFim: string;
  report: ReportData;
  exeLabel: (exe: string) => string;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<jsPDF | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = buildPdf({ cdpln, mabasIni, mabasFim, report, exeLabel });
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

