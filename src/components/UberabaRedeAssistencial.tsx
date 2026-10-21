import { useEffect, useRef } from "react";
import { GRUPOS_CREDENCIAMENTO, RESUMO_CREDENCIAMENTO, moedaCredenciamento } from "@/lib/uberabaCredenciamento";

export default function UberabaRedeAssistencial() {
  const inicio = useRef<HTMLElement>(null);
  useEffect(() => { inicio.current?.scrollIntoView({ block: "start" }); }, []);
  return (
    <section ref={inicio} className="credenciamento space-y-4 rounded-lg p-3" aria-labelledby="credenciamento-titulo">
      <header>
        <h2 id="credenciamento-titulo" className="text-xl font-bold uppercase">Modelo de Credenciamento</h2>
        <p className="credenciamento-secondary text-base">Disponibilidade identificada e valor máximo projetado</p>
      </header>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {GRUPOS_CREDENCIAMENTO.map((grupo) => (
          <article key={grupo.id} data-grupo={grupo.id} className="credenciamento-card flex w-[90%] shrink-0 snap-center flex-col overflow-hidden rounded-lg border sm:w-auto">
            <div className={`credenciamento-stripe credenciamento-${grupo.id} h-2 shrink-0`} />
            <h3 className="flex min-h-20 items-center justify-center px-4 py-3 text-center text-lg font-bold uppercase">{grupo.titulo}</h3>
            <table className="w-full border-collapse text-base">
              <thead><tr><th className="px-3 py-2 text-left">INDICADOR</th><th className="px-3 py-2 text-center">QUANTIDADE / VALOR</th></tr></thead>
              <tbody>{[[grupo.indicador, grupo.categorias], ["Quantidade disponível", grupo.quantidade], ["Valor por credenciamento", moedaCredenciamento(grupo.valor)], ["Memória de cálculo", `${grupo.quantidade} × ${moedaCredenciamento(grupo.valor)}`]].map(([label, valor]) => <tr key={label}><th className="px-3 py-2 text-left font-medium">{label}</th><td className="px-3 py-2 text-center tabular-nums">{valor}</td></tr>)}</tbody>
            </table>
            <div className="px-4 py-3 text-center"><p className="credenciamento-secondary text-sm font-semibold">VALOR MÁXIMO PROJETADO</p><p className="mt-1 text-3xl font-bold tabular-nums">{moedaCredenciamento(grupo.total)}</p></div>
            <p className="credenciamento-secondary flex-1 px-4 pb-4 text-sm leading-5">{grupo.explicacao}</p>
          </article>
        ))}
      </div>
      <div className="credenciamento-summary grid gap-4 rounded-lg px-4 py-4 text-center sm:grid-cols-3">
        {[["TOTAL DE ESPECIALIDADES E CATEGORIAS", RESUMO_CREDENCIAMENTO.categorias], ["TOTAL DE REFERÊNCIAS DISPONÍVEIS", RESUMO_CREDENCIAMENTO.quantidade], ["VALOR MÁXIMO PROJETADO", moedaCredenciamento(RESUMO_CREDENCIAMENTO.total)]].map(([label, valor]) => <div key={label}><p className="text-sm font-medium">{label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{valor}</p></div>)}
      </div>
      <p className="credenciamento-secondary text-sm leading-5">Os quantitativos apresentados representam disponibilidade identificada nas redes de referência e não equivalem a credenciamentos concluídos. A rede EVO foi utilizada como fonte principal e a Unimed como referência complementar nos casos em que não foi identificada disponibilidade na EVO. O pagamento dependerá da conclusão, aprovação e formalização de cada credenciamento pela Bensaúde.</p>
    </section>
  );
}