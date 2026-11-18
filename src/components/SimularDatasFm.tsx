import { Fragment, useState } from "react";
import { Input } from "@/components/ui/input";
import { carregarDatasFm, formatarCompetencia, lerCompetencia, lerDiaMes, avaliarImpactosFm, lerInteiro, periodoFm, salvarDatasFm, simularDatasFm, type EntradaDatasFm, type IdDataFm } from "@/lib/simularDatasFm";

// Laboratory › Simular Datas FM: Competência (MM/AAAA) e Período (dia seguinte ao Último Dia, um mês antes, a Último Dia) acima do grid, sem a linha Último Dia (pedido de 18/11/2026), Arquivo como dia/mês fora do grid e o dia de cada linha, com a data calculada; valores digitados ficam neste navegador.
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
  const todas = simularDatasFm(entrada);
  // Arquivo fica fora do grid de variáveis (pedido de 18/11/2026), logo abaixo da Competência.
  const arquivo = todas.find((l) => l.id === "arquivo")!;
  const linhas = todas.filter((l) => l.id !== "arquivo");
  const periodo = periodoFm(entrada);
  const impactos = avaliarImpactosFm(entrada);
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
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">Arquivo:</span>
        <Input aria-label={`Dia/mês — ${arquivo.rotulo}`} inputMode="numeric" placeholder="DD/MM" maxLength={5} title="Dia/mês (DD/MM); apague para restaurar o padrão"
          value={texto[arquivo.id] ?? arquivo.diaMes}
          onChange={(e) => {
            const t = e.target.value;
            if (!/^[\d/]*$/.test(t)) return;
            setTexto((p) => ({ ...p, [arquivo.id]: t }));
            const v = lerDiaMes(t);
            if (v === null) return;
            const dias = { ...entrada.dias };
            if (v === undefined) { delete dias[arquivo.id]; const { arquivoMes: _, ...resto } = entrada; gravar({ ...resto, dias }); }
            else { dias[arquivo.id] = v.dia; gravar({ ...entrada, dias, arquivoMes: v.mes }); }
          }}
          onBlur={() => setTexto((p) => { const n = { ...p }; delete n[arquivo.id]; return n; })}
          className={`h-8 w-20 text-center tabular-nums font-bold ${texto[arquivo.id] !== undefined && texto[arquivo.id] !== "" && !lerDiaMes(texto[arquivo.id]) ? "border-destructive" : ""}`} />
        <span className="tabular-nums font-semibold">{arquivo.data}{arquivo.ajustado ? " *" : ""}</span>
      </div>
      <p className="text-sm" title="De = dia seguinte ao Último Dia, um mês antes; Até = Último Dia">
        <span className="font-semibold">Período:</span>{" "}
        <span className="tabular-nums">{periodo.de} a {periodo.ate}</span>
      </p>
      <div className="max-w-3xl overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-secondary-foreground">
              <th className="px-3 py-2 text-left font-semibold">VARIÁVEL</th>
              <th className="px-3 py-2 text-right font-semibold">REFERÊNCIA</th>
              <th className="px-3 py-2 text-right font-semibold">DATA</th>
              <th className="px-3 py-2 text-right font-semibold" title="Dias corridos: Fechamento desde o Arquivo; Dare, DIOPS e Pagamento desde o Fechamento">PRAZO</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <Fragment key={l.id}>
              <tr className={`border-b border-border ${l.separadorAntes ? "border-t-2 border-t-foreground" : ""} ${l.destaque ? "font-bold" : ""}`}>
                <td className="px-3 py-1.5 uppercase">{l.rotulo}</td>
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
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{l.diasBase} <span className="text-xs font-normal text-muted-foreground">{Math.abs(l.diasBase) === 1 ? "dia" : "dias"} desde o {l.base}</span></td>
              </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="max-w-3xl overflow-hidden rounded-md border border-border">
        <div className="border-b border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">IMPACTOS</div>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {impactos.map((imp) => (
              <tr key={imp.id} className="border-b border-border align-top last:border-b-0">
                <td className="w-20 px-3 py-1.5 font-semibold">{imp.rotulo}</td>
                <td className="w-14 px-3 py-1.5 text-right tabular-nums">{imp.dias}</td>
                <td className={`w-36 whitespace-nowrap px-3 py-1.5 font-semibold ${imp.nivel === "critico" ? "text-destructive" : imp.nivel === "ok" ? "text-muted-foreground" : "text-foreground"}`}>{imp.status}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{imp.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
