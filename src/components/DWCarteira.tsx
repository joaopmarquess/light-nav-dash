import { useEffect, useMemo, useState } from "react";
import { dw } from "@/lib/dwClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Search, IdCard, Hash, LayoutDashboard, Loader2 } from "lucide-react";

type Row = {
  CDREGUSR: number | null;
  STATUS: string | null;
  NOME_PLANO: string | null;
  NOME_BENEFICIARIO: string | null;
  NOME_RESPONSAVEL: string | null;
  CPF: string | null;
  CIDADE_PLANO: string | null;
  UF_PLANO: string | null;
  IDADE: number | null;
  VALOR_TMM: number | null;
};

const COLS =
  '"CDREGUSR","STATUS","NOME_PLANO","NOME_BENEFICIARIO","NOME_RESPONSAVEL","CPF","CIDADE_PLANO","UF_PLANO","IDADE","VALOR_TMM"';
const TABLE = "gd_ecarteira";
const ALL = "__all__";
const PAGE_SIZE = 100;

function ResultsTable({ rows, loading }: { rows: Row[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">Nenhum resultado.</div>
    );
  }
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>CDREGUSR</TableHead>
            <TableHead>Beneficiário</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Idade</TableHead>
            <TableHead className="text-right">Valor TMM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.CDREGUSR}-${i}`}>
              <TableCell>{r.CDREGUSR ?? "-"}</TableCell>
              <TableCell className="font-medium">{r.NOME_BENEFICIARIO ?? "-"}</TableCell>
              <TableCell>{r.CPF ?? "-"}</TableCell>
              <TableCell>{r.NOME_PLANO ?? "-"}</TableCell>
              <TableCell>
                {[r.CIDADE_PLANO, r.UF_PLANO].filter(Boolean).join(" / ") || "-"}
              </TableCell>
              <TableCell>{r.STATUS ?? "-"}</TableCell>
              <TableCell className="text-right">{r.IDADE ?? "-"}</TableCell>
              <TableCell className="text-right">
                {r.VALOR_TMM != null
                  ? r.VALOR_TMM.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DWCarteira() {
  const [tab, setTab] = useState("dashboard");
  const [planos, setPlanos] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingOpts(true);
      const { data, error } = await dw
        .from(TABLE)
        .select('"NOME_PLANO","CIDADE_PLANO","STATUS"')
        .limit(10000);
      if (error) console.error("Erro ao carregar filtros:", error);
      const uniq = (arr: (string | null | undefined)[]) =>
        Array.from(new Set(arr.filter((x): x is string => !!x))).sort();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []) as any[];
      setPlanos(uniq(rows.map((r) => r.NOME_PLANO)));
      setCidades(uniq(rows.map((r) => r.CIDADE_PLANO)));
      setStatuses(uniq(rows.map((r) => r.STATUS)));
      setLoadingOpts(false);
    })();
  }, []);

  return (
    <section className="space-y-6">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="nome" className="gap-2">
            <Search className="h-4 w-4" /> Nome
          </TabsTrigger>
          <TabsTrigger value="cpf" className="gap-2">
            <IdCard className="h-4 w-4" /> CPF
          </TabsTrigger>
          <TabsTrigger value="cdregusr" className="gap-2">
            <Hash className="h-4 w-4" /> CDREGUSR
          </TabsTrigger>
          <TabsTrigger value="filtros" className="gap-2">
            <Users className="h-4 w-4" /> Filtros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <Dashboard planos={planos} cidades={cidades} statuses={statuses} loadingOpts={loadingOpts} />
        </TabsContent>
        <TabsContent value="nome" className="mt-6">
          <BuscaNome />
        </TabsContent>
        <TabsContent value="cpf" className="mt-6">
          <BuscaCPF />
        </TabsContent>
        <TabsContent value="cdregusr" className="mt-6">
          <BuscaCDREGUSR />
        </TabsContent>
        <TabsContent value="filtros" className="mt-6">
          <BuscaFiltros planos={planos} cidades={cidades} statuses={statuses} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Dashboard({
  planos,
  cidades,
  statuses,
  loadingOpts,
}: {
  planos: string[];
  cidades: string[];
  statuses: string[];
  loadingOpts: boolean;
}) {
  const [total, setTotal] = useState<number | null>(null);
  const [ativos, setAtivos] = useState<number | null>(null);
  const [porStatus, setPorStatus] = useState<{ status: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingOpts) return;
    (async () => {
      setLoading(true);
      const totalQ = await dw.from(TABLE).select("CDREGUSR", { count: "exact", head: true });
      const ativosQ = await dw
        .from(TABLE)
        .select("CDREGUSR", { count: "exact", head: true })
        .eq("STATUS", "A");
      setTotal(totalQ.count ?? 0);
      setAtivos(ativosQ.count ?? 0);

      const counts: { status: string; total: number }[] = [];
      for (const s of statuses.slice(0, 10)) {
        const { count } = await dw
          .from(TABLE)
          .select("CDREGUSR", { count: "exact", head: true })
          .eq("STATUS", s);
        counts.push({ status: s, total: count ?? 0 });
      }
      setPorStatus(counts.sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [statuses, loadingOpts]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total de Vidas" value={total} loading={loading} />
        <StatCard label="Vidas Ativas (STATUS=A)" value={ativos} loading={loading} />
        <StatCard label="Planos distintos" value={planos.length} loading={loadingOpts} />
        <StatCard label="Cidades atendidas" value={cidades.length} loading={loadingOpts} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vidas por Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando...
            </div>
          ) : (
            <div className="space-y-2">
              {porStatus.map((r) => {
                const max = porStatus[0]?.total || 1;
                const pct = (r.total / max) * 100;
                return (
                  <div key={r.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{r.status}</span>
                      <span className="text-muted-foreground">
                        {r.total.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-accent overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | null;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-foreground">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            (value ?? 0).toLocaleString("pt-BR")
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function useSearch() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const run = async (build: () => ReturnType<typeof dw.from>) => {
    setLoading(true);
    const q = build();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (q as any).limit(PAGE_SIZE);
    if (error) console.error(error);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  return { rows, loading, run };
}

function BuscaNome() {
  const [nome, setNome] = useState("");
  const { rows, loading, run } = useSearch();
  const submit = () =>
    run(() =>
      dw.from(TABLE).select(COLS).ilike("NOME_BENEFICIARIO", `%${nome}%`).order("NOME_BENEFICIARIO"),
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pesquisa por Nome</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end max-w-xl">
          <div className="flex-1">
            <Label>Nome do beneficiário</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Ex: Maria Silva"
            />
          </div>
          <Button onClick={submit} disabled={!nome.trim()}>
            <Search className="h-4 w-4" /> Buscar
          </Button>
        </div>
        <ResultsTable rows={rows} loading={loading} />
      </CardContent>
    </Card>
  );
}

function BuscaCPF() {
  const [cpf, setCpf] = useState("");
  const { rows, loading, run } = useSearch();
  const submit = () => {
    const digits = cpf.replace(/\D/g, "");
    if (!digits) return;
    run(() => dw.from(TABLE).select(COLS).eq("CPF", digits));
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pesquisa por CPF</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end max-w-xl">
          <div className="flex-1">
            <Label>CPF (somente números)</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="00000000000"
            />
          </div>
          <Button onClick={submit} disabled={!cpf.trim()}>
            <Search className="h-4 w-4" /> Buscar
          </Button>
        </div>
        <ResultsTable rows={rows} loading={loading} />
      </CardContent>
    </Card>
  );
}

function BuscaCDREGUSR() {
  const [cd, setCd] = useState("");
  const { rows, loading, run } = useSearch();
  const submit = () => {
    const n = Number(cd.trim());
    if (!n) return;
    run(() => dw.from(TABLE).select(COLS).eq("CDREGUSR", n));
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pesquisa por CDREGUSR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end max-w-xl">
          <div className="flex-1">
            <Label>CDREGUSR (numérico)</Label>
            <Input
              value={cd}
              onChange={(e) => setCd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Ex: 100331200"
            />
          </div>
          <Button onClick={submit} disabled={!cd.trim()}>
            <Search className="h-4 w-4" /> Buscar
          </Button>
        </div>
        <ResultsTable rows={rows} loading={loading} />
      </CardContent>
    </Card>
  );
}

function BuscaFiltros({
  planos,
  cidades,
  statuses,
}: {
  planos: string[];
  cidades: string[];
  statuses: string[];
}) {
  const [plano, setPlano] = useState<string>(ALL);
  const [cidade, setCidade] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const { rows, loading, run } = useSearch();

  const submit = () =>
    run(() => {
      let q = dw.from(TABLE).select(COLS);
      if (plano !== ALL) q = q.eq("NOME_PLANO", plano);
      if (cidade !== ALL) q = q.eq("CIDADE_PLANO", cidade);
      if (status !== ALL) q = q.eq("STATUS", status);
      return q.order("NOME_BENEFICIARIO");
    });

  const anyFilter = useMemo(
    () => plano !== ALL || cidade !== ALL || status !== ALL,
    [plano, cidade, status],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filtros combinados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Plano</Label>
            <Select value={plano} onValueChange={setPlano}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {planos.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cidade</Label>
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {cidades.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={submit} disabled={!anyFilter} className="w-full">
              <Search className="h-4 w-4" /> Aplicar
            </Button>
          </div>
        </div>
        <ResultsTable rows={rows} loading={loading} />
      </CardContent>
    </Card>
  );
}
