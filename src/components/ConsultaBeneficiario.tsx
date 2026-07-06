import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Search } from "lucide-react";
import { dw } from "@/lib/dwClient";

type Row = {
  CDREGUSR: string | number | null;
  NOME_BENEFICIARIO: string | null;
  CPF: number | string | null;
  NOME_RESPONSAVEL: string | null;
  ACOMODACAO: string | null;
  CIDADE_OFICIAL: string | null;
  VALOR_TMM: number | null;
  STATUS: string | null;
  NASCIMENTO: string | null;
  IDADE: number | null;
  VIGENCIA_BENEFICIARIO: string | null;
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

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const d = String(v).slice(0, 10);
  const [y, m, dd] = d.split("-");
  return y && m && dd ? `${dd}/${m}/${y}` : String(v);
};

const SELECT_COLS =
  '"CDREGUSR","NOME_BENEFICIARIO","CPF","NOME_RESPONSAVEL","ACOMODACAO","CIDADE_OFICIAL","VALOR_TMM","STATUS","NASCIMENTO","IDADE","VIGENCIA_BENEFICIARIO"';

export default function ConsultaBeneficiario() {
  const [termo, setTermo] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sortKey, setSortKey] = useState<keyof Row | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [incluirCancelados, setIncluirCancelados] = useState(false);

  const toggleSort = (k: keyof Row) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!rows) return rows;
    if (!sortKey) return rows;
    const arr = [...rows];
    const mult = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
      return String(av).localeCompare(String(bv), "pt-BR", { numeric: true }) * mult;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const consultar = async () => {
    const raw = termo.trim();
    if (!raw) return;
    if (raw.length < 3) {
      setErro("Digite pelo menos 3 caracteres.");
      setRows([]);
      return;
    }
    setLoading(true);
    setErro(null);

    const digits = raw.replace(/\D/g, "");
    const isCpfSearch = digits.length > 0 && digits.length === raw.replace(/\s/g, "").length;
    const safeName = raw.replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();

    if (isCpfSearch && digits.length !== 11) {
      setErro("Para CPF, digite os 11 números.");
      setRows([]);
      setLoading(false);
      return;
    }

    const baseQuery = dw
      .from("sv_ecarteira")
      .select(SELECT_COLS)
      .eq("TIPO_LINHA", "E")
      .eq("Plano_de", "Saúde");

    const filteredBase = incluirCancelados ? baseQuery : baseQuery.eq("STATUS", "A");

    const tokens = safeName.split(" ").filter((t) => t.length >= 2);
    let query = isCpfSearch
      ? baseQuery.eq("CPF", digits)
      : baseQuery;
    if (!isCpfSearch) {
      for (const t of tokens) {
        query = query.ilike("NOME_BENEFICIARIO", `%${t}%`);
      }
    }

    const { data, error } = await query.limit(100);

    if (error) {
      setErro(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
    setTermo("");
    inputRef.current?.focus();
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Buscar por NOME_BENEFICIARIO ou CPF
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              autoFocus
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
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground sticky top-0">
              <tr>
                {([
                  { k: "CDREGUSR", label: "CDREGUSR", align: "text-left" },
                  { k: "NOME_BENEFICIARIO", label: "NOME_BENEFICIARIO", align: "text-left" },
                  { k: "CPF", label: "CPF", align: "text-left" },
                  { k: "NASCIMENTO", label: "NASCIMENTO", align: "text-left" },
                  { k: "IDADE", label: "IDADE", align: "text-right" },
                  { k: "NOME_RESPONSAVEL", label: "NOME_RESPONSAVEL", align: "text-left" },
                  { k: "ACOMODACAO", label: "ACOMODACAO", align: "text-left" },
                  { k: "CIDADE_OFICIAL", label: "CIDADE_OFICIAL", align: "text-left" },
                  { k: "VIGENCIA_BENEFICIARIO", label: "VIGÊNCIA", align: "text-left" },
                  { k: "VALOR_TMM", label: "VALOR_TMM", align: "text-right" },
                  { k: "STATUS", label: "STATUS", align: "text-center" },
                ] as { k: keyof Row; label: string; align: string }[]).map((c) => {
                  const active = sortKey === c.k;
                  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={c.k as string}
                      onClick={() => toggleSort(c.k)}
                      className={`px-2 py-1.5 ${c.align} cursor-pointer select-none hover:text-foreground`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        <Icon className={`h-3 w-3 ${active ? "text-foreground" : "opacity-50"}`} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(sortedRows ?? []).map((b, i) => {
                const ativo = (b.STATUS ?? "").toUpperCase() === "A";
                return (
                  <tr key={`${b.CDREGUSR}-${i}`} className="border-t border-border hover:bg-accent/40">
                    <td className="px-2 py-1.5 tabular-nums">{b.CDREGUSR ?? "—"}</td>
                    <td className="px-2 py-1.5">{b.NOME_BENEFICIARIO ?? "—"}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmtCPF(b.CPF)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmtDate(b.NASCIMENTO)}</td>
                    <td className="px-2 py-1.5 tabular-nums text-right">{b.IDADE ?? "—"}</td>
                    <td className="px-2 py-1.5">{b.NOME_RESPONSAVEL ?? "—"}</td>
                    <td className="px-2 py-1.5">{b.ACOMODACAO ?? "—"}</td>
                    <td className="px-2 py-1.5">{b.CIDADE_OFICIAL ?? "—"}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmtDate(b.VIGENCIA_BENEFICIARIO)}</td>
                    <td className="px-2 py-1.5 tabular-nums text-right">{fmtMoney(b.VALOR_TMM)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2 h-5 rounded-full text-[10px] font-semibold ${
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
