import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { dw as supabase } from "@/lib/dwClient";
import { useAuth } from "@/control/useAuth";

const DONO = "denis.santana@bensaude.com.br";
const G = ["g1", "g2", "g3", "g4"] as const;
type Plano = { _9d: number; conta: string; g1: string; g2: string; g3: string; g4: string; o1: string };

async function loadPlano(): Promise<Plano[]> {
  const out: Plano[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await hostinger.from("plano_contas_icontabil").select("_9d,conta,g1,g2,g3,g4,o1")
      .order("_9d").order("conta").order("g1").order("g2").order("g3").order("g4").range(from, from + 999);
    if (error) throw error;
    out.push(...((data as Plano[]) || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const inp = "h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:opacity-70";
const Campo = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={`flex flex-col gap-1 text-sm ${className}`}><span className="text-muted-foreground">{label}</span>{children}</label>
);

const NovaConta = () => {
  const { user } = useAuth();
  const dono = user?.email?.toLowerCase() === DONO;
  const [plano, setPlano] = useState<Plano[] | null>(null);
  const [c13, setC13] = useState("");
  const [ds, setDs] = useState("");
  const [tp, setTp] = useState<"A" | "S">("A");
  const [nome9, setNome9] = useState("");
  const [gs, setGs] = useState<Record<string, string>>({ g1: "", g2: "", g3: "", g4: "" });
  const [existe13, setExiste13] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => { loadPlano().then(setPlano).catch((e) => setMsg({ ok: false, t: e.message })); }, []);

  const c9 = c13.length >= 9 ? Number(c13.slice(0, 9)) : null;
  const p9 = useMemo(() => (c9 && plano ? plano.find((p) => p._9d === c9) || null : null), [c9, plano]);
  const nova9 = c13.length === 13 && !p9;

  useEffect(() => {
    setExiste13(null);
    if (c13.length !== 13) return;
    hostinger.from("plano_contas_contabeis").select("ds_conta_contabil").eq("cd_conta_contabil", Number(c13)).limit(1)
      .then(({ data }) => setExiste13(data?.[0]?.ds_conta_contabil ?? null));
  }, [c13]);

  const opc = (i: number) => {
    const s = new Set<string>();
    for (const p of plano || []) {
      if (G.slice(0, i).every((g) => p[g] === gs[g]) && p[G[i]]) s.add(p[G[i]]);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  };
  const setG = (i: number, v: string) => setGs((p) => {
    const n = { ...p, [G[i]]: v };
    G.slice(i + 1).forEach((g) => (n[g] = ""));
    return n;
  });

  const pronto = dono && c13.length === 13 && !existe13 && ds.trim() && (!nova9 || (nome9.trim() && G.every((g) => gs[g])));

  const salvar = async () => {
    setSalvando(true); setMsg(null);
    const { data, error } = await supabase.functions.invoke("cadastrar-conta", {
      body: { conta_13d: c13, ds_conta_contabil: ds.trim(), tp_conta: tp, conta_9d_nome: nome9.trim(), ...gs },
    });
    setSalvando(false);
    if (error || data?.error) {
      let m = data?.error || error?.message;
      try { const b = await (error as any)?.context?.json?.(); if (b?.error) m = b.error; } catch { /* sem corpo */ }
      setMsg({ ok: false, t: `Não foi possível cadastrar: ${m}` }); return;
    }
    setMsg({ ok: true, t: `Conta ${c13} cadastrada${data.nova9d ? " (com nova conta 9D)" : ""}. Código reduzido ${data.cd_reduzido}.` });
    if (data.nova9d) loadPlano().then(setPlano);
    setC13(""); setDs(""); setNome9(""); setGs({ g1: "", g2: "", g3: "", g4: "" });
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 max-w-3xl">
      <h2 className="text-lg font-semibold text-foreground">Nova conta</h2>
      <p className="text-xs text-muted-foreground mb-5">
        {dono ? "Cadastra a subconta de 13 dígitos e, se a conta de 9 dígitos não existir, também a cria com os grupos G1 a G4." : "Só o responsável pelo plano de contas pode cadastrar."}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Conta 13D">
          <input className={inp} value={c13} inputMode="numeric" maxLength={13} placeholder="0000000000000"
            onChange={(e) => setC13(e.target.value.replace(/\D/g, "").slice(0, 13))} />
        </Campo>
        <Campo label="Tipo">
          <select className={inp} value={tp} onChange={(e) => setTp(e.target.value as "A" | "S")}>
            <option value="A">A · Analítica</option>
            <option value="S">S · Sintética</option>
          </select>
        </Campo>
        <Campo label="ds_conta_contabil" className="col-span-2">
          <input className={inp} value={ds} maxLength={300} placeholder="Descrição da subconta" onChange={(e) => setDs(e.target.value)} />
        </Campo>

        {existe13 && <p className="col-span-2 text-sm text-destructive">Essa conta 13D já existe: {existe13}</p>}

        {c13.length >= 9 && (
          <div className="col-span-2 rounded-lg border border-border bg-background p-4 grid grid-cols-2 gap-4">
            <div className="col-span-2 text-sm">
              <span className="text-muted-foreground">Conta 9D </span>
              <span className="font-medium text-foreground">{c13.slice(0, 9)}</span>
              {!plano ? <span className="text-muted-foreground"> · carregando plano…</span>
                : p9 ? <span className="text-muted-foreground"> · já existe ({p9.conta}); os grupos abaixo são os dela</span>
                : <span className="text-primary"> · nova: informe o nome e os grupos</span>}
            </div>
            {!p9 && (
              <Campo label="Nome da conta 9D" className="col-span-2">
                <input className={inp} value={nome9} maxLength={300} disabled={!nova9 && c13.length !== 13} onChange={(e) => setNome9(e.target.value)} />
              </Campo>
            )}
            {G.map((g, i) => (
              <Campo key={g} label={g.toUpperCase()}>
                {p9 ? (
                  <input className={inp} disabled value={p9[g] || "-"} />
                ) : (
                  <select className={inp} value={gs[g]} disabled={i > 0 && !gs[G[i - 1]]} onChange={(e) => setG(i, e.target.value)}>
                    <option value="">Selecione</option>
                    {opc(i).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </Campo>
            ))}
          </div>
        )}
      </div>
      {msg && <p className={`mt-4 text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.t}</p>}
      <div className="mt-6 flex justify-end">
        <button disabled={!pronto || salvando} onClick={salvar}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50">
          {salvando ? "Salvando…" : "Cadastrar"}
        </button>
      </div>
    </section>
  );
};

export default NovaConta;
