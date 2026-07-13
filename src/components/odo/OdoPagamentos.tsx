import { useEffect, useMemo, useState } from "react";
import { odo, buildProtocolo, type OdoPagamento, type OdoLog } from "@/lib/odoClient";
import { Plus, FileText, Globe2, Loader2, Trash2, Pencil, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brDate = (iso: string | null) => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

type FormState = {
  id?: number;
  cd_fornecedor: string;
  fornecedor: string;
  tp_relatorio: string;
  objeto: string;
  vencimento: string;
  vl_bruto: string;
};

const emptyForm: FormState = {
  cd_fornecedor: "",
  fornecedor: "",
  tp_relatorio: "",
  objeto: "",
  vencimento: "",
  vl_bruto: "",
};

const openReport = (tipo: "lista" | "global", protocolo: string, mes?: string) => {
  const url =
    tipo === "lista"
      ? `/odo-relatorio?tipo=lista&protocolo=${encodeURIComponent(protocolo)}`
      : `/odo-relatorio?tipo=global&mes=${encodeURIComponent(mes ?? "")}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

export default function OdoPagamentos() {
  const [rows, setRows] = useState<OdoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<OdoPagamento | null>(null);
  const [detailLogs, setDetailLogs] = useState<OdoLog[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await odo
      .from("odo_fornecedor")
      .select("*")
      .order("vencimento", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Erro ao carregar pagamentos", description: error.message, variant: "destructive" });
    setRows((data as OdoPagamento[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (r: OdoPagamento) => {
    setForm({
      id: r.id,
      cd_fornecedor: r.cd_fornecedor?.toString() ?? "",
      fornecedor: r.fornecedor ?? "",
      tp_relatorio: r.tp_relatorio ?? "",
      objeto: r.objeto ?? "",
      vencimento: r.vencimento ?? "",
      vl_bruto: r.vl_bruto?.toString() ?? "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.fornecedor.trim()) {
      toast({ title: "Informe o fornecedor", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      cd_fornecedor: form.cd_fornecedor ? Number(form.cd_fornecedor) : null,
      fornecedor: form.fornecedor.trim() || null,
      tp_relatorio: form.tp_relatorio.trim() || null,
      objeto: form.objeto.trim() || null,
      vencimento: form.vencimento || null,
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
    toast({ title: form.id ? "Pagamento atualizado" : "Pagamento cadastrado" });
    setShowForm(false);
    load();
  };

  const remove = async (r: OdoPagamento) => {
    if (!confirm(`Excluir pagamento #${r.id} — ${r.fornecedor ?? ""}?`)) return;
    const { error } = await odo.from("odo_fornecedor").delete().eq("id", r.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pagamento excluído" });
    load();
  };

  const openDetail = async (r: OdoPagamento) => {
    setDetail(r);
    const protocolo = buildProtocolo(r.vencimento, r.id);
    const { data } = await odo
      .from("odo_log")
      .select("*")
      .eq("protocolo", protocolo)
      .order("momento", { ascending: false });
    setDetailLogs((data as OdoLog[]) ?? []);
  };

  const emitirAcao = async (tipo: "Por lista" | "Global") => {
    if (!detail) return;
    const protocolo = buildProtocolo(detail.vencimento, detail.id);
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const mes = detail.vencimento ? detail.vencimento.slice(0, 7) : "";
    const payload = {
      protocolo,
      cd_operador: 1,
      operador: "Usuário",
      momento: now,
      acao: tipo,
      descricao:
        tipo === "Por lista"
          ? `Emissão relatório por lista — ${detail.fornecedor} (venc. ${brDate(detail.vencimento)})`
          : `Emissão relatório global do mês ${mes}`,
    };
    const { error } = await odo.from("odo_log").insert(payload);
    if (error) {
      toast({ title: "Erro ao lançar ação", description: error.message, variant: "destructive" });
      return;
    }
    openReport(tipo === "Por lista" ? "lista" : "global", protocolo, mes);
    openDetail(detail);
  };

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.vl_bruto) || 0), 0), [rows]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pagamentos</h2>
          <p className="text-xs text-muted-foreground">
            {rows.length} lançamento(s) · Total {brl(total)}
          </p>
        </div>
        <button
          onClick={startNew}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Novo pagamento
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Nenhum pagamento cadastrado. Clique em "Novo pagamento".
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur text-foreground/70">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Protocolo</th>
                <th className="text-left px-4 py-2 font-medium">Cód.</th>
                <th className="text-left px-4 py-2 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-2 font-medium">Tipo</th>
                <th className="text-left px-4 py-2 font-medium">Objeto</th>
                <th className="text-left px-4 py-2 font-medium">Vencimento</th>
                <th className="text-right px-4 py-2 font-medium">Valor bruto</th>
                <th className="text-right px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border hover:bg-accent/40 cursor-pointer"
                  onClick={() => openDetail(r)}
                >
                  <td className="px-4 py-2 font-mono text-xs">{buildProtocolo(r.vencimento, r.id)}</td>
                  <td className="px-4 py-2">{r.cd_fornecedor ?? "-"}</td>
                  <td className="px-4 py-2">{r.fornecedor ?? "-"}</td>
                  <td className="px-4 py-2">{r.tp_relatorio ?? "-"}</td>
                  <td className="px-4 py-2 max-w-[280px] truncate" title={r.objeto ?? ""}>
                    {r.objeto ?? "-"}
                  </td>
                  <td className="px-4 py-2">{brDate(r.vencimento)}</td>
                  <td className="px-4 py-2 text-right font-medium">{brl(r.vl_bruto)}</td>
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
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
              <h3 className="font-semibold">{form.id ? "Editar pagamento" : "Novo pagamento"}</h3>
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
                <input
                  value={form.tp_relatorio}
                  onChange={(e) => setForm({ ...form, tp_relatorio: e.target.value })}
                  maxLength={50}
                  className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background"
                />
              </label>
              <label className="text-sm">
                <span className="text-foreground/70">Vencimento</span>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
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
                <span className="text-foreground/70">Valor bruto</span>
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

      {detail && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border">
              <div>
                <h3 className="font-semibold">Pagamento — {detail.fornecedor}</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {buildProtocolo(detail.vencimento, detail.id)}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p className="font-medium">{brDate(detail.vencimento)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor bruto</p>
                  <p className="font-medium">{brl(detail.vl_bruto)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{detail.tp_relatorio ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cód.</p>
                  <p className="font-medium">{detail.cd_fornecedor ?? "-"}</p>
                </div>
              </div>
              {detail.objeto && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Objeto</p>
                  <p>{detail.objeto}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => emitirAcao("Por lista")}
                  className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90"
                >
                  <FileText className="h-4 w-4" /> Emitir Por Lista
                </button>
                <button
                  onClick={() => emitirAcao("Global")}
                  className="h-9 px-4 rounded-md border border-border text-sm font-medium flex items-center gap-2 hover:bg-accent"
                >
                  <Globe2 className="h-4 w-4" /> Emitir Global do mês
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Histórico de ações</p>
                {detailLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma ação registrada ainda.</p>
                ) : (
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="text-left px-3 py-1.5">Momento</th>
                          <th className="text-left px-3 py-1.5">Ação</th>
                          <th className="text-left px-3 py-1.5">Operador</th>
                          <th className="text-left px-3 py-1.5">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailLogs.map((l) => (
                          <tr key={l.id} className="border-t border-border">
                            <td className="px-3 py-1.5">{l.momento?.slice(0, 19).replace("T", " ")}</td>
                            <td className="px-3 py-1.5">{l.acao}</td>
                            <td className="px-3 py-1.5">{l.operador}</td>
                            <td className="px-3 py-1.5">{l.descricao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
