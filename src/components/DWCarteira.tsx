import { useEffect, useMemo, useState } from "react";
import { Database, Save, Check, Search, Loader2 } from "lucide-react";

const ENDPOINT_KEY = "dw-carteira-graphql-endpoint";
const TOKEN_KEY = "dw-carteira-graphql-token";
const QUERY_KEY = "dw-carteira-graphql-query";

const DEFAULT_ENDPOINT =
  "https://c828e62d87624b629e4d92510f64d8e7.zc8.graphql.fabric.microsoft.com/v1/workspaces/c828e62d-8762-4b62-9e4d-92510f64d8e7/graphqlapis/2f134";

const DEFAULT_QUERY = `query ($nome: String!) {
  beneficiarios(filter: { NOME_BENEFICIARIO: { contains: $nome } }, first: 50) {
    items {
      NOME_BENEFICIARIO
    }
  }
}`;

type Row = Record<string, unknown>;

const extractRows = (data: unknown): Row[] => {
  if (!data || typeof data !== "object") return [];
  const visit = (node: unknown): Row[] | null => {
    if (Array.isArray(node)) {
      const objs = node.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Row[];
      if (objs.length) return objs;
    }
    if (node && typeof node === "object") {
      for (const v of Object.values(node as Record<string, unknown>)) {
        const found = visit(v);
        if (found) return found;
      }
    }
    return null;
  };
  return visit(data) ?? [];
};

const DWCarteira = () => {
  const [endpoint, setEndpoint] = useState("");
  const [endpointDraft, setEndpointDraft] = useState("");
  const [token, setToken] = useState("");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [savedFlash, setSavedFlash] = useState(false);

  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const e = localStorage.getItem(ENDPOINT_KEY) ?? DEFAULT_ENDPOINT;
    setEndpoint(e);
    setEndpointDraft(e);
    setToken(localStorage.getItem(TOKEN_KEY) ?? "");
    setQuery(localStorage.getItem(QUERY_KEY) ?? DEFAULT_QUERY);
  }, []);

  const saveConfig = () => {
    const e = endpointDraft.trim();
    localStorage.setItem(ENDPOINT_KEY, e);
    localStorage.setItem(TOKEN_KEY, token.trim());
    localStorage.setItem(QUERY_KEY, query);
    setEndpoint(e);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const runSearch = async () => {
    if (!endpoint) {
      setError("Configure o endpoint primeiro.");
      return;
    }
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token.trim()) headers["Authorization"] = `Bearer ${token.trim()}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables: { nome } }),
      });
      const json = await res.json();
      if (json.errors?.length) {
        setError(json.errors.map((e: { message: string }) => e.message).join(" • "));
      }
      setRows(extractRows(json.data));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [rows]);

  return (
    <section className="space-y-6">
      {/* Configuração */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Endpoint GraphQL (Fabric)</h2>
            <p className="text-xs text-muted-foreground">
              Endpoint, token (opcional) e query usados na busca de beneficiários
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">URL do endpoint</label>
            <input
              type="url"
              value={endpointDraft}
              onChange={(e) => setEndpointDraft(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Bearer token (opcional, mas o Fabric normalmente exige)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJ..."
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">
              Query GraphQL (use a variável <code className="font-mono">$nome</code>)
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Ajuste o nome do tipo/campos conforme o schema do seu DW (ex.: <code>beneficiarios</code>,
              <code> NOME_BENEFICIARIO</code>).
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveConfig}
              className="h-9 px-4 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {savedFlash ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {savedFlash ? "Salvo" : "Salvar configuração"}
            </button>
          </div>
        </div>

        {endpoint && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Endpoint ativo</p>
            <code className="block break-all text-xs bg-accent/40 border border-border rounded-md p-2 font-mono">
              {endpoint}
            </code>
          </div>
        )}
      </div>

      {/* Busca */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Buscar beneficiário</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Digite parte do NOME_BENEFICIARIO..."
              className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="button"
            onClick={runSearch}
            disabled={loading}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>

        {error && (
          <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2 font-mono whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div className="mt-4 overflow-auto border border-border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-accent/40">
              <tr>
                {columns.length === 0 ? (
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                    Resultados aparecerão aqui
                  </th>
                ) : (
                  columns.map((c) => (
                    <th key={c} className="text-left px-3 py-2 text-xs font-medium text-foreground/70 whitespace-nowrap">
                      {c}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={Math.max(1, columns.length)}>
                    Nenhum resultado.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-accent/30">
                  {columns.map((c) => (
                    <td key={c} className="px-3 py-2 text-xs text-foreground whitespace-nowrap">
                      {typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground mt-2">
          {rows.length > 0 && `${rows.length} registro(s).`}
        </p>
      </div>
    </section>
  );
};

export default DWCarteira;
