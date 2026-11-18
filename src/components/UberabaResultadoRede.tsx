import { useEffect, useState } from "react";
import { EVENTO_CREDENCIAMENTO, carregarAutorizados, carregarValores, linhasQuantidadeCredenciamentos } from "@/lib/uberabaQuantidadeCredenciamentos";
import { EVENTO_PARAMETROS_REDE, carregarParametrosRede, parametrosRede } from "@/lib/uberabaParametrosRede";
import { EVENTO_VIDAS_SIMULACAO, lerVidasSimulacao, resultadoRede } from "@/lib/uberabaResultadoRede";

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inteiro = (v: number) => v.toLocaleString("pt-BR");

const ler = () => ({
  adesao: linhasQuantidadeCredenciamentos(carregarAutorizados(), carregarValores()).total.adesao,
  parametros: parametrosRede(carregarParametrosRede()),
  vidas: lerVidasSimulacao(),
});

// Resultado de Resultados Rede: Mês · Adesão · Mensalidade · Total, relido a cada alteração do Credenciamento, dos Parâmetros ou das vidas da simulação.
export default function UberabaResultadoRede() {
  const [dados, setDados] = useState(ler);
  useEffect(() => {
    const atualizar = () => setDados(ler());
    const eventos = [EVENTO_CREDENCIAMENTO, EVENTO_PARAMETROS_REDE, EVENTO_VIDAS_SIMULACAO];
    eventos.forEach((e) => window.addEventListener(e, atualizar));
    return () => eventos.forEach((e) => window.removeEventListener(e, atualizar));
  }, []);
  const { linhas, total } = resultadoRede(dados.adesao, dados.parametros, dados.vidas);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-semibold">MÊS</th>
            <th className="px-3 py-2 text-right font-semibold">ADESÃO</th>
            <th className="px-3 py-2 text-right font-semibold">MENSALIDADE</th>
            <th className="px-3 py-2 text-right font-semibold">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.mes} className="border-b border-border">
              <td className="px-3 py-1.5 tabular-nums">{l.mes}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{moeda(l.adesao)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums"
                title={l.parcelaFixa ? "Parcela fixa (Valor Parcela)" : `${moeda(dados.parametros.valorPorVida)} × ${inteiro(l.vidasAcumuladas)} vidas vendidas acumuladas`}>
                {moeda(l.mensalidade)}
              </td>
              <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{moeda(l.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="px-3 py-2">TOTAL</td>
            <td className="px-3 py-2 text-right tabular-nums">{moeda(total.adesao)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{moeda(total.mensalidade)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{moeda(total.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
