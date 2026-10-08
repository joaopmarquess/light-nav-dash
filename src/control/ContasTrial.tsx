import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/control/useAuth";

// Linhas do plano 9D, usadas na lista de alteração (cada nível só mostra os valores ligados aos níveis acima)
const PLANO: any[] = [];
const opcRaw = (l: { g1: string; g2: string; g3: string; g4: string }, g: "g1" | "g2" | "g3" | "g4"): string[] => {
  const acima = (["g1", "g2", "g3", "g4"] as const).slice(0, ["g1", "g2", "g3", "g4"].indexOf(g));
  return Array.from(new Set(PLANO.filter((p) => acima.every((o) => clean(p[o]) === l[o])).map((p) => p[g]).filter((v: string) => clean(v))))
    .sort((a: string, b: string) => clean(a).localeCompare(clean(b), "pt-BR")) as string[];
};

// Contas (Trial): subcontas 13D do balancete MV, ligadas ao plano 9D (9 primeiros dígitos), movimento Jan–Ago/2026.
const ANO = 2026;
const MESES = [1, 2, 3, 4, 5, 6, 7, 8];
type Linha = { c9: number; c13: number; ds: string; g1: string; g2: string; g3: string; g4: string; valor: number; pm: number[]; nova?: boolean };
const NOMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago"];
const G = ["g1", "g2", "g3", "g4"] as const;
const clean = (s: string | null) => (!s || s === "-" ? "" : s.replace(/^\d+\|/, ""));
const fmt = (v: number) => {
  const s = Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `(${s})` : s;
};

