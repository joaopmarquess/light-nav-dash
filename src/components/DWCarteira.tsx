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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyBase = (q: any, planoDe: string) => {
  let out = q.eq("TIPO_LINHA", "E").eq("STATUS", "A");
  if (planoDe !== ALL) out = out.eq("Plano_de", planoDe);
  return out;
};

export default function DWCarteira() {
  const [tab, setTab] = useState("dashboard");
  const [planos, setPlanos] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [planoDeOpts, setPlanoDeOpts] = useState<string[]>([]);
  const [planoDe, setPlanoDe] = useState<string>("Saúde");
  const [loadingOpts, setLoadingOpts] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingOpts(true);
      const { data, error } = await dw
        .from(TABLE)
        .select('"NOME_PLANO","CIDADE_PLANO","Plano_de"')
        .eq("TIPO_LINHA", "E")
        .eq("STATUS", "A")
        .limit(10000);
      if (error) console.error("Erro ao carregar filtros:", error);
      const uniq = (arr: (string | null | undefined)[]) =>
        Array.from(new Set(arr.filter((x): x is string => !!x))).sort();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []) as any[];
      setPlanos(uniq(rows.map((r) => r.NOME_PLANO)));
      setCidades(uniq(rows.map((r) => r.CIDADE_PLANO)));
      setPlanoDeOpts(uniq(rows.map((r) => r.Plano_de)));
      setLoadingOpts(false);
    })();
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-64">
          <Label>Plano de</Label>
          <Select value={planoDe} onValueChange={setPlanoDe}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {planoDeOpts.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground pb-2">
          Filtros aplicados a todas as consultas abaixo.
        </p>
      </div>

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
          <Dashboard loadingOpts={loadingOpts} planoDe={planoDe} />
        </TabsContent>
        <TabsContent value="nome" className="mt-6">
          <BuscaNome planoDe={planoDe} />
        </TabsContent>
        <TabsContent value="cpf" className="mt-6">
          <BuscaCPF planoDe={planoDe} />
        </TabsContent>
        <TabsContent value="cdregusr" className="mt-6">
          <BuscaCDREGUSR planoDe={planoDe} />
        </TabsContent>
        <TabsContent value="filtros" className="mt-6">
          <BuscaFiltros
            planos={planos}
            cidades={cidades}
            planoDe={planoDe}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Dashboard({
  loadingOpts,
  planoDe,
}: {
  loadingOpts: boolean;
  planoDe: string;
}) {
  const [vidas, setVidas] = useState<number | null>(null);
  const [planosDistintos, setPlanosDistintos] = useState<number | null>(null);
  const [cidadesDistintas, setCidadesDistintas] = useState<number | null>(null);
  const [porStatus, setPorStatus] = useState<{ status: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingOpts) return;
    (async () => {
      setLoading(true);

      // VIDAS = contagem de linhas (com filtros)
      const { count: vidasCount, error: countErr } = await applyBase(
        dw.from(TABLE).select("CDREGUSR", { count: "exact", head: true }),
        planoDe,
      );
      if (countErr) console.error(countErr);
      setVidas(vidasCount ?? 0);

      // PLANOS e CIDADES distintos + Vidas por Status (paginado)
      const planoSet = new Set<string>();
      const cidadeSet = new Set<string>();
      const perStatus = new Map<string, number>();
      const pageSize = 1000;
      let from = 0;
      const maxRows = 300000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const q = applyBase(
          dw
            .from(TABLE)
            .select('"NOME_PLANO","CIDADE_OFICIAL","STATUS"'),
          planoDe,
        );
        const { data, error } = await q.range(from, from + pageSize - 1);
        if (error) {
          console.error(error);
          break;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (data ?? []) as any[];
        for (const r of rows) {
          if (r.NOME_PLANO) planoSet.add(String(r.NOME_PLANO));
          if (r.CIDADE_OFICIAL) cidadeSet.add(String(r.CIDADE_OFICIAL));
          if (r.STATUS) {
            const s = String(r.STATUS);
            perStatus.set(s, (perStatus.get(s) ?? 0) + 1);
          }
        }
        if (rows.length < pageSize) break;
        from += pageSize;
        if (from >= maxRows) break;
      }

      setPlanosDistintos(planoSet.size);
      setCidadesDistintas(cidadeSet.size);
      const counts = Array.from(perStatus.entries())
        .map(([status, total]) => ({ status, total }))
        .sort((a, b) => b.total - a.total);
      setPorStatus(counts);
      setLoading(false);
    })();
  }, [loadingOpts, planoDe]);


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="VIDAS" value={vidas} loading={loading} />
        <StatCard label="PLANOS" value={planosDistintos} loading={loading} />
        <StatCard label="CIDADES" value={cidadesDistintas} loading={loading} />
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = async (build: () => any) => {
    setLoading(true);
    const q = build();
    const { data, error } = await q.limit(PAGE_SIZE);
    if (error) console.error(error);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  return { rows, loading, run };
}

function BuscaNome({ planoDe }: { planoDe: string }) {
  const [nome, setNome] = useState("");
  const { rows, loading, run } = useSearch();
  const submit = () =>
    run(() =>
      applyBase(
        dw.from(TABLE).select(COLS).ilike("NOME_BENEFICIARIO", `%${nome}%`),
        planoDe,
      ).order("NOME_BENEFICIARIO"),
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

function BuscaCPF({ planoDe }: { planoDe: string }) {
  const [cpf, setCpf] = useState("");
  const { rows, loading, run } = useSearch();
  const submit = () => {
    const digits = cpf.replace(/\D/g, "");
    if (!digits) return;
    run(() => applyBase(dw.from(TABLE).select(COLS).eq("CPF", digits), planoDe));
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

function BuscaCDREGUSR({ planoDe }: { planoDe: string }) {
  const [cd, setCd] = useState("");
  const { rows, loading, run } = useSearch();
  const submit = () => {
    const n = Number(cd.trim());
    if (!n) return;
    run(() => applyBase(dw.from(TABLE).select(COLS).eq("CDREGUSR", n), planoDe));
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
  planoDe,
}: {
  planos: string[];
  cidades: string[];
  planoDe: string;
}) {
  const [plano, setPlano] = useState<string>(ALL);
  const [cidade, setCidade] = useState<string>(ALL);
  const { rows, loading, run } = useSearch();

  const submit = () =>
    run(() => {
      let q = dw.from(TABLE).select(COLS);
      if (plano !== ALL) q = q.eq("NOME_PLANO", plano);
      if (cidade !== ALL) q = q.eq("CIDADE_PLANO", cidade);
      return applyBase(q, planoDe).order("NOME_BENEFICIARIO");
    });

  const anyFilter = useMemo(
    () => plano !== ALL || cidade !== ALL,
    [plano, cidade],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filtros combinados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
