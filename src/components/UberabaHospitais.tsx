import { useState } from "react";
import { ArrowDown, ArrowUp, BedDouble, Building2, Hospital } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Row = { nome: string; cnpj: string; cnes: string; leitos: number };

const HOSPITAIS: Row[] = [
  { nome: "Hospital de Clínicas da UFTM (HC-UFTM)", cnpj: "25.437.484/0002-42", cnes: "2206595", leitos: 304 },
  { nome: "Mário Palmério Hospital Universitário (MPHU)", cnpj: "25.452.301/0005-00", cnes: "2195585", leitos: 220 },
  { nome: "Hospital Regional José Alencar", cnpj: "18.428.839/0001-90", cnes: "9141839", leitos: 149 },
  { nome: "Hospital Hélio Angotti", cnpj: "25.438.409/0001-15", cnes: "2165058", leitos: 120 },
  { nome: "Hospital Unimed Uberaba", cnpj: "17.774.738/0015-04", cnes: "9745041", leitos: 100 },
  { nome: "Hospital Santa Lúcia", cnpj: "25.447.731/0001-00", cnes: "2165066", leitos: 50 },
  { nome: "Hospital da Criança", cnpj: "25.440.199/0001-08", cnes: "2164795", leitos: 45 },
  { nome: "Hospital Beneficência Portuguesa", cnpj: "25.437.948/0001-30", cnes: "2164825", leitos: 40 },
];

const INFO: Record<string, { titulo: string; texto: string }> = {
  "2206595": {
    titulo: "Atendimento",
    texto:
      "Exclusivamente pelo SUS (Sistema Único de Saúde), integrando a rede pública de alta complexidade regulada pelo município e estado.",
  },
  "2195585": {
    titulo: "Convênios e Planos",
    texto:
      "Atende particulares, o próprio plano de descontos da instituição (Cartão MPHU Saúde) e alguns convênios de saúde e seguros corporativos (como Bradesco Saúde, Cassi, Cemig Saúde, Petrobras, Porto Seguro Saúde e Unimed, sujeito a confirmação prévia de redes específicas), além de vagas reguladas pelo SUS.",
  },
  "9141839": {
    titulo: "Atendimento",
    texto:
      "Totalmente voltado para o SUS, funcionando como retaguarda de urgência, emergência e leitos de referência macro-regional para a rede pública.",
  },
  "2165058": {
    titulo: "Convênios e Planos",
    texto:
      "Combate ao Câncer. Além de forte atuação pelo SUS na área de oncologia, possui convênio com diversos planos de saúde e seguradoras, tais como: Amil, Bradesco Saúde, Unimed, Cassi, Copass, Hapvida, Assefaz, Capesaúde, Cemig Saúde, Postal Saúde, Saúde Caixa, IPSM-MG e Usisaúde (recomenda-se confirmar a cobertura específica do plano diretamente no setor de convênios do hospital).",
  },
  "9745041": {
    titulo: "Convênios e Planos",
    texto:
      "Focado prioritariamente nos beneficiários do sistema Unimed (cartões locais e intercâmbio nacional do sistema) e particulares.",
  },
  "2164795": {
    titulo: "Atendimento",
    texto:
      "Especializado e integrado à rede pública municipal de saúde para atendimento pediátrico via SUS.",
  },
  "2165066": {
    titulo: "Convênios e Planos",
    texto:
      "Atendimento voltado para pacientes particulares, redes de saúde de menor porte e múltiplos convênios locais/regionais.",
  },
  "2164825": {
    titulo: "Convênios e Planos",
    texto: "Histórico por atendimentos particulares, filantropia e convênios selecionados da região.",
  },
};

type SortKey = keyof Row;

const UberabaHospitais = () => {
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "leitos", asc: false });

  const rows = [...HOSPITAIS].sort((a, b) => {
    const va = a[sort.key];
    const vb = b[sort.key];
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb
      : String(va).localeCompare(String(vb), "pt-BR");
    return sort.asc ? cmp : -cmp;
  });

  const total = HOSPITAIS.reduce((s, r) => s + r.leitos, 0);
  const max = Math.max(...HOSPITAIS.map((r) => r.leitos));

  const toggle = (key: SortKey) =>
    setSort((p) => (p.key === key ? { key, asc: !p.asc } : { key, asc: key === "nome" }));

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th
      onClick={() => toggle(k)}
      className={`cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide ${right ? "text-right" : "text-left"}`}
    >
      <span className={`inline-flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}>
        {label}
        {sort.key === k && (sort.asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </th>
  );

  return (
    <TooltipProvider delayDuration={150}>
    <div className="h-full overflow-auto pr-1">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Hospital className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Hospitais de Uberaba</h1>
        </div>
        <div className="ml-auto flex gap-2">
          <div className="rounded-md border border-border bg-card px-3 py-1.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" /> Hospitais
            </span>
            <span className="text-base font-semibold text-foreground">{HOSPITAIS.length}</span>
          </div>
          <div className="rounded-md border border-border bg-card px-3 py-1.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <BedDouble className="h-4 w-4" /> Leitos (~)
            </span>
            <span className="text-base font-semibold text-foreground">{total.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <Th k="nome" label="Nome do Hospital" />
              <Th k="cnpj" label="CNPJ" />
              <Th k="cnes" label="CNES" />
              <Th k="leitos" label="Nº de Leitos (~)" right />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.cnes} className={`border-t border-border ${i % 2 ? "bg-muted/40" : "bg-card"}`}>
                <td className="px-3 py-2 font-medium text-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline decoration-dotted decoration-muted-foreground underline-offset-4">
                        {r.nome}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-sm">
                      <p className="mb-1 text-xs font-semibold">{INFO[r.cnes]?.titulo}</p>
                      <p className="text-xs leading-relaxed">{INFO[r.cnes]?.texto}</p>
                    </TooltipContent>
                  </Tooltip>
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.cnpj}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.cnes}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(r.leitos / max) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right font-semibold tabular-nums text-foreground">
                      {r.leitos.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/60">
              <td className="px-3 py-2 font-semibold text-foreground" colSpan={3}>
                Total
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                {total.toLocaleString("pt-BR")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default UberabaHospitais;
