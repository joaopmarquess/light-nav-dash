import { useState } from "react";
import { Loader2 } from "lucide-react";
import { dw } from "@/lib/dwClient";

type Row = {
  CDREGUSR: string | number | null;
  NOME_BENEFICIARIO: string | null;
  CPF: number | string | null;
  NOME_RESPONSAVEL: string | null;
  ACOMODACAO: string | null;
  CIDADE_PLANO: string | null;
  VALOR_TMM: number | null;
  STATUS: string | null;
};

const fmtMoney = (v: number | null) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtCPF = (v: number | string | null) => {
  if (v == null) return "—";
  const digits = String(v).replace(/\D/g, "").padStart(11, "0");
  if (digits.length !== 11) return String(v);
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export default function ConsultaBeneficiario() {
  const [f, setF] = useState({
    CDREGUSR: "",
    NOME_RESPONSAVEL: "",
    NOME_BENEFICIARIO: "",
    CPF: "",
    NASCIMENTO: "",
  });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const upd = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const consultar = async () => {
    setLoading(true);
    setErro(null);
    let q = dw
      .from("sv_ecarteira")
      .select(
        '"CDREGUSR","NOME_BENEFICIARIO","CPF","NOME_RESPONSAVEL","ACOMODACAO","CIDADE_PLANO","VALOR_TMM","STATUS"',
      )
      .eq("TIPO_LINHA", "E")
      .eq("Plano_de", "Saúde");

    const addContains = (col: string, val: string) => {
      const v = val.trim();
      if (!v) return;
      for (const tok of v.split(/\s+/).filter(Boolean)) {
        q = q.ilike(col, `%${tok}%`);
      }
    };
    addContains("CDREGUSR", f.CDREGUSR);
    addContains("NOME_RESPONSAVEL", f.NOME_RESPONSAVEL);
    addContains("NOME_BENEFICIARIO", f.NOME_BENEFICIARIO);

    // Also fetch CPF and NASCIMENTO for client-side "contains" filtering
    // (they are non-text columns; ilike is not supported at the DB layer).
    const fullSelect =
      '"CDREGUSR","NOME_BENEFICIARIO","CPF","NOME_RESPONSAVEL","ACOMODACAO","CIDADE_PLANO","VALOR_TMM","STATUS","NASCIMENTO"';
    q = dw
      .from("sv_ecarteira")
      .select(fullSelect)
      .eq("TIPO_LINHA", "E")
      .eq("Plano_de", "Saúde");
    addContains("CDREGUSR", f.CDREGUSR);
    addContains("NOME_RESPONSAVEL", f.NOME_RESPONSAVEL);
    addContains("NOME_BENEFICIARIO", f.NOME_BENEFICIARIO);

    const { data, error } = await q.limit(1000);
    if (error) {
      setErro(error.message);
      setRows([]);
    } else {
      let list = (data ?? []) as (Row & { NASCIMENTO?: string | null })[];
      const cpfDigits = f.CPF.replace(/\D/g, "");
      if (cpfDigits) {
        list = list.filter((r) =>
          String(r.CPF ?? "").replace(/\D/g, "").includes(cpfDigits),
        );
      }
      const nasc = f.NASCIMENTO.trim();
      if (nasc) {
        list = list.filter((r) =>
          String(r.NASCIMENTO ?? "").includes(nasc),
        );
      }
      setRows(list);
    }
    setLoading(false);
  };

  const fields: { key: keyof typeof f; label: string; placeholder?: string }[] = [
    { key: "CDREGUSR", label: "CDREGUSR" },
    { key: "NOME_RESPONSAVEL", label: "NOME_RESPONSAVEL" },
    { key: "NOME_BENEFICIARIO", label: "NOME_BENEFICIARIO" },
    { key: "CPF", label: "CPF" },
    { key: "NASCIMENTO", label: "NASCIMENTO", placeholder: "AAAA-MM-DD" },
  ];

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {fields.map((fd) => (
          <div key={fd.key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {fd.label}
            </label>
            <input
              type="text"
              value={f[fd.key]}
              onChange={upd(fd.key)}
              onKeyDown={(e) => { if (e.key === "Enter") consultar(); }}
              placeholder={fd.placeholder ?? "contém..."}
              className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
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
          {rows.length === 0
            ? "Nenhum beneficiário encontrado."
            : `${rows.length} beneficiário(s) encontrado(s)${rows.length === 1000 ? " (limite de 1000)" : ""}.`}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-auto border border-border rounded-lg max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">CDREGUSR</th>
                <th className="px-3 py-2 text-left">NOME_BENEFICIARIO</th>
                <th className="px-3 py-2 text-left">CPF</th>
                <th className="px-3 py-2 text-left">NOME_RESPONSAVEL</th>
                <th className="px-3 py-2 text-left">ACOMODACAO</th>
                <th className="px-3 py-2 text-left">CIDADE_PLANO</th>
                <th className="px-3 py-2 text-right">VALOR_TMM</th>
                <th className="px-3 py-2 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b, i) => {
                const ativo = (b.STATUS ?? "").toUpperCase() === "A";
                return (
                  <tr key={`${b.CDREGUSR}-${i}`} className="border-t border-border hover:bg-accent/40">
                    <td className="px-3 py-2 tabular-nums">{b.CDREGUSR ?? "—"}</td>
                    <td className="px-3 py-2">{b.NOME_BENEFICIARIO ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtCPF(b.CPF)}</td>
                    <td className="px-3 py-2">{b.NOME_RESPONSAVEL ?? "—"}</td>
                    <td className="px-3 py-2">{b.ACOMODACAO ?? "—"}</td>
                    <td className="px-3 py-2">{b.CIDADE_PLANO ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-right">{fmtMoney(b.VALOR_TMM)}</td>
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
