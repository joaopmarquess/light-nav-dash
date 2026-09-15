import { useMemo, useState } from "react";
import { Trophy, Plus, Trash2, RotateCcw } from "lucide-react";
import {
  Categoria,
  Participante,
  metasIniciais,
  participantesIniciais,
  premiosIniciais,
} from "@/data/promocoes";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const num = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type Calculado = Participante & {
  projLancers: number;
  projOutros: number;
  projTotal: number;
  atingiu: boolean;
  posicao: number | null;
  premio: number;
};

const LABEL: Record<Categoria, string> = { promotor: "Promotores", hunter: "Hunters" };

const Promocoes = () => {
  const [participantes, setParticipantes] = useState<Participante[]>(participantesIniciais);
  const [metas, setMetas] = useState(metasIniciais);
  const [premios] = useState(premiosIniciais);
  const [aba, setAba] = useState<Categoria>("promotor");

  const setRow = (i: number, patch: Partial<Participante>) =>
    setParticipantes((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const calculados = useMemo<Record<Categoria, Calculado[]>>(() => {
    const out: Record<Categoria, Calculado[]> = { promotor: [], hunter: [] };
    (["promotor", "hunter"] as Categoria[]).forEach((cat) => {
      const meta = metas[cat];
      const linhas = participantes
        .filter((p) => p.categoria === cat)
        .map((p) => {
          const projLancers = p.lancers * (1 + p.crescLancers);
          const projOutros = p.outros * (1 + p.crescOutros);
          const projTotal = projLancers + projOutros;
          const atingiu =
            projLancers >= meta.lancers && projOutros >= meta.outros && projTotal >= meta.total;
          return { ...p, projLancers, projOutros, projTotal, atingiu, posicao: null, premio: 0 } as Calculado;
        });
      const vencedores = linhas
        .filter((l) => l.atingiu)
        .sort((a, b) => b.projTotal - a.projTotal);
      vencedores.forEach((v, i) => {
        v.posicao = i + 1;
        v.premio = premios[cat].podio[i] ?? premios[cat].demais;
      });
      out[cat] = linhas.sort((a, b) => b.projTotal - a.projTotal);
    });
    return out;
  }, [participantes, metas, premios]);

  const lista = calculados[aba];
  const vencedores = lista.filter((l) => l.atingiu).sort((a, b) => (a.posicao! - b.posicao!));
  const totalPremios = vencedores.reduce((s, v) => s + v.premio, 0);
  const meta = metas[aba];

  const totais = lista.reduce(
    (acc, l) => ({
      lancers: acc.lancers + l.lancers,
      outros: acc.outros + l.outros,
      projLancers: acc.projLancers + l.projLancers,
      projOutros: acc.projOutros + l.projOutros,
      projTotal: acc.projTotal + l.projTotal,
    }),
    { lancers: 0, outros: 0, projLancers: 0, projOutros: 0, projTotal: 0 },
  );

  const addRow = () =>
    setParticipantes((p) => [
      ...p,
      {
        nome: "NOVO PARTICIPANTE",
        categoria: aba,
        lancers: 0,
        outros: 0,
        crescLancers: 0.1,
        crescOutros: 0.3,
      },
    ]);

  const removeRow = (nome: string) =>
    setParticipantes((p) => p.filter((r) => !(r.nome === nome && r.categoria === aba)));

  const aplicarCrescimento = (campo: "crescLancers" | "crescOutros", valor: number) =>
    setParticipantes((p) => p.map((r) => (r.categoria === aba ? { ...r, [campo]: valor } : r)));

  return (
    <div className="h-full overflow-auto pr-1 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["promotor", "hunter"] as Categoria[]).map((c) => (
          <button
            key={c}
            onClick={() => setAba(c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === c
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground/70 hover:bg-accent"
            }`}
          >
            {LABEL[c]}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => {
            setParticipantes(participantesIniciais);
            setMetas(metasIniciais);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-border bg-card hover:bg-accent transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Restaurar
        </button>
      </div>

      <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Metas do 3º trimestre — {LABEL[aba]}
        </h2>
        <div className="flex flex-wrap gap-4">
          {(["lancers", "outros", "total"] as const).map((k) => (
            <label key={k} className="text-xs text-muted-foreground space-y-1">
              <span className="block uppercase">
                {k === "lancers" ? "Lancers" : k === "outros" ? "Outros produtos" : "Total"}
              </span>
              <input
                type="number"
                value={meta[k]}
                onChange={(e) =>
                  setMetas((m) => ({ ...m, [aba]: { ...m[aba], [k]: Number(e.target.value) || 0 } }))
                }
                className="h-9 w-28 px-2 rounded-md border border-border bg-background text-sm text-foreground"
              />
            </label>
          ))}
          <label className="text-xs text-muted-foreground space-y-1">
            <span className="block uppercase">Crescimento Lancers (todos)</span>
            <input
              type="number"
              step="1"
              placeholder="%"
              onChange={(e) => aplicarCrescimento("crescLancers", (Number(e.target.value) || 0) / 100)}
              className="h-9 w-32 px-2 rounded-md border border-border bg-background text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground space-y-1">
            <span className="block uppercase">Crescimento Outros (todos)</span>
            <input
              type="number"
              step="1"
              placeholder="%"
              onChange={(e) => aplicarCrescimento("crescOutros", (Number(e.target.value) || 0) / 100)}
              className="h-9 w-32 px-2 rounded-md border border-border bg-background text-sm text-foreground"
            />
          </label>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Desempenho e projeção — {LABEL[aba]}
          </h2>
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border border-border hover:bg-accent transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">{LABEL[aba]}</th>
                <th className="px-3 py-2 text-right">Lancers 3ºT</th>
                <th className="px-3 py-2 text-right">Outros 3ºT</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Cresc. Lancers %</th>
                <th className="px-3 py-2 text-right">Cresc. Outros %</th>
                <th className="px-3 py-2 text-right">Proj. Lancers</th>
                <th className="px-3 py-2 text-right">Proj. Outros</th>
                <th className="px-3 py-2 text-right">Proj. Total</th>
                <th className="px-3 py-2 text-center">Atingiu</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => {
                const idx = participantes.findIndex(
                  (p) => p.nome === l.nome && p.categoria === l.categoria,
                );
                return (
                  <tr key={l.categoria + l.nome} className="border-t border-border even:bg-accent/20">
                    <td className="px-3 py-1.5">
                      <input
                        value={l.nome}
                        onChange={(e) => setRow(idx, { nome: e.target.value })}
                        className="w-64 bg-transparent text-sm text-foreground focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={l.lancers}
                        onChange={(e) => setRow(idx, { lancers: Number(e.target.value) || 0 })}
                        className="w-20 text-right bg-transparent tabular-nums focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={l.outros}
                        onChange={(e) => setRow(idx, { outros: Number(e.target.value) || 0 })}
                        className="w-20 text-right bg-transparent tabular-nums focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{l.lancers + l.outros}</td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={Math.round(l.crescLancers * 1000) / 10}
                        onChange={(e) =>
                          setRow(idx, { crescLancers: (Number(e.target.value) || 0) / 100 })
                        }
                        className="w-20 text-right bg-transparent tabular-nums focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={Math.round(l.crescOutros * 1000) / 10}
                        onChange={(e) =>
                          setRow(idx, { crescOutros: (Number(e.target.value) || 0) / 100 })
                        }
                        className="w-20 text-right bg-transparent tabular-nums focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{num(l.projLancers)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{num(l.projOutros)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                      {num(l.projTotal)}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          l.atingiu
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {l.atingiu ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => removeRow(l.nome)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border bg-accent/40 font-semibold">
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-right tabular-nums">{totais.lancers}</td>
                <td className="px-3 py-2 text-right tabular-nums">{totais.outros}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {totais.lancers + totais.outros}
                </td>
                <td /><td />
                <td className="px-3 py-2 text-right tabular-nums">{num(totais.projLancers)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{num(totais.projOutros)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{num(totais.projTotal)}</td>
                <td className="px-3 py-2 text-center tabular-nums">{vencedores.length}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-primary" /> Ranking dos premiados — {LABEL[aba]}
          </h2>
          <span className="text-xs text-muted-foreground">
            Total em prêmios: <span className="font-semibold text-foreground">{brl(totalPremios)}</span>
          </span>
        </div>
        {vencedores.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum participante atingiu a meta com os percentuais atuais.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Colocação</th>
                <th className="px-3 py-2 text-left">{aba === "promotor" ? "Promotor" : "Hunter"}</th>
                <th className="px-3 py-2 text-right">Lancers</th>
                <th className="px-3 py-2 text-right">Outros</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Premiação</th>
              </tr>
            </thead>
            <tbody>
              {vencedores.map((v) => (
                <tr key={v.nome} className="border-t border-border even:bg-accent/20">
                  <td className="px-3 py-2 font-medium">{v.posicao}º</td>
                  <td className="px-3 py-2">{v.nome}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(v.projLancers)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(v.projOutros)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{num(v.projTotal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-primary">
                    {brl(v.premio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Ordem: maior total projetado entre quem cumpre simultaneamente as metas de Lancers e Outros
        Produtos. Prêmios {LABEL[aba]}: {premios[aba].podio.map((p, i) => `${i + 1}º ${brl(p)}`).join(" · ")} ·
        demais que atingirem a meta {brl(premios[aba].demais)}. Em Outros Produtos Bensaúde foram
        consideradas as vigências 11/2026 e 12/2026.
      </p>
    </div>
  );
};

export default Promocoes;
