import { useState } from "react";
import { Loader2, Search } from "lucide-react";
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
  NASCIMENTO?: string | null;
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

const SELECT_COLS =
  '"CDREGUSR","NOME_BENEFICIARIO","CPF","NOME_RESPONSAVEL","ACOMODACAO","CIDADE_PLANO","VALOR_TMM","STATUS","NASCIMENTO"';

export default function ConsultaBeneficiario() {
  const [termo, setTermo] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const consultar = async () => {
    const raw = termo.trim();
    if (!raw) return;
    setLoading(true);
    setErro(null);

    const digits = raw.replace(/\D/g, "");
    const looksLikeDate = /^\d{4}-\d{2}-\d{2}$/.test(raw);

    // Busca em paralelo em cada coluna e une os resultados (OR entre colunas,
    // AND entre tokens dentro das colunas de texto).
    const base = () =>
      dw
        .from("sv_ecarteira")
        .select(SELECT_COLS)
        .eq("TIPO_LINHA", "E")
        .eq("Plano_de", "Saúde");

    const textCols = ["CDREGUSR", "NOME_RESPONSAVEL", "NOME_BENEFICIARIO"];
    const tokens = raw.split(/\s+/).filter(Boolean);

    const queries: Promise<{ data: Row[] | null; error: any }>[] = [];

    for (const col of textCols) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = base();
      for (const tok of tokens) q = q.ilike(col, `%${tok}%`);
      queries.push(q.limit(1000));
    }

    // CPF: bigint — comparação exata quando os dígitos formam um número
    if (digits && digits.length >= 3) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = base();
      // usa cast em texto via filter para permitir "contém"
      queries.push(q.filter("CPF::text", "ilike", `%${digits}%`).limit(1000));
    }

    // NASCIMENTO: date — só se o usuário digitou uma data completa
    if (looksLikeDate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = base();
      queries.push(q.eq("NASCIMENTO", raw).limit(1000));
    }

    const results = await Promise.all(queries);
    const firstErr = results.find((r) => r.error);
    if (firstErr?.error) {
      setErro(firstErr.error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const seen = new Set<string>();
    const merged: Row[] = [];
    for (const r of results) {
      for (const row of (r.data ?? []) as Row[]) {
        const key = `${row.CDREGUSR ?? ""}|${row.CPF ?? ""}|${row.NOME_BENEFICIARIO ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(row);
      }
    }

    setRows(merged);
    setLoading(false);
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Buscar (CDREGUSR, NOME_RESPONSAVEL, NOME_BENEFICIARIO, CPF ou NASCIMENTO)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") consultar(); }}
              placeholder="Digite parte de qualquer um dos campos..."
              className="h-10 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
          {rows.length === 0
            ? "Nenhum beneficiário encontrado."
            : `${rows.length} beneficiário(s) encontrado(s).`}
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
