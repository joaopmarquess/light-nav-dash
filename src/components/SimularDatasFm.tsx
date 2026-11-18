import { Fragment, useState } from "react";
import { Input } from "@/components/ui/input";
import { DIAS_PADRAO, carregarDatasFm, lerInteiro, salvarDatasFm, simularDatasFm, type EntradaDatasFm, type IdDataFm } from "@/lib/simularDatasFm";

// Laboratory › Simular Datas FM: Competência (mês/ano) e o dia de cada linha, com a data calculada; valores digitados ficam neste navegador.
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
  const cls = "h-8 w-20 text-right tabular-nums";
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Simular Datas FM</h1>
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
            <tr className="border-b border-border">
              <td className="px-3 py-1.5">Competência</td>
              <td className="px-3 py-1.5"><Input aria-label="Mês da competência" inputMode="numeric" className={`ml-auto ${cls}`}
                {...campo("mes", entrada.mes, 1, 12, (v) => gravar({ ...entrada, mes: v ?? 12 }))} /></td>
              <td className="px-3 py-1.5"><Input aria-label="Ano da competência" inputMode="numeric" className={`ml-auto ${cls}`}
                {...campo("ano", entrada.ano, 2000, 2100, (v) => v !== undefined && gravar({ ...entrada, ano: v }))} /></td>
            </tr>
            {linhas.map((l) => (
              <Fragment key={l.id}>
              {l.id === "arquivo" && (
                <tr className="border-b border-border">
                  <td className="px-3 py-1.5">Dias</td>
                  <td className="px-3 py-1.5">
                    <Input aria-label="Dias" inputMode="numeric" title="Apague para restaurar o padrão" className={`ml-auto ${cls}`}
                      {...campo("qtdDias", entrada.qtdDias ?? DIAS_PADRAO, 0, 365, (v) => { const { qtdDias: _, ...resto } = entrada; gravar(v === undefined ? resto : { ...resto, qtdDias: v }); })} />
                  </td>
                  <td />
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