async function fetchAll(table: string, build: (q: any) => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(hostinger.from(table)).range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function load(): Promise<Linha[]> {
  const [plano, bal, dim, hist] = await Promise.all([
    fetchAll("plano_contas_icontabil", (q) => q.select("_9d,n2,g1,g2,g3,g4").neq("g2", "-").order("_9d").order("conta").order("n2").order("g1").order("g2").order("g3").order("g4")),
    Promise.all(MESES.map((m) => fetchAll("demonstracoes_contabeis_oracle_mv", (q) =>
      q.select("cd_conta_contabil,vl_debito,vl_credito").eq("nr_ano", ANO).eq("nr_mes", m)
        .gte("cd_conta_contabil", 1000000000000).lte("cd_conta_contabil", 9999999999999)
        .order("cd_conta_contabil").order("vl_debito").order("vl_credito")).then((rs) => rs.map((r) => ({ ...r, _m: m }))))).then((a) => a.flat()),
    fetchAll("plano_contas_contabeis", (q) => q.select("cd_conta_contabil,ds_conta_contabil")
      .gte("cd_conta_contabil", 1000000000000).lte("cd_conta_contabil", 9999999999999).order("cd_conta_contabil").order("ds_conta_contabil")),
    // Contas cadastradas pelo app (Nova) aparecem mesmo sem lançamentos
    supabase.from("plano_contas_historico").select("valor_novo").like("campo", "nova_conta%").then(({ data }) => data || []),
  ]);
  const ds = new Map<number, string>(dim.map((d) => [Number(d.cd_conta_contabil), String(d.ds_conta_contabil ?? "")]));
  const pl = new Map<number, any>(plano.map((p) => [Number(p._9d), p]));
  PLANO.length = 0; PLANO.push(...plano);
  const agg = new Map<number, Linha>();
  for (const r of bal) {
    const c13 = Number(r.cd_conta_contabil);
    const c9 = Math.floor(c13 / 10000);
    const p = pl.get(c9);
    if (!p || !clean(p.g1)) continue;
    if (/IMPOSTOS FEDERAIS/i.test(p.g1) && !String(p.n2 || "").startsWith("61|")) continue;
    const l = agg.get(c13) ?? { c9, c13, ds: ds.get(c13) ?? "", g1: clean(p.g1), g2: clean(p.g2), g3: clean(p.g3), g4: clean(p.g4), valor: 0, pm: MESES.map(() => 0) };
    const v = (Number(r.vl_credito) || 0) - (Number(r.vl_debito) || 0);
    l.valor += v; l.pm[r._m - 1] += v;
    agg.set(c13, l);
  }
  for (const h of hist) {
    const c13 = Number(String(h.valor_novo).split("|")[0]);
    if (!c13 || agg.has(c13)) continue;
    const c9 = Math.floor(c13 / 10000);
    const p = pl.get(c9);
    agg.set(c13, { c9, c13, ds: ds.get(c13) ?? String(h.valor_novo).split("|").slice(1).join("|"), g1: clean(p?.g1 ?? ""), g2: clean(p?.g2 ?? ""), g3: clean(p?.g3 ?? ""), g4: clean(p?.g4 ?? ""), valor: 0, pm: MESES.map(() => 0), nova: true });
  }
  return Array.from(agg.values()).filter((l) => l.nova || l.pm.some((v) => Math.abs(v) > 0.005)).sort((a, b) => a.c13 - b.c13);
}

const ContasTrial = () => {
  const [rows, setRows] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [c9, setC9] = useState("");
  const [c13, setC13] = useState("");
  const [mes, setMes] = useState("");
  const [desc, setDesc] = useState("");
  const [f, setF] = useState<Record<string, string>>({ g1: "", g2: "", g3: "", g4: "" });
  const { user } = useAuth();
  const dono = user?.email?.toLowerCase() === "denis.santana@bensaude.com.br";
  const [edit, setEdit] = useState<{ c9: number; g: (typeof G)[number] } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { load().then(setRows).catch((e) => { setErro(e?.message || String(e)); setRows([]); }); }, []);

  const [pend, setPend] = useState<{ l: Linha; g: (typeof G)[number]; novoRaw: string; qtd: number; erro?: string } | null>(null);
  const alterar = (l: Linha, g: (typeof G)[number], novoRaw: string) => {
    setEdit(null);
    setPend({ l, g, novoRaw, qtd: (rows || []).filter((r) => r.c9 === l.c9).length });
  };
  const confirmar = async () => {
    if (!pend) return;
    const { l, g, novoRaw, qtd } = pend;
    setSalvando(true);
    const { data, error } = await supabase.functions.invoke("alterar-plano", { body: { conta_9d: l.c9, campo: g, valor_novo: novoRaw, subcontas: qtd } });
    setSalvando(false);
    if (error || data?.error) {
      let msg = data?.error || error?.message;
      try { const b = await (error as any)?.context?.json?.(); if (b?.error) msg = b.error; } catch { /* sem corpo */ }
      setPend({ ...pend, erro: `Não foi possível alterar: ${msg}` }); return;
    }
    setRows((rs) => (rs || []).map((r) => (r.c9 === l.c9 ? { ...r, [g]: clean(novoRaw) } : r)));
    setPend(null);
  };

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const passaConta = (l: Linha) => (!c9 || String(l.c9).startsWith(c9)) && (!c13 || String(l.c13).startsWith(c13))
    && (!desc.trim() || norm(desc).trim().split(/\s+/).every((p) => norm(l.ds).includes(p)));
  const filtradas = useMemo(() => (rows || []).map((l) => (mes ? { ...l, valor: l.pm[Number(mes) - 1] } : l))
    .filter((l) => passaConta(l) && G.every((g) => !f[g] || l[g] === f[g]) && (l.nova || Math.abs(l.valor) > 0.005)), [rows, f, c9, c13, mes, desc]);
  // Opções de cada filtro respeitam os demais filtros já escolhidos
  const opcoes = (g: (typeof G)[number]) =>
    Array.from(new Set((rows || []).filter((l) => passaConta(l) && G.every((o) => o === g || !f[o] || l[o] === f[o])).map((l) => l[g]).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const total = filtradas.reduce((s, l) => s + l.valor, 0);

  const campo = (rot: string, v: string, set: (s: string) => void, max: number, w: string) => (
    <label className="text-xs text-muted-foreground flex flex-col gap-1">{rot}
      <div className="relative"><input className={`h-9 ${w} rounded-md border border-input bg-background pl-2 pr-7 text-sm text-foreground tabular-nums`} placeholder="Todas" maxLength={max}
        value={v} onChange={(e) => set(e.target.value.replace(/\D/g, ""))} />
        {v && <button type="button" title="Apagar" onClick={() => set("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
      </div>
    </label>
  );

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-full flex flex-col min-h-0">
      {pend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/10" onClick={() => !salvando && setPend(null)}>
          <div className="w-[360px] rounded-lg border border-border bg-card p-4 shadow-lg text-sm text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="font-medium mb-2">Alterar {pend.g.toUpperCase()} · conta {pend.l.c9}</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>De: <span className="text-foreground">{pend.l[pend.g] || "—"}</span></div>
              <div>Para: <span className="text-foreground">{clean(pend.novoRaw)}</span></div>
              <div>{pend.qtd} subconta(s) afetadas</div>
            </div>
            {pend.erro && <div className="mt-2 text-xs text-destructive">{pend.erro}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={salvando} onClick={() => setPend(null)} className="h-8 px-3 rounded-md border border-input text-xs hover:bg-accent">Cancelar</button>
              <button type="button" disabled={salvando} onClick={confirmar} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90">{salvando ? "Salvando…" : "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}
      <div className="px-6 py-4 border-b border-border flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground flex flex-col gap-1">Mês
          <select className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={mes} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todos</option>
            {MESES.map((m) => <option key={m} value={m}>{NOMES[m - 1]}/{ANO}</option>)}
          </select>
        </label>
        {campo("Conta 9D", c9, setC9, 9, "w-36")}
        {campo("Conta 13D", c13, setC13, 13, "w-44")}
        <label className="text-xs text-muted-foreground flex flex-col gap-1">ds_conta_contabil
          <div className="relative"><input className="h-9 w-56 rounded-md border border-input bg-background pl-2 pr-7 text-sm text-foreground" placeholder="Parte do nome"
            value={desc} onChange={(e) => setDesc(e.target.value)} />
            {desc && <button type="button" title="Apagar" onClick={() => setDesc("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
        </label>
        {G.map((g) => (
          <label key={g} className="text-xs text-muted-foreground flex flex-col gap-1">{g.toUpperCase()}
            <select className="h-9 w-48 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={f[g]}
              onChange={(e) => setF((p) => ({ ...p, [g]: e.target.value }))}>
              <option value="">Todos</option>
              {opcoes(g).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {!rows ? <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          : erro ? <div className="p-6 text-sm text-destructive">Erro ao carregar: {erro}</div>
          : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-muted-foreground">
                  {["cd_conta_contabil (9D)", "cd_conta_contabil (13D)", "ds_conta_contabil", "G1", "G2", "G3", "G4"].map((h) => <th key={h} className="py-2 px-3 text-left font-medium whitespace-nowrap">{h}</th>)}
                  <th className="py-2 px-3 text-right font-medium whitespace-nowrap">Movimento {mes ? `${NOMES[Number(mes) - 1]}/${ANO}` : `Jan–Ago/${ANO}`}</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((l) => (
                  <tr key={l.c13} className="border-b border-border text-foreground">
                    <td className="py-1.5 px-3 tabular-nums"><button type="button" title="Filtrar esta conta" className="text-primary hover:underline"
                      onClick={() => { setF({ g1: "", g2: "", g3: "", g4: "" }); setC13(""); setC9(String(l.c9)); }}>{l.c9}</button></td>
                    <td className="py-1.5 px-3 tabular-nums"><button type="button" title="Filtrar esta subconta" className="text-primary hover:underline"
                      onClick={() => { setF({ g1: "", g2: "", g3: "", g4: "" }); setC9(""); setC13(String(l.c13)); }}>{l.c13}</button></td>
                    <td className="py-1.5 px-3">{l.ds}</td>
                    {G.map((g) => (
                      <td key={g} className={`py-1.5 px-3 ${dono ? "cursor-pointer" : ""}`} title={dono ? "Clique duplo para alterar" : undefined}
                        onDoubleClick={() => dono && !salvando && setEdit({ c9: l.c9, g })}>
                        {edit && edit.c9 === l.c9 && edit.g === g ? (
                          <select autoFocus className="h-8 w-56 rounded-md border border-input bg-background px-1 text-sm" defaultValue=""
                            onBlur={() => setEdit(null)} onKeyDown={(e) => e.key === "Escape" && setEdit(null)}
                            onChange={(e) => e.target.value && alterar(l, g, e.target.value)}>
                            <option value="">{l[g] || "—"} (atual)</option>
                            {opcRaw(l, g).filter((o) => clean(o) !== l[g]).map((o) => <option key={o} value={o}>{clean(o)}</option>)}
                          </select>
                        ) : l[g]}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right tabular-nums whitespace-nowrap">{fmt(l.valor)}</td>
                  </tr>
                ))}
                <tr className="bg-accent font-bold sticky bottom-0">
                  <td className="py-2 px-3" colSpan={7}>TOTAL ({filtradas.length} contas)</td>
                  <td className={`py-2 px-3 text-right tabular-nums ${total < 0 ? "text-destructive" : "text-foreground"}`}>{fmt(total)}</td>
                </tr>
              </tbody>
            </table>
          )}
      </div>
    </section>
  );
};
export default ContasTrial;
