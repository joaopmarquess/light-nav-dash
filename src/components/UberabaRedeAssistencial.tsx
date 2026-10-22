import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cenarioCredenciamento, MODO_CREDENCIAMENTO_PADRAO, moedaCredenciamento, type ModoCredenciamento } from "@/lib/uberabaCredenciamento";

export default function UberabaRedeAssistencial() {
  const inicio = useRef<HTMLElement>(null);
  const [modo, setModo] = useState<ModoCredenciamento>(MODO_CREDENCIAMENTO_PADRAO);
  const { grupos, resumo } = cenarioCredenciamento(modo);
  return (
    <section ref={inicio} className="credenciamento modelo-rede space-y-4" aria-labelledby="credenciamento-titulo">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
        <h3 id="credenciamento-titulo" className="text-xl font-bold">Rede Assistencial</h3>
        <p className="credenciamento-secondary text-base">{modo === "Limite" ? "Limite de referências e valor máximo projetado" : modo === "Rio Preto" ? "Disponibilidade em Rio Preto" : "Disponibilidade identificada e valor máximo projetado"}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Cenário de credenciamento">
          {(["Disponível", "Limite", "Rio Preto"] as const).map((opcao) => <Button key={opcao} size="sm" variant={modo === opcao ? "default" : "outline"} aria-pressed={modo === opcao} onClick={() => setModo(opcao)}>{opcao}</Button>)}
        </div>
      </header>
      <div className="modelo-rede-grid">
        {grupos.map((grupo) => (
          <article key={grupo.id} data-grupo={grupo.id} className="credenciamento-card flex min-w-0 flex-col overflow-hidden rounded-lg border">
            <div className={`credenciamento-stripe credenciamento-${grupo.id} h-2 shrink-0`} />
            <h3 className="flex min-h-20 items-center justify-center px-4 py-3 text-center text-lg font-bold uppercase">{grupo.titulo}</h3>
            <table className="w-full border-collapse text-base">
              <thead><tr><th className="px-3 py-2 text-left">INDICADOR</th><th className="px-3 py-2 text-center">QUANTIDADE / VALOR</th></tr></thead>
              <tbody>{[[grupo.indicador, grupo.categorias], [modo === "Limite" ? "Quantidade limite" : "Quantidade disponível", grupo.quantidade], ["Valor por credenciamento", moedaCredenciamento(grupo.valor)], ["Memória de cálculo", grupo.valor === null ? "-" : `${grupo.quantidade} × ${moedaCredenciamento(grupo.valor)}`]].map(([label, valor]) => <tr key={label}><th className="px-3 py-2 text-left font-medium">{label}</th><td className="px-3 py-2 text-center tabular-nums">{valor}</td></tr>)}</tbody>
            </table>
            <div className="px-4 py-3 text-center"><p className="credenciamento-secondary text-sm font-semibold">VALOR MÁXIMO PROJETADO</p><p className="mt-1 text-3xl font-bold tabular-nums">{moedaCredenciamento(grupo.total)}</p></div>
            <p className="credenciamento-secondary flex-1 px-4 pb-4 text-sm leading-5">{grupo.explicacao}</p>
          </article>
        ))}
      </div>
      <div className="credenciamento-summary grid gap-4 rounded-lg px-4 py-4 text-center sm:grid-cols-3">
        {[["TOTAL DE ESPECIALIDADES E CATEGORIAS", resumo.categorias], [modo === "Limite" ? "TOTAL DE REFERÊNCIAS NO LIMITE" : "TOTAL DE REFERÊNCIAS DISPONÍVEIS", resumo.quantidade], ["VALOR MÁXIMO PROJETADO", moedaCredenciamento(resumo.total)]].map(([label, valor]) => <div key={label}><p className="text-sm font-medium">{label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{valor}</p></div>)}
      </div>
      <p className="credenciamento-secondary text-sm leading-5">{modo === "Rio Preto" ? "Os quantitativos apresentados correspondem à disponibilidade informada em Rio Preto, utilizada como referência para o projeto. O pagamento dependerá da conclusão, aprovação e formalização de cada credenciamento pelo Bensaúde." : "Os quantitativos apresentados representam disponibilidade identificada nas redes de referência e não equivalem a credenciamentos concluídos. A rede EVO foi utilizada como fonte principal e a Unimed como referência complementar nos casos em que não foi identificada disponibilidade na EVO. O pagamento dependerá da conclusão, aprovação e formalização de cada credenciamento pelo Bensaúde."}</p>
    </section>
  );
}