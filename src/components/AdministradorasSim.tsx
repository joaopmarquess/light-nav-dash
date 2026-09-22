import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { simBase, type SimBase, type SimParams } from "@/data/benevixSim";

type Aba = "adesao" | "pme";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const int = (v: number) => Math.round(v).toLocaleString("pt-BR");

type Row = {
  faixa: string;
  vidas: number;
  venda: number;
  net: number;
  faturamento: number;
  receitaNet: number;
  copart: number;
  bensaude: number;
  despesas: number;
  resultado: number;
  adm: number;
};

type Calc = {
  rows: Row[];
  vidas: number;
  faturamento: number;
  receitaNet: number;
  copart: number;
  bensaude: number;
  despesas: number;
  resultado: number;
  adm: number;
  sin: number;
  netPercaptaAtual: number;
  despesaPercapta: number;
};

function calcular(base: SimBase, p: SimParams): Calc {
  const despesaPercapta = p.netPercapta * p.sinRef;
  const despesaTotal = despesaPercapta * p.vidas;

  const pre = base.faixas.map((f) => {
    const vidas = p.vidas * f.dfe;
    const net = f.venda * (1 - p.spread);
    const receitaNet = vidas * net;
    const copart = receitaNet * p.copart;
    return {
      faixa: f.faixa,
      vidas,
      venda: f.venda,
      net,
      faturamento: vidas * f.venda,
      receitaNet,
      copart,
      bensaude: receitaNet + copart,
      adm: vidas * (f.venda - net),
    };
  });

  const somaBensaude = pre.reduce((a, r) => a + r.bensaude, 0);
  const sin = somaBensaude ? despesaTotal / somaBensaude : 0;

  const rows: Row[] = pre.map((r) => {
    const despesas = r.bensaude * sin;
    return { ...r, despesas, resultado: r.receitaNet - despesas };
  });

  const sum = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
  const vidas = sum((r) => r.vidas);
  const receitaNet = sum((r) => r.receitaNet);
  const despesas = sum((r) => r.despesas);
  return {
    rows,
    vidas,
    faturamento: sum((r) => r.faturamento),
    receitaNet,
    copart: sum((r) => r.copart),
    bensaude: somaBensaude,
    despesas,
    resultado: sum((r) => r.resultado),
    adm: sum((r) => r.adm),
    sin,
    netPercaptaAtual: vidas ? receitaNet / vidas : 0,
    despesaPercapta,
  };
}

const Campo = ({
  label,
  value,
  step,
  onChange,
  sufixo,
  largura = "w-24",
}: {
  label: string;
  value: number;
  step: string;
  onChange: (v: number) => void;
  sufixo?: string;
  largura?: string;
}) => (
  <label className="flex items-center gap-2 text-xs text-muted-foreground">
    {label}
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`h-8 ${largura} rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400/50`}
    />
    {sufixo && <span>{sufixo}</span>}
  </label>
);

