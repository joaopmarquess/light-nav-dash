import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type SchemaField = {
  name: string;
  type: { name: string | null; kind: string; ofType?: SchemaField["type"] | null };
};

type GqlError = { message: string };

const SCALAR_KINDS = new Set(["SCALAR", "ENUM"]);

const isScalar = (t: SchemaField["type"]): boolean => {
  if (!t) return false;
  if (SCALAR_KINDS.has(t.kind)) return true;
  if (t.kind === "NON_NULL" || t.kind === "LIST") return isScalar(t.ofType ?? { name: null, kind: "" });
  return false;
};

const typeLabel = (t: SchemaField["type"]): string => {
  if (!t) return "";
  if (t.kind === "NON_NULL") return `${typeLabel(t.ofType!)}!`;
  if (t.kind === "LIST") return `[${typeLabel(t.ofType!)}]`;
  return t.name ?? "";
};

const callGraphql = async <T,>(query: string, variables?: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke<{ data?: T; errors?: GqlError[] }>(
    "fabric-graphql",
    { body: { query, variables } },
  );
  if (error) throw new Error(error.message);
  if (data?.errors?.length) throw new Error(data.errors.map((e) => e.message).join(" • "));
  return data?.data as T;
};

const TARGET_TYPE = "gd_eCARTEIRA";

const GdECarteira = () => {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [rootField, setRootField] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState("");
  const [pageSize] = useState(100);

  const loadAll = async () => {
    setPhase("loading");
    setError(null);
    try {
      // 1) Introspectar o tipo gd_eCARTEIRA
      const typeRes = await callGraphql<{
        __type: { name: string; fields: SchemaField[] } | null;
      }>(
        `query($name:String!){
          __type(name:$name){
            name
            fields{ name type{ name kind ofType{ name kind ofType{ name kind ofType{ name kind } } } } }
          }
        }`,
        { name: TARGET_TYPE },
      );

      if (!typeRes?.__type) throw new Error(`Tipo "${TARGET_TYPE}" não encontrado no schema.`);
      const scalarFields = typeRes.__type.fields.filter((f) => isScalar(f.type));
      setFields(scalarFields);

      // 2) Descobrir o campo raiz do Query que retorna esse tipo
      const queryRes = await callGraphql<{
        __type: { fields: SchemaField[] } | null;
      }>(
        `query{
          __type(name:"Query"){
            fields{ name type{ name kind ofType{ name kind ofType{ name kind ofType{ name kind } } } } }
          }
        }`,
      );

      const unwrapName = (t: SchemaField["type"]): string | null => {
        if (!t) return null;
        if (t.name) return t.name;
        if (t.ofType) return unwrapName(t.ofType);
        return null;
      };

      const matching = queryRes?.__type?.fields.filter((f) => {
        const n = unwrapName(f.type);
        return n === TARGET_TYPE;
      }) ?? [];

      if (!matching.length) throw new Error(`Nenhum campo raiz no Query retorna "${TARGET_TYPE}".`);
      // Preferir campo plural/list
      const pick =
        matching.find((f) => {
          let t: SchemaField["type"] | undefined = f.type;
          while (t) {
            if (t.kind === "LIST") return true;
            t = t.ofType ?? undefined;
          }
          return false;
        }) ?? matching[0];

      setRootField(pick.name);

      // 3) Buscar dados
      const selection = scalarFields.map((f) => f.name).join("\n          ");
      const dataRes = await callGraphql<Record<string, unknown>>(
        `query{
          ${pick.name}(first:${pageSize}){
            items{
              ${selection}
            }
          }
        }`,
      );

      const root = dataRes?.[pick.name] as { items?: Record<string, unknown>[] } | Record<string, unknown>[] | undefined;
      const items = Array.isArray(root) ? root : root?.items ?? [];
      setRows(items);
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [rows, filter]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{TARGET_TYPE}</h2>
          <p className="text-xs text-muted-foreground">
            Dados do DW (Microsoft Fabric — GraphQL)
            {rootField && <> • campo raiz: <code className="font-mono">{rootField}</code></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar..."
              className="h-9 w-56 pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="button"
            onClick={loadAll}
            disabled={phase === "loading"}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-primary transition-colors disabled:opacity-50"
            title="Recarregar"
          >
            {phase === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {phase === "error" && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="font-mono whitespace-pre-wrap break-all">{error}</div>
        </div>
      )}

      {phase === "loading" && (
        <div className="bg-card rounded-xl border border-border shadow-sm h-64 flex items-center justify-center text-muted-foreground text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Conectando ao Fabric e descobrindo schema...
        </div>
      )}

      {phase === "ready" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-14rem)]">
            <table className="w-full text-sm">
              <thead className="bg-accent/40 sticky top-0">
                <tr>
                  {fields.map((f) => (
                    <th
                      key={f.name}
                      className="text-left px-3 py-2 text-xs font-medium text-foreground/70 whitespace-nowrap border-b border-border"
                      title={typeLabel(f.type)}
                    >
                      {f.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={fields.length} className="px-3 py-8 text-center text-xs text-muted-foreground">
                      Nenhum registro.
                    </td>
                  </tr>
                )}
                {filteredRows.map((r, i) => (
                  <tr key={i} className="border-t border-border hover:bg-accent/30">
                    {fields.map((f) => {
                      const v = r[f.name];
                      return (
                        <td key={f.name} className="px-3 py-1.5 text-xs text-foreground whitespace-nowrap">
                          {v === null || v === undefined ? (
                            <span className="text-muted-foreground/60">—</span>
                          ) : typeof v === "object" ? (
                            JSON.stringify(v)
                          ) : (
                            String(v)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground bg-accent/20">
            {filteredRows.length} de {rows.length} registro(s) • {fields.length} colunas
          </div>
        </div>
      )}
    </section>
  );
};

export default GdECarteira;
