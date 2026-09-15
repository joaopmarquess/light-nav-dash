import { useMemo, useState } from "react";
import { benevixBase, type FaixaRow } from "@/data/benevix";

type Aba = "adesao" | "pme";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const int = (v: number) => Math.round(v).toLocaleString("pt-BR");

type Calc = {
  rows: (FaixaRow & { netEnfCalc: number; fatNet: number; fatVenda: number; despesas: number; bensaude: number; adm: number })[];
  vidas: number;
  fatNet: number;
  fatVenda: number;
  despesas: number;
  bensaude: number;
  adm: number;
  netMedio: number;
  vendaMedio: number;
};

function calcular(rows: FaixaRow[], spread: number | null, sin: number, despesasFixas?: number[]): Calc {
  const out = rows.map((r, i) => {
    const venda = r.vendaEnf ?? 0;
    const netEnfCalc = spread === null ? r.netEnf ?? 0 : venda * (1 - spread);
    const vidas = r.vidas ?? 0;
    const fatNet = vidas * netEnfCalc;
    const fatVenda = vidas * venda;
    const despesas = despesasFixas ? despesasFixas[i] : fatNet * sin;
    return {
      ...r,
      netEnfCalc,
      fatNet,
      fatVenda,
      despesas,
      bensaude: fatNet - despesas,
      adm: fatVenda - fatNet,
    };
  });
  const sum = (f: (r: (typeof out)[number]) => number) => out.reduce((a, r) => a + f(r), 0);
  const vidas = sum((r) => r.vidas ?? 0);
  const fatNet = sum((r) => r.fatNet);
  const fatVenda = sum((r) => r.fatVenda);
  const despesas = sum((r) => r.despesas);
  return {
    rows: out,
    vidas,
    fatNet,
    fatVenda,
    despesas,
    bensaude: fatNet - despesas,
    adm: fatVenda - fatNet,
    netMedio: vidas ? fatNet / vidas : 0,
    vendaMedio: vidas ? fatVenda / vidas : 0,
  };
}

