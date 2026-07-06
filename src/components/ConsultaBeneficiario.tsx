import { useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { dw } from "@/lib/dwClient";

type Row = {
  CDREGUSR: number | string | null;
  NOME_BENEFICIARIO: string | null;
  VIGENCIA_BENEFICIARIO: string | null;
  REATIVACAO: string | null;
  CANCELAMENTO: string | null;
  STATUS: string | null;
};

const fmtBR = (iso: string | null) => {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const hojeBR = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function ConsultaBeneficiario() {
  const [termo, setTermo] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = hojeBR();

  const consultar = async () => {
    const q = termo.trim();
    if (!q) return;
    setLoading(true);
    setErro(null);
    // Split into whitespace tokens; each token must appear in NOME_BENEFICIARIO
    const tokens = q.split(/\s+/).filter(Boolean);
    let query = dw
      .from("sv_ecarteira")
      .select(
        '"CDREGUSR","NOME_BENEFICIARIO","VIGENCIA_BENEFICIARIO","REATIVACAO","CANCELAMENTO","STATUS"',
      );
    for (const t of tokens) {
      query = query.ilike("NOME_BENEFICIARIO", `%${t}%`);
    }
    const { data, error } = await query.limit(1000);
    if (error) {
      setErro(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  };

  const resultados = useMemo(() => rows ?? [], [rows]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            NOME BENEFICIÁRIO
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") consultar(); }}
              placeholder="Digite parte do nome (ex: ANA SILVA)"
              className="h-10 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focs:ring-primary/30"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={consultar}
          disabled={loading}
          className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Consultando..." : "Consultar"}
        </button>
      </div>

      {erro && <div className="text-xs text-rose-600">Erro ao consultar: {erro}</div>}

      {rows && !loading && (
        <div className="text-xs text-muted-foreground">
          {resultados.length === 0
            ? "Nenhum beneficiário encontrado."
            : `${resultados.length} beneficiário(s) encontrado(s)${resultados.length === 1000 ? " (limite de 1000)" : ""}.`}
        </div>
      )}

      {resultados.length > 0 && (
        <div className="overflow-auto border border-border rounded-lg max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">CDREGUSR</th>
                <th className="px-3 py-2 text-left">NOME_BENEFICIARIO</th>
                <th className="px-3 py-2 text-left">VIGÊNCIA</th>
                <th className="px-3 py-2 text-left">REATIVAÇÃO</th>
                <th className="px-3 py-2 text-left">CANCELAMENTO</th>
                <th className="px-3 py-2 text-left">ATIVO_EM</th>
                <th className="px-3 py-2 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((b, i) => {
                const ativo = (b.STATUS ?? "").toUpperCase() === "A";
                return (
                  <tr key={`${b.CDREGUSR}-${i}`} className="border-t border-border hover:bg-accent/40">
                    <td className="px-3 py-2 tabular-nums">{b.CDREGUSR ?? "—"}</td>
                    <td className="px-3 py-2">{b.NOME_BENEFICIARIO ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtBR(b.VIGENCIA_BENEFICIARIO) ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtBR(b.REATIVACAO) ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtBR(b.CANCELAMENTO) ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{hoje}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2 h-6 rounded-full text-xs font-semibold ${
                          ativo ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {ativo ? "ATIVO" : "CANCELADO"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
