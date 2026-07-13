import { useEffect, useMemo, useState } from "react";
import { odo, diaDoVencimento, diaParaDate, type OdoFornecedor } from "@/lib/odoClient";
import { Plus, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type FormState = {
  id?: number;
  cd_fornecedor: string;
  fornecedor: string;
  tp_relatorio: string;
  objeto: string;
  dia_vencimento: string;
  vl_bruto: string;
};

const emptyForm: FormState = {
  cd_fornecedor: "",
  fornecedor: "",
  tp_relatorio: "",
  objeto: "",
  dia_vencimento: "",
  vl_bruto: "",
};

export default function OdoFornecedores() {
  const [rows, setRows] = useState<OdoFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await odo
      .from("odo_fornecedor")
      .select("*")
      .order("fornecedor", { ascending: true })
      .limit(1000);
    if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setRows((data as OdoFornecedor[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (r: OdoFornecedor) => {
    setForm({
      id: r.id,
      cd_fornecedor: r.cd_fornecedor?.toString() ?? "",
      fornecedor: r.fornecedor ?? "",
      tp_relatorio: r.tp_relatorio ?? "",
      objeto: r.objeto ?? "",
      dia_vencimento: diaDoVencimento(r.vencimento)?.toString() ?? "",
      vl_bruto: r.vl_bruto?.toString() ?? "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.fornecedor.trim()) {
      toast({ title: "Informe o fornecedor", variant: "destructive" });
      return;
    }
    const dia = form.dia_vencimento ? Number(form.dia_vencimento) : NaN;
    if (form.dia_vencimento && (!Number.isFinite(dia) || dia < 1 || dia > 31)) {
      toast({ title: "Dia do vencimento inválido (1–31)", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      cd_fornecedor: form.cd_fornecedor ? Number(form.cd_fornecedor) : null,
      fornecedor: form.fornecedor.trim() || null,
      tp_relatorio: form.tp_relatorio.trim() || null,
      objeto: form.objeto.trim() || null,
      vencimento: form.dia_vencimento ? diaParaDate(dia) : null,
      vl_bruto: form.vl_bruto ? Number(form.vl_bruto.replace(",", ".")) : null,
    };
    const q = form.id
      ? odo.from("odo_fornecedor").update(payload).eq("id", form.id)
      : odo.from("odo_fornecedor").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: form.id ? "Fornecedor atualizado" : "Fornecedor cadastrado" });
    setShowForm(false);
    load();
  };

  const remove = async (r: OdoFornecedor) => {
    if (!confirm(`Excluir fornecedor #${r.id} — ${r.fornecedor ?? ""}?`)) return;
    const { error } = await odo.from("odo_fornecedor").delete().eq("id", r.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Fornecedor excluído" });
    load();
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        busca
          ? [r.fornecedor, r.tp_relatorio, r.objeto, r.cd_fornecedor?.toString()]
              .filter(Boolean)
              .some((v) => v!.toString().toLowerCase().includes(busca.toLowerCase()))
          : true,
      ),
    [rows, busca],
  );

  const totalMensal = useMemo(
    () => filtered.reduce((s, r) => s + (Number(r.vl_bruto) || 0), 0),
    [filtered],
  );

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Fornecedores</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} cadastro(s) · Previsão mensal {brl(totalMensal)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar fornecedor…"
            className="h-9 w-64 px-3 rounded-md border border-border bg-background text-sm"
          />
          <button
            onClick={startNew}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo fornecedor
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Nenhum fornecedor cadastrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur text-foreground/70">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Cód.</th>
                <th className="text-left px-4 py-2 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-2 font-medium">Tipo</th>
                <th className="text-left px-4 py-2 font-medium">Objeto</th>
                <th className="text-center px-4 py-2 font-medium">Dia venc.</th>
                <th className="text-right px-4 py-2 font-medium">Valor bruto</th>
                <th className="text-right px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-accent/40">
                  <td className="px-4 py-2">{r.cd_fornecedor ?? "-"}</td>
                  <td className="px-4 py-2 font-medium">{r.fornecedor ?? "-"}</td>
                  <td className="px-4 py-2">{r.tp_relatorio ?? "-"}</td>
                  <td className="px-4 py-2 max-w-[280px] truncate" title={r.objeto ?? ""}>
                    {r.objeto ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-center font-mono">
                    {diaDoVencimento(r.vencimento)?.toString().padStart(2, "0") ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{brl(r.vl_bruto)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => startEdit(r)}
                      className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-accent"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(r)}
                      className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border">
              <h3 className="font-semibold">{form.id ? "Editar fornecedor" : "Novo fornecedor"}</h3>
              <button
                onClick={() => setShowForm(false)}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="text-foreground/70">Código fornecedor</span>
                <input
                  type="number"
                  value={form.cd_fornecedor}
                  onChange={(e) => setForm({ ...form, cd_fornecedor: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background"
                />
              </label>
              <label className="text-sm">
                <span className="text-foreground/70">Fornecedor *</span>
                <input
                  value={form.fornecedor}
                  onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                  maxLength={200}
                  className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background"
                />
              </label>
              <label className="text-sm">
                <span className="text-foreground/70">Tipo de relatório</span>
                <select
                  value={form.tp_relatorio}
                  onChange={(e) => setForm({ ...form, tp_relatorio: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background"
                >
                  <option value="">Selecione…</option>
                  <option value="Por lista">Por lista</option>
                  <option value="Global">Global</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="text-foreground/70">Dia do vencimento (1–31)</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dia_vencimento}
                  onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background"
                />
              </label>
              <label className="text-sm col-span-2">
                <span className="text-foreground/70">Objeto</span>
                <textarea
                  value={form.objeto}
                  onChange={(e) => setForm({ ...form, objeto: e.target.value })}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background"
                />
              </label>
              <label className="text-sm">
                <span className="text-foreground/70">Valor bruto mensal</span>
                <input
                  value={form.vl_bruto}
                  onChange={(e) => setForm({ ...form, vl_bruto: e.target.value })}
                  placeholder="0.00"
                  className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background"
                />
              </label>
            </div>
            <div className="px-6 py-3 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="h-9 px-4 rounded-md border border-border text-sm hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
