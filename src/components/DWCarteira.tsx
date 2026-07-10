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
import { Search, Loader2 } from "lucide-react";

type Row = {
  CDREGUSR: number | null;
  DATA_FIM_ATIVO: string | null;
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
  '"CDREGUSR","DATA_FIM_ATIVO","NOME_PLANO","NOME_BENEFICIARIO","NOME_RESPONSAVEL","CPF","CIDADE_PLANO","UF_PLANO","IDADE","VALOR_TMM"';
const TABLE = "sv_ecarteira_ativos";
const todayIso = () => new Date().toISOString().slice(0, 10);
const ALL = "__all__";
export const UF_FLAGS: Record<string, string> = {
  SP: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Bandeira_do_estado_de_S%C3%A3o_Paulo.svg/40px-Bandeira_do_estado_de_S%C3%A3o_Paulo.svg.png",
  MG: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Bandeira_de_Minas_Gerais.svg/40px-Bandeira_de_Minas_Gerais.svg.png",
  MS: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Bandeira_de_Mato_Grosso_do_Sul.svg/40px-Bandeira_de_Mato_Grosso_do_Sul.svg.png",
};
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
              <TableCell>{r.DATA_FIM_ATIVO && r.DATA_FIM_ATIVO.slice(0, 10) >= todayIso() ? "ATIVO" : "CANCELADO"}</TableCell>
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
const applyBase = (q: any, refDate?: string) =>
  refDate
    ? q.lte("DATA_INICIO_ATIVO", refDate).gte("DATA_FIM_ATIVO", refDate)
    : q.eq("TIPO_LINHA", "E").gte("DATA_FIM_ATIVO", todayIso());

const brToIso = (s?: string): string | undefined => {
  if (!s) return undefined;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return undefined;
};

export default function DWCarteira({ dateValue }: { dateValue?: string } = {}) {
  const [loadingOpts, setLoadingOpts] = useState(true);
  const refIso = brToIso(dateValue);

  useEffect(() => {
    (async () => {
      setLoadingOpts(true);
      const q = dw.from(TABLE).select('"NOME_PLANO","CIDADE_PLANO"');
      const { error } = refIso
        ? await q.lte("DATA_INICIO_ATIVO", refIso).gte("DATA_FIM_ATIVO", refIso).limit(1)
        : await q.eq("TIPO_LINHA", "E").gte("DATA_FIM_ATIVO", todayIso()).limit(1);
      if (error) console.error("Erro ao carregar filtros:", error);
      setLoadingOpts(false);
    })();
  }, [refIso]);

  return (
    <section className="h-full flex flex-col min-h-0 relative">
      <Dashboard loadingOpts={loadingOpts} refDate={refIso} />
    </section>
  );
}


export type CatRow = { label: string; total: number };
export type DWCarteiraData = {
  loading: boolean;
  vidas: number | null;
  pifDistintos: number | null;
  empresasDistintas: number | null;
  cidadesDistintas: number | null;
  porFaixa: { faixa: string; total: number; F: number; M: number }[];
  porContratacao: CatRow[];
  porRecuperacao: CatRow[];
  porAcomodacao: CatRow[];
  porUF: { uf: string; total: number }[];
  ufTotals: Record<string, number>;
  cityTotalsByUF: Record<string, Record<string, number>>;
};

export function useDWCarteira(enabled = true, refDate?: string): DWCarteiraData {
  const [vidas, setVidas] = useState<number | null>(null);
  const [pifDistintos, setPifDistintos] = useState<number | null>(null);
  const [empresasDistintas, setEmpresasDistintas] = useState<number | null>(null);
  const [cidadesDistintas, setCidadesDistintas] = useState<number | null>(null);
  const [porFaixa, setPorFaixa] = useState<
    { faixa: string; total: number; F: number; M: number }[]
  >([]);
  const [porUF, setPorUF] = useState<{ uf: string; total: number }[]>([]);
  const [ufTotals, setUfTotals] = useState<Record<string, number>>({});
  const [cityTotalsByUF, setCityTotalsByUF] = useState<Record<string, Record<string, number>>>({});
  const [porContratacao, setPorContratacao] = useState<CatRow[]>([]);
  const [porRecuperacao, setPorRecuperacao] = useState<CatRow[]>([]);
  const [porAcomodacao, setPorAcomodacao] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
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
      const UF_KEYS = ["SP", "MS", "MG", "Outros"] as const;
      const perUF = new Map<string, number>(UF_KEYS.map((u) => [u, 0]));
      const perUFAll = new Map<string, number>();
      const perCityByUF: Record<string, Map<string, number>> = {
        SP: new Map(),
        MG: new Map(),
        MS: new Map(),
      };
      const perContratacao = new Map<string, number>();
      const perRecuperacao = new Map<string, number>();
      const perAcomodacao = new Map<string, number>();
      const pageSize = 1000;
      let from = 0;
      const maxRows = 500000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const q = applyBase(
          dw
            .from(TABLE)
            .select('"PLANO","CIDADE_OFICIAL","UF_CIDADE_OFICIAL","IDADE","idsex","Contratacao","Recuperacao","ACOMODACAO"'),
          refDate,
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
          if (r.PLANO != null) {
            const p = Number(r.PLANO);
            if (!Number.isNaN(p)) {
              if (p < 2000) pifSet.add(p);
              else if (p > 2000) empresasSet.add(p);
            }
          }
          if (r.CIDADE_OFICIAL) cidadeSet.add(String(r.CIDADE_OFICIAL));
          {
            const uf = String(r.UF_CIDADE_OFICIAL ?? "").trim().toUpperCase();
            const key = (["SP", "MS", "MG"] as const).includes(uf as never) ? uf : "Outros";
            perUF.set(key, (perUF.get(key) ?? 0) + 1);
            if (uf) perUFAll.set(uf, (perUFAll.get(uf) ?? 0) + 1);
            if (perCityByUF[uf] && r.CIDADE_OFICIAL) {
              const city = String(r.CIDADE_OFICIAL);
              perCityByUF[uf].set(city, (perCityByUF[uf].get(city) ?? 0) + 1);
            }
          }
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
          const addCat = (m: Map<string, number>, val: unknown) => {
            const k = String(val ?? "").trim();
            if (!k) return;
            m.set(k, (m.get(k) ?? 0) + 1);
          };
          addCat(perContratacao, r.Contratacao);
          addCat(perRecuperacao, r.Recuperacao);
          addCat(perAcomodacao, r.ACOMODACAO);
        }
        if (rows.length < pageSize) break;
        from += pageSize;
        if (from >= maxRows) break;
      }

      if (cancelled) return;
      setVidas(totalRows);
      setPifDistintos(pifSet.size);
      setEmpresasDistintas(empresasSet.size);
      setCidadesDistintas(cidadeSet.size);
      setPorFaixa(
        FAIXAS.map((f) => {
          const b = perFaixa.get(f.label) ?? { F: 0, M: 0 };
          return { faixa: f.label, F: b.F, M: b.M, total: b.F + b.M };
        }),
      );
      setPorUF(UF_KEYS.map((u) => ({ uf: u, total: perUF.get(u) ?? 0 })));
      setUfTotals(Object.fromEntries(perUFAll));
      setCityTotalsByUF({
        SP: Object.fromEntries(perCityByUF.SP),
        MG: Object.fromEntries(perCityByUF.MG),
        MS: Object.fromEntries(perCityByUF.MS),
      });
      const toSortedCat = (m: Map<string, number>): CatRow[] =>
        Array.from(m, ([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
      setPorContratacao(toSortedCat(perContratacao));
      setPorRecuperacao(toSortedCat(perRecuperacao));
      setPorAcomodacao(toSortedCat(perAcomodacao));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, refDate]);

  return {
    loading,
    vidas,
    pifDistintos,
    empresasDistintas,
    cidadesDistintas,
    porFaixa,
    porContratacao,
    porRecuperacao,
    porAcomodacao,
    porUF,
    ufTotals,
    cityTotalsByUF,
  };
}

function Dashboard({
  loadingOpts,
  refDate,
}: {
  loadingOpts: boolean;
  refDate?: string;
}) {
  const {
    loading,
    vidas,
    porFaixa,
    porContratacao,
    porRecuperacao,
    porAcomodacao,
  } = useDWCarteira(!loadingOpts, refDate);

  const fmtInt = (n: number) => n.toLocaleString("pt-BR");

  return (
    <>
      <div className="absolute top-2 left-4 z-10 text-xl font-semibold text-foreground tabular-nums">
        Beneficiários ativos:{" "}
        <span>{vidas !== null ? fmtInt(vidas) : "—"}</span>
      </div>
      <div className="flex-1 min-h-0 p-4 pt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FaixaEtariaCard porFaixa={porFaixa} loading={loading} />
        <div className="grid grid-rows-3 gap-6 min-h-0">
          <CategoryCard title="Contratação" rows={porContratacao} loading={loading} />
          <CategoryCard title="Recuperação" rows={porRecuperacao} loading={loading} />
          <CategoryCard title="Acomodação" rows={porAcomodacao} loading={loading} />
        </div>
      </div>
    </>
  );
}

function FaixaEtariaCard({
  porFaixa,
  loading,
}: {
  porFaixa: { faixa: string; total: number; F: number; M: number }[];
  loading: boolean;
}) {
  return (
    <Card className="flex flex-col min-h-0 overflow-hidden">
      <CardHeader className="shrink-0">
        <CardTitle className="text-base">Faixa Etária</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando...
          </div>
        ) : (
          <div className="flex flex-col">
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
            <div className="space-y-2">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryCard({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: CatRow[];
  loading: boolean;
}) {
  const totalAll = rows.reduce((s, r) => s + r.total, 0);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card className="flex flex-col min-h-0 overflow-hidden">
      <CardHeader className="shrink-0 py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Sem dados.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const share = totalAll > 0 ? (r.total / totalAll) * 100 : 0;
              const pct = (r.total / max) * 100;
              return (
                <div key={r.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{r.label}</span>
                    <span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {r.total.toLocaleString("pt-BR")}
                      </span>{" "}
                      <span className="text-xs text-muted-foreground tabular-nums">
                        ({share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full bg-accent overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
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
