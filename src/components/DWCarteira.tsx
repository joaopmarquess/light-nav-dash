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
const applyBase = (q: any) =>
  q.eq("TIPO_LINHA", "E").eq("STATUS", "A").eq("Plano_de", "Saúde");

export default function DWCarteira() {
  const [tab, setTab] = useState("dashboard");
  const [planos, setPlanos] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingOpts(true);
      const { data, error } = await dw
        .from(TABLE)
        .select('"NOME_PLANO","CIDADE_PLANO"')
        .eq("TIPO_LINHA", "E")
        .eq("STATUS", "A")
        .eq("Plano_de", "Saúde")
        .limit(10000);
      if (error) console.error("Erro ao carregar filtros:", error);
      const uniq = (arr: (string | null | undefined)[]) =>
        Array.from(new Set(arr.filter((x): x is string => !!x))).sort();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []) as any[];
      setPlanos(uniq(rows.map((r) => r.NOME_PLANO)));
      setCidades(uniq(rows.map((r) => r.CIDADE_PLANO)));
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
          <Dashboard loadingOpts={loadingOpts} />
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
          <BuscaFiltros planos={planos} cidades={cidades} />
        </TabsContent>
      </Tabs>
    </section>
  );
}


function Dashboard({
  loadingOpts,
}: {
  loadingOpts: boolean;
}) {
  const [vidas, setVidas] = useState<number | null>(null);
  const [pifDistintos, setPifDistintos] = useState<number | null>(null);
  const [empresasDistintas, setEmpresasDistintas] = useState<number | null>(null);
  const [cidadesDistintas, setCidadesDistintas] = useState<number | null>(null);
  const [porFaixa, setPorFaixa] = useState<
    { faixa: string; total: number; F: number; M: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingOpts) return;
    (async () => {
      setLoading(true);

      const FAIXAS = [
        { label: "00 a 18", min: 0, max: 18 },
        { label: "19 a 23", min: 19, max: 23 },
        { label: "24 a 28", min: 24, max: 28 },
        { label: "29 a 33", min: 29, max: 33 },
        { label: "34 a 38", min: 34, max: 38 },
        { label: "39 a 43", min: 39, max: 43 },
        { label: "44 a 48", min: 44, max: 48 },
        { label: "49 a 53", min: 49, max: 53 },
        { label: "54 a 58", min: 54, max: 58 },
        { label: "59 ou +", min: 59, max: Infinity },
      ];
      const faixaFor = (idade: number) =>
        FAIXAS.find((f) => idade >= f.min && idade <= f.max)?.label ?? null;

      let totalRows = 0;
      const pifSet = new Set<number>();
      const empresasSet = new Set<number>();
      const cidadeSet = new Set<string>();
      const perFaixa = new Map<string, { F: number; M: number }>(
        FAIXAS.map((f) => [f.label, { F: 0, M: 0 }]),
      );
      const pageSize = 1000;
      let from = 0;
      const maxRows = 500000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const q = applyBase(
          dw
            .from(TABLE)
            .select('"NOME_PLANO","CIDADE_OFICIAL","IDADE","idsex"'),
        );
        const { data, error } = await q.range(from, from + pageSize - 1);
        if (error) {
          console.error(error);
          break;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (data ?? []) as any[];
        totalRows += rows.length;
        for (const r of rows) {
          if (r.NOME_PLANO) planoSet.add(String(r.NOME_PLANO));
          if (r.CIDADE_OFICIAL) cidadeSet.add(String(r.CIDADE_OFICIAL));
          if (r.IDADE != null) {
            const idade = Number(r.IDADE);
            if (!Number.isNaN(idade)) {
              const f = faixaFor(idade);
              if (f) {
                const bucket = perFaixa.get(f)!;
                const sex = String(r.idsex ?? "").trim().toUpperCase();
                if (sex === "F") bucket.F += 1;
                else if (sex === "M") bucket.M += 1;
              }
            }
          }
        }
        if (rows.length < pageSize) break;
        from += pageSize;
        if (from >= maxRows) break;
      }

      setVidas(totalRows);
      setPlanosDistintos(planoSet.size);
      setCidadesDistintas(cidadeSet.size);
      setPorFaixa(
        FAIXAS.map((f) => {
          const b = perFaixa.get(f.label) ?? { F: 0, M: 0 };
          return { faixa: f.label, F: b.F, M: b.M, total: b.F + b.M };
        }),
      );
      setLoading(false);
    })();
  }, [loadingOpts]);



  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="VIDAS" value={vidas} loading={loading} />
        <StatCard label="PLANOS" value={planosDistintos} loading={loading} />
        <StatCard label="CIDADES" value={cidadesDistintas} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vidas por Faixa Etária</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando...
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-pink-500" />
                  Feminino
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" />
                  Masculino
                </span>
              </div>
              {(() => {
                const max = Math.max(1, ...porFaixa.map((r) => r.total));
                const totalAll = porFaixa.reduce((s, r) => s + r.total, 0);
                return porFaixa.map((r) => {
                  const share = totalAll > 0 ? (r.total / totalAll) * 100 : 0;
                  const fPct = ((r.F ?? 0) / max) * 100;
                  const mPct = ((r.M ?? 0) / max) * 100;
                  return (
                    <div key={r.faixa}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{r.faixa}</span>
                        <span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {r.total.toLocaleString("pt-BR")}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground tabular-nums">
                            ({share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)
                          </span>
                          <span className="ml-2 text-xs tabular-nums">
                            <span className="text-pink-500">{(r.F ?? 0).toLocaleString("pt-BR")}</span>
                            <span className="text-muted-foreground"> · </span>
                            <span className="text-blue-500">{(r.M ?? 0).toLocaleString("pt-BR")}</span>
                          </span>
                        </span>
                      </div>
                      <div className="flex h-2 rounded-full bg-accent overflow-hidden">
                        <div className="h-full bg-pink-500" style={{ width: `${fPct}%` }} />
                        <div className="h-full bg-blue-500" style={{ width: `${mPct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
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

function BuscaNome() {
  const [nome, setNome] = useState("");
  const { rows, loading, run } = useSearch();
  const submit = () =>
    run(() =>
      applyBase(
        dw.from(TABLE).select(COLS).ilike("NOME_BENEFICIARIO", `%${nome}%`),
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

function BuscaCPF() {
  const [cpf, setCpf] = useState("");
  const { rows, loading, run } = useSearch();
  const submit = () => {
    const digits = cpf.replace(/\D/g, "");
    if (!digits) return;
    run(() => applyBase(dw.from(TABLE).select(COLS).eq("CPF", digits)));
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
    run(() => applyBase(dw.from(TABLE).select(COLS).eq("CDREGUSR", n)));
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
}: {
  planos: string[];
  cidades: string[];
}) {
  const [plano, setPlano] = useState<string>(ALL);
  const [cidade, setCidade] = useState<string>(ALL);
  const { rows, loading, run } = useSearch();

  const submit = () =>
    run(() => {
      let q = dw.from(TABLE).select(COLS);
      if (plano !== ALL) q = q.eq("NOME_PLANO", plano);
      if (cidade !== ALL) q = q.eq("CIDADE_PLANO", cidade);
      return applyBase(q).order("NOME_BENEFICIARIO");
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
