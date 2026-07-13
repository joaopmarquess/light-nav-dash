import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { odo, type OdoPagamento } from "@/lib/odoClient";
import { Printer } from "lucide-react";

const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brDate = (iso: string | null) => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

export default function OdoRelatorio() {
  const [params] = useSearchParams();
  const tipo = params.get("tipo") ?? "lista";
  const protocolo = params.get("protocolo") ?? "";
  const mes = params.get("mes") ?? "";
  const [pagamentos, setPagamentos] = useState<OdoPagamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let q = odo.from("odo_fornecedor").select("*").order("vencimento");
      if (tipo === "lista" && protocolo) {
        const parts = protocolo.split("-");
        const id = Number(parts[2] ?? 0);
        q = q.eq("id", id);
      } else if (mes) {
        const start = `${mes}-01`;
        const [y, m] = mes.split("-").map(Number);
        const end = new Date(y, m, 0).toISOString().slice(0, 10);
        q = q.gte("vencimento", start).lte("vencimento", end);
      }
      const { data } = await q;
      setPagamentos((data as OdoPagamento[]) ?? []);
      setLoading(false);
    })();
  }, [tipo, protocolo, mes]);

  const total = useMemo(
    () => pagamentos.reduce((s, r) => s + (Number(r.vl_bruto) || 0), 0),
    [pagamentos],
  );

  const hoje = new Date().toLocaleDateString("pt-BR");
  const titulo =
    tipo === "global"
      ? `Relatório Global — Fornecedores ${mes || ""}`
      : `Relatório por Lista — Vencimento`;

  return (
    <div className="min-h-screen bg-white text-black">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
        @page { size: A4; margin: 18mm; }
      `}</style>

      <div className="no-print bg-slate-100 border-b border-slate-300 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-600">Pré-visualização do relatório — {titulo}</span>
        <button
          onClick={() => window.print()}
          className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium flex items-center gap-2"
        >
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto px-10 py-10">
        <header className="border-b-2 border-slate-800 pb-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-slate-500">ODO-NRPS</p>
          <h1 className="text-2xl font-bold">{titulo}</h1>
          <div className="mt-2 flex justify-between text-xs text-slate-600">
            <span>Emitido em {hoje}</span>
            {protocolo && <span className="font-mono">Protocolo: {protocolo}</span>}
          </div>
        </header>

        {loading ? (
          <p className="text-slate-500">Carregando…</p>
        ) : (
          <>
            <section className="mb-6 text-sm leading-relaxed text-slate-700">
              <p>{LOREM}</p>
            </section>

            {tipo === "lista" && pagamentos[0] ? (
              <section className="mb-6 border border-slate-300 rounded-md p-4 text-sm">
                <h2 className="font-semibold mb-3">Dados do lançamento</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Fornecedor</p>
                    <p className="font-medium">{pagamentos[0].fornecedor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Código</p>
                    <p className="font-medium">{pagamentos[0].cd_fornecedor ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Vencimento</p>
                    <p className="font-medium">{brDate(pagamentos[0].vencimento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Valor bruto</p>
                    <p className="font-medium">{brl(pagamentos[0].vl_bruto)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Objeto</p>
                    <p>{pagamentos[0].objeto ?? "-"}</p>
                  </div>
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="font-semibold mb-2 text-sm">
                {tipo === "global" ? "Fornecedores do mês" : "Detalhamento"}
              </h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-2 py-1.5 border border-slate-300">Vencimento</th>
                    <th className="text-left px-2 py-1.5 border border-slate-300">Fornecedor</th>
                    <th className="text-left px-2 py-1.5 border border-slate-300">Objeto</th>
                    <th className="text-right px-2 py-1.5 border border-slate-300">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((r) => (
                    <tr key={r.id}>
                      <td className="px-2 py-1.5 border border-slate-300">{brDate(r.vencimento)}</td>
                      <td className="px-2 py-1.5 border border-slate-300">{r.fornecedor}</td>
                      <td className="px-2 py-1.5 border border-slate-300">{r.objeto}</td>
                      <td className="px-2 py-1.5 border border-slate-300 text-right">
                        {brl(r.vl_bruto)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="px-2 py-1.5 border border-slate-300 text-right font-semibold">
                      Total
                    </td>
                    <td className="px-2 py-1.5 border border-slate-300 text-right font-semibold">
                      {brl(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="mt-8 text-xs leading-relaxed text-slate-700">
              <p>{LOREM}</p>
            </section>

            <footer className="mt-16 grid grid-cols-2 gap-8 text-xs">
              <div className="border-t border-slate-400 pt-2 text-center">Elaborado por</div>
              <div className="border-t border-slate-400 pt-2 text-center">Aprovado por</div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
