import { Fragment, useState } from "react";
import { Input } from "@/components/ui/input";
import { carregarDatasFm, formatarCompetencia, lerCompetencia, lerInteiro, ultimoDiaUtil, salvarDatasFm, simularDatasFm, type EntradaDatasFm, type IdDataFm } from "@/lib/simularDatasFm";

// Laboratory › Simular Datas FM: Competência (MM/AAAA, acima do grid), Último Dia (último dia útil, calculado) e o dia de cada linha, com a data calculada; valores digitados ficam neste navegador.
export default function SimularDatasFm() {
  const [entrada, setEntrada] = useState<EntradaDatasFm>(carregarDatasFm);
  const [texto, setTexto] = useState<Record<string, string>>({});
  const gravar = (proximo: EntradaDatasFm) => { setEntrada(proximo); salvarDatasFm(proximo); };
  const campo = (chave: string, valorAtual: number, min: number, max: number, aplicar: (v: number | undefined) => void) => ({
    value: texto[chave] ?? String(valorAtual),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = e.target.value;
      if (t !== "" && !/^\d*$/.test(t)) return;
      setTexto((p) => ({ ...p, [chave]: t }));
      const v = lerInteiro(t, min, max);
      if (v !== null) aplicar(v);
    },
    onBlur: () => setTexto((p) => { const n = { ...p }; delete n[chave]; return n; }),
  });
  const linhas = simularDatasFm(entrada);
  const ultimo = ultimoDiaUtil(entrada.mes, entrada.ano);
  const [competenciaTexto, setCompetenciaTexto] = useState<string | null>(null);
  const alterarCompetencia = (t: string) => {
    if (!/^[\d/]*$/.test(t)) return;
    setCompetenciaTexto(t);
    const c = lerCompetencia(t);
    if (c) gravar({ ...entrada, ...c });
  };
  const cls = "h-8 w-20 text-right tabular-nums";
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Simular Datas FM</h1>
      <label className="flex items-center gap-2 text-sm">
        <span className="font-semibold">Competência:</span>
        <Input aria-label="Competência" inputMode="numeric" placeholder="MM/AAAA" maxLength={7}
          value={competenciaTexto ?? formatarCompetencia(entrada.mes, entrada.ano)}
          onChange={(e) => alterarCompetencia(e.target.value)}
          onBlur={() => setCompetenciaTexto(null)}
          className={`h-8 w-28 text-center tabular-nums ${competenciaTexto !== null && !lerCompetencia(competenciaTexto) ? "border-destructive" : ""}`} />
      </label>
      <div className="max-w-xl overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-secondary-foreground">
              <th className="px-3 py-2 text-left font-semibold">VARIÁVEL</th>
              <th className="px-3 py-2 text-right font-semibold">DIA</th>
              <th className="px-3 py-2 text-right font-semibold">DATA</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <Fragment key={l.id}>
              {l.id === "arquivo" && (
                <tr className="border-b border-border">
                  <td className="px-3 py-1.5">Último Dia</td>
                  <td className="px-3 py-1.5 text-right tabular-nums" title="Último dia útil do mês da competência (sem sábados, domingos e feriados nacionais)">{ultimo.dia}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{ultimo.data}</td>
                </tr>
              )}
              <tr className={`border-b border-border ${l.separadorAntes ? "border-t-2 border-t-foreground" : ""} ${l.destaque ? "font-bold" : ""}`}>
                <td className="px-3 py-1.5">{l.rotulo}</td>
                <td className="px-3 py-1.5">
                  <Input aria-label={`Dia — ${l.rotulo}`} inputMode="numeric" title="Apague para restaurar o padrão" className={`ml-auto ${cls} ${l.destaque ? "font-bold" : ""}`}
                    {...campo(l.id, l.dia, 1, 31, (v) => {
                      const dias = { ...entrada.dias };
                      if (v === undefined) delete dias[l.id as IdDataFm]; else dias[l.id as IdDataFm] = v;
                      gravar({ ...entrada, dias });
                    })} />
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums" title={l.ajustado ? "Dia limitado ao último dia do mês" : undefined}>
                  {l.data}{l.ajustado ? " *" : ""}
                </td>
              </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
