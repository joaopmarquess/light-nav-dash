import { useEffect, useState } from "react";
import { Database, Save, Check } from "lucide-react";

const STORAGE_KEY = "dw-carteira-graphql-endpoint";
const DEFAULT_ENDPOINT =
  "https://c828e62d87624b629e4d92510f64d8e7.zc8.graphql.fabric.microsoft.com/v1/workspaces/c828e62d-8762-4b62-9e4d-92510f64d8e7/graphqlapis/2f134";

const DWCarteira = () => {
  const [endpoint, setEndpoint] = useState("");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ENDPOINT;
    setEndpoint(stored);
    setDraft(stored);
  }, []);

  const handleSave = () => {
    const trimmed = draft.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    setEndpoint(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <section className="space-y-6">
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Endpoint GraphQL</h2>
            <p className="text-xs text-muted-foreground">
              Configure o endpoint do Data Warehouse (Microsoft Fabric)
            </p>
          </div>
        </div>

        <label htmlFor="dw-endpoint" className="block text-xs font-medium text-foreground/70 mb-1.5">
          URL do endpoint
        </label>
        <div className="flex gap-2">
          <input
            id="dw-endpoint"
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://...graphql.fabric.microsoft.com/..."
            className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={handleSave}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Salvo" : "Salvar"}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">Endpoint configurado</h3>
        {endpoint ? (
          <code className="block break-all text-xs bg-accent/40 border border-border rounded-md p-3 font-mono text-foreground">
            {endpoint}
          </code>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum endpoint configurado.</p>
        )}
      </div>
    </section>
  );
};

export default DWCarteira;
