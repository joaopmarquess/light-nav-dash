import { useState } from "react";
import { Loader2 } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";
import { agruparFaixas, planoOrFilter, type BenefTabela } from "@/lib/carteiraTabelas";

const hoje = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString("pt-BR");

export default function CarteiraTabelas() {
  const [data, setData] = useState(hoje());
  const [plano, setPlano] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [res, setRes] = useState<{ estipulantes: string[]; linhas: ReturnType<typeof agruparFaixas>; plano: string; data: string } | null>(null);

  const consultar = async () => {
    if (!/^\d{4}$/.test(plano)) { setErro("Informe o Plano com 4 dígitos."); return; }
    setLoading(true); setErro(null);
    try {
      const rows: (BenefTabela & { nm_empresa_estipulante: string | null })[] = [];
      for (let from = 0; ; from += 1000) {
        const { data: chunk, error } = await hostinger.from("view_ecarteira")
          .select("nr_cpf,tp_acomodacao,dt_nascimento,dt_vigencia_beneficiario,dt_desligamento,dt_reativacao,nm_empresa_estipulante,cd_matricula")
          .or(planoOrFilter(plano).slice(1, -1))
          .order("cd_matricula").range(from, from + 999);
        if (error) throw error;
        rows.push(...((chunk ?? []) as never[]));
        if (!chunk || chunk.length < 1000) break;
      }
      const estipulantes = [...new Set(rows.map((r) => r.nm_empresa_estipulante?.trim()).filter(Boolean) as string[])].sort();
      setRes({ estipulantes, linhas: agruparFaixas(rows, data), plano, data });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  const tot = res?.linhas.reduce((a, l) => ({ e: a.e + l.enfermaria, p: a.p + l.apartamento }), { e: 0, p: 0 });

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5 max-w-3xl">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs text-muted-foreground">Ativos em
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="block h-10 px-3 mt-1 rounded-md border border-border bg-background text-sm text-foreground" />
        </label>
        <label className="text-xs text-muted-foreground">Plano
          <input value={plano} maxLength={4} inputMode="numeric" placeholder="ex.: 2139"
            onChange={(e) => setPlano(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && consultar()}
            className="block h-10 w-28 px-3 mt-1 rounded-md border border-border bg-background text-sm text-foreground" />
        </label>
        <button onClick={consultar} disabled={loading} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}Consultar
        </button>
      </div>
      {erro && <div className="text-xs text-destructive">{erro}</div>}
      {res && (
        <>
          <div className="text-sm">
            <span className="text-muted-foreground">Estipulante do plano {res.plano}: </span>
            <span className="font-medium text-foreground">{res.estipulantes.length ? res.estipulantes.join(" · ") : "—"}</span>
          </div>
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Faixa etária</th><th className="px-3 py-2 text-right">Enfermaria</th><th className="px-3 py-2 text-right">Apartamento</th></tr>
            </thead>
            <tbody>
              {res.linhas.map((l) => (
                <tr key={l.faixa} className="border-t border-border">
                  <td className="px-3 py-1.5">{l.faixa}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmt(l.enfermaria)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmt(l.apartamento)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold bg-muted/20">
                <td className="px-3 py-1.5">Total</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmt(tot!.e)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmt(tot!.p)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">CPFs distintos ativos em {res.data.split("-").reverse().join("/")}; idade calculada nessa data. Enfermaria = PRATA, Apartamento = OURO.</p>
        </>
      )}
    </section>
  );
}