const Bloco = ({
  titulo,
  base,
  draft,
  setDraft,
  calc,
  onCalcular,
  onRestaurar,
}: {
  titulo: string;
  base: SimBase;
  draft: SimParams;
  setDraft: (p: SimParams) => void;
  calc: Calc;
  onCalcular: () => void;
  onRestaurar: () => void;
}) => {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-4">
        <button
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? "" : "-rotate-90"}`} />
          {titulo}
        </button>
        <Campo label="Vidas" step="1" value={draft.vidas} largura="w-28" onChange={(v) => setDraft({ ...draft, vidas: v })} />
        <Campo
          label="Spread"
          step="0.01"
          sufixo="%"
          value={Number((draft.spread * 100).toFixed(2))}
          onChange={(v) => setDraft({ ...draft, spread: v / 100 })}
        />
        <Campo
          label="Copart."
          step="0.01"
          sufixo="%"
          value={Number((draft.copart * 100).toFixed(2))}
          onChange={(v) => setDraft({ ...draft, copart: v / 100 })}
        />
        <Campo
          label="Sinistralidade ref."
          step="0.01"
          sufixo="%"
          value={Number((draft.sinRef * 100).toFixed(2))}
          onChange={(v) => setDraft({ ...draft, sinRef: v / 100 })}
        />
        <Campo
          label="Net percapta ref."
          step="0.01"
          value={draft.netPercapta}
          largura="w-28"
          onChange={(v) => setDraft({ ...draft, netPercapta: v })}
        />
        <button
          onClick={onCalcular}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
        >
          Calcular
        </button>
        <button
          onClick={onRestaurar}
          className="h-8 px-4 rounded-md border border-border text-xs font-medium text-foreground hover:bg-accent"
        >
          Restaurar
        </button>
        <span className="text-[11px] text-muted-foreground">Campos em amarelo são editáveis</span>
      </header>

      <div className="px-4 py-2 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground border-b border-border">
        <span>Sinistralidade medida: <strong className="text-foreground">{pct(calc.sin)}</strong></span>
        <span>Net percapta: <strong className="text-foreground">{brl(calc.netPercaptaAtual)}</strong></span>
        <span>Despesa percapta: <strong className="text-foreground">{brl(calc.despesaPercapta)}</strong></span>
        <span>
          Resultado mensal:{" "}
          <strong className={calc.resultado < 0 ? "text-destructive" : "text-foreground"}>{brl(calc.resultado)}</strong>
        </span>
        <span>
          Resultado anual:{" "}
          <strong className={calc.resultado < 0 ? "text-destructive" : "text-foreground"}>{brl(calc.resultado * 12)}</strong>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground text-xs">
              <th className="px-3 py-2 text-left font-medium">Faixa</th>
              <th className="px-3 py-2 text-right font-medium">Vidas</th>
              <th className="px-3 py-2 text-right font-medium">R$ Venda</th>
              <th className="px-3 py-2 text-right font-medium">R$ Net</th>
              <th className="px-3 py-2 text-right font-medium">Faturamento</th>
              <th className="px-3 py-2 text-right font-medium">Receita Net</th>
              <th className="px-3 py-2 text-right font-medium">Copart.</th>
              <th className="px-3 py-2 text-right font-medium">R$ Bensaúde</th>
              <th className="px-3 py-2 text-right font-medium">Despesas</th>
              <th className="px-3 py-2 text-right font-medium">Result. Bensaúde</th>
              <th className="px-3 py-2 text-right font-medium">Result. Adm.</th>
            </tr>
          </thead>
          <tbody>
            {aberto &&
              calc.rows.map((r, i) => (
                <tr key={r.faixa} className={i % 2 ? "bg-muted/20" : ""}>
                  <td className="px-3 py-1.5 text-foreground/80">{r.faixa}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{int(r.vidas)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.venda)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.net)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.faturamento)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.receitaNet)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.copart)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.bensaude)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-destructive">-{brl(r.despesas)}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${r.resultado < 0 ? "text-destructive" : ""}`}>
                    {brl(r.resultado)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.adm)}</td>
                </tr>
              ))}
            <tr className="font-semibold border-t border-border bg-primary/10">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{int(calc.vidas)}</td>
              <td className="px-3 py-2 text-right tabular-nums">—</td>
              <td className="px-3 py-2 text-right tabular-nums">—</td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.faturamento)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.receitaNet)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.copart)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.bensaude)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-destructive">-{brl(calc.despesas)}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${calc.resultado < 0 ? "text-destructive" : ""}`}>
                {brl(calc.resultado)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(calc.adm)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

const padrao = (a: Aba): SimParams => {
  const { vidas, spread, copart, sinRef, netPercapta } = simBase[a];
  return { vidas, spread, copart, sinRef, netPercapta };
};

const AdministradorasSim = () => {
  const [draft, setDraft] = useState<Record<Aba, SimParams>>({ adesao: padrao("adesao"), pme: padrao("pme") });
  const [aplicado, setAplicado] = useState<Record<Aba, SimParams>>({
    adesao: padrao("adesao"),
    pme: padrao("pme"),
  });

  const calcAdesao = useMemo(() => calcular(simBase.adesao, aplicado.adesao), [aplicado.adesao]);
  const calcPme = useMemo(() => calcular(simBase.pme, aplicado.pme), [aplicado.pme]);

  const vidas = calcAdesao.vidas + calcPme.vidas;
  const mensal = calcAdesao.resultado + calcPme.resultado;

  return (
    <div className="h-full overflow-auto pr-1 space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { t: "Vidas", v: int(vidas) },
          { t: "Resultado mensal", v: brl(mensal), neg: mensal < 0 },
          { t: "Resultado anual", v: brl(mensal * 12), neg: mensal < 0 },
        ].map((c) => (
          <div key={c.t} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground">{c.t}</p>
            <p className={`text-xl font-semibold tabular-nums ${c.neg ? "text-destructive" : "text-foreground"}`}>{c.v}</p>
          </div>
        ))}
      </div>

      {(["adesao", "pme"] as Aba[]).map((a) => (
        <Bloco
          key={a}
          titulo={a === "adesao" ? "Adesão" : "PME"}
          base={simBase[a]}
          draft={draft[a]}
          setDraft={(p) => setDraft((prev) => ({ ...prev, [a]: p }))}
          calc={a === "adesao" ? calcAdesao : calcPme}
          onCalcular={() => setAplicado((prev) => ({ ...prev, [a]: { ...draft[a] } }))}
          onRestaurar={() => {
            setDraft((prev) => ({ ...prev, [a]: padrao(a) }));
            setAplicado((prev) => ({ ...prev, [a]: padrao(a) }));
          }}
        />
      ))}
    </div>
  );
};

export default AdministradorasSim;
