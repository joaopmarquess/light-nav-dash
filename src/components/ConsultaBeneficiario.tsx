import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import asset from "@/data/beneficiarios.json.asset.json";

type Beneficiario = {
  codigo: string;
  nome: string;
  vigencia: string | null;
  reativacao: string | null;
  cancelamento: string | null;
  status: 0 | 1;
};

const hojeBR = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function ConsultaBeneficiario() {
  const [termo, setTermo] = useState("");
  const [consultado, setConsultado] = useState<string | null>(null);
  const [dados, setDados] = useState<Beneficiario[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = hojeBR();

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch((asset as { url: string }).url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: Beneficiario[]) => { if (!cancel) setDados(j); })
      .catch((e) => { if (!cancel) setErro(String(e)); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  const resultados = useMemo(() => {
    if (consultado === null || !dados) return [];
    const q = consultado.trim().toUpperCase();
    if (!q) return [];
    const partes = q.split(/\s+/).filter(Boolean);
    return dados.filter((b) => partes.every((p) => b.nome.includes(p))).slice(0, 1000);
  }, [consultado, dados]);

  const onConsultar = () => setConsultado(termo);

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
              onKeyDown={(e) => { if (e.key === "Enter") onConsultar(); }}
              placeholder="Digite parte do nome (ex: ANA SILVA)"
              className="h-10 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onConsultar}
          disabled={loading || !dados}
          className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Carregando..." : "Consultar"}
        </button>
      </div>

      {erro && <div className="text-xs text-rose-600">Erro ao carregar dados: {erro}</div>}

      {consultado !== null && dados && (
        <div className="text-xs text-muted-foreground">
          {resultados.length === 0
            ? "Nenhum beneficiário encontrado."
            : `${resultados.length} beneficiário(s) encontrado(s)${resultados.length === 1000 ? " (exibindo os primeiros 1000)" : ""}.`}
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
              {resultados.map((b) => (
                <tr key={b.codigo} className="border-t border-border hover:bg-accent/40">
                  <td className="px-3 py-2 tabular-nums">{b.codigo}</td>
                  <td className="px-3 py-2">{b.nome}</td>
                  <td className="px-3 py-2 tabular-nums">{b.vigencia ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{b.reativacao ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{b.cancelamento ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{hoje}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex items-center justify-center px-2 h-6 rounded-full text-xs font-semibold ${
                        b.status === 1
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {b.status === 1 ? "ATIVO" : "CANCELADO"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