const Bloco = ({
  titulo,
  calc,
  spread,
  sin,
  editavel,
  onSpread,
  onSin,
  destaque,
  colapsavel,
}: {
  titulo: string;
  calc: Calc;
  spread: number | null;
  sin: number;
  editavel?: boolean;
  onSpread?: (v: number) => void;
  onSin?: (v: number) => void;
  destaque?: boolean;
  colapsavel?: boolean;
}) => {
  const [aberto, setAberto] = useState(!colapsavel);
  return (
  <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
    <header className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-4">
      {colapsavel ? (
        <button
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? "" : "-rotate-90"}`} />
          {titulo}
        </button>
      ) : (
        <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
      )}
      {editavel ? (
        <>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            % Spread
            <input
              type="number"
              step="0.01"
              value={((spread ?? 0) * 100).toFixed(2)}
              onChange={(e) => onSpread?.(Number(e.target.value) / 100)}
              className="h-8 w-24 rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Sinistralidade %
            <input
              type="number"
              step="0.01"
              value={(sin * 100).toFixed(2)}
              onChange={(e) => onSin?.(Number(e.target.value) / 100)}
              className="h-8 w-24 rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </label>
          <span className="text-[11px] text-muted-foreground">Campos em amarelo são editáveis</span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          {spread !== null && <>Spread {pct(spread)} · </>}Sinistralidade {pct(sin)}
        </span>
      )}
    </header>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground text-xs">
            <th className="px-3 py-2 text-left font-medium">Faixa</th>
            <th className="px-3 py-2 text-right font-medium">R$ Net</th>
            <th className="px-3 py-2 text-right font-medium">R$ Venda</th>
            <th className="px-3 py-2 text-right font-medium">Vidas</th>
            <th className="px-3 py-2 text-right font-medium">Fat. Net</th>
            <th className="px-3 py-2 text-right font-medium">Fat. Venda</th>
            <th className="px-3 py-2 text-right font-medium">Despesas</th>
            <th className="px-3 py-2 text-right font-medium">Result. Bensaúde</th>
            <th className="px-3 py-2 text-right font-medium">Administradora</th>
          </tr>
        </thead>
        <tbody>
          {calc.rows.map((r, i) => (
            <tr key={r.faixa} className={i % 2 ? "bg-muted/20" : ""}>
              <td className="px-3 py-1.5 text-foreground/80">{r.faixa}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.netEnfCalc)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.vendaEnf ?? 0)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{int(r.vidas ?? 0)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.fatNet)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.fatVenda)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-destructive">-{brl(r.despesas)}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${r.bensaude < 0 ? "text-destructive" : ""}`}>
                {brl(r.bensaude)}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{brl(r.adm)}</td>
            </tr>
          ))}
          <tr className={`font-semibold border-t border-border ${destaque ? "bg-primary/10" : "bg-muted/50"}`}>
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2 text-right tabular-nums">{brl(calc.netMedio)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{brl(calc.vendaMedio)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{int(calc.vidas)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{brl(calc.fatNet)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{brl(calc.fatVenda)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-destructive">-{brl(calc.despesas)}</td>
            <td className={`px-3 py-2 text-right tabular-nums ${calc.bensaude < 0 ? "text-destructive" : ""}`}>
              {brl(calc.bensaude)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{brl(calc.adm)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
);

const CarteirasBenevix = () => {
  const [aba, setAba] = useState<Aba>("adesao");
  const base = benevixBase[aba];

  const [prop, setProp] = useState<Record<Aba, { spread: number; sin: number }>>({
    adesao: { ...benevixBase.adesao.proposta },
    pme: { ...benevixBase.pme.proposta },
  });
  const [sinLancers] = useState<Record<Aba, number>>({
    adesao: benevixBase.adesao.lancers.sin,
    pme: benevixBase.pme.lancers.sin,
  });

  const benevix = useMemo(
    () => calcular(base.benevix.rows, base.benevix.spread, base.benevix.sin),
    [base],
  );
  const lancers = useMemo(
    () => calcular(base.lancers.rows, null, sinLancers[aba]),
    [base, sinLancers, aba],
  );
  const proposta = useMemo(
    () =>
      calcular(
        base.benevix.rows,
        prop[aba].spread,
        prop[aba].sin,
        benevix.rows.map((r) => r.despesas),
      ),
    [base, prop, aba, benevix],
  );

  const delta = proposta.bensaude - benevix.bensaude;

  return (
    <div className="h-full overflow-auto pr-1 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["adesao", "pme"] as Aba[]).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === a ? "bg-accent text-primary" : "text-foreground/70 hover:bg-accent/60"
            }`}
          >
            {a === "adesao" ? "Adesão" : "PME"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { t: "Resultado Bensaúde hoje", v: benevix.bensaude },
          { t: "Resultado simulado", v: proposta.bensaude },
          { t: "Diferença", v: delta },
        ].map((c) => (
          <div key={c.t} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground">{c.t}</p>
            <p className={`text-xl font-semibold tabular-nums ${c.v < 0 ? "text-destructive" : "text-foreground"}`}>
              {brl(c.v)}
            </p>
          </div>
        ))}
      </div>

      <Bloco titulo="Benevix (atual)" calc={benevix} spread={base.benevix.spread} sin={base.benevix.sin} />
      <Bloco
        titulo="Lancers"
        calc={lancers}
        spread={null}
        sin={sinLancers[aba]}
      />
      <Bloco
        titulo="Benevix Proposta"
        calc={proposta}
        spread={prop[aba].spread}
        sin={prop[aba].sin}
        editavel
        destaque
        onSpread={(v) => setProp((p) => ({ ...p, [aba]: { ...p[aba], spread: v } }))}
        onSin={(v) => setProp((p) => ({ ...p, [aba]: { ...p[aba], sin: v } }))}
      />
    </div>
  );
};

export default CarteirasBenevix;
