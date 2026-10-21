import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, List, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GRUPOS_CREDENCIAMENTO, RESUMO_CREDENCIAMENTO, moedaCredenciamento, projetarCredenciamento, referenciasCredenciamento, type GrupoCredenciamento, type ReferenciaCredenciamento } from "@/lib/uberabaCredenciamento";

type Ordenacao = "nome" | "quantidade" | "valor";
export default function UberabaRedeAssistencial({ referencias = referenciasCredenciamento }: { referencias?: ReferenciaCredenciamento[] }) {
  const inicio = useRef<HTMLElement>(null);
  const detalhes = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState<GrupoCredenciamento | null>(null);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordenacao>("nome");
  const [desc, setDesc] = useState(false);
  useEffect(() => { inicio.current?.scrollIntoView({ block: "start" }); }, []);
  const abrir = (grupo: GrupoCredenciamento) => {
    setAberto(grupo); setBusca(""); setOrdem("nome"); setDesc(false);
    requestAnimationFrame(() => detalhes.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  const ordenar = (campo: Ordenacao) => { setDesc(ordem === campo ? !desc : false); setOrdem(campo); };
  const voltar = () => { setAberto(null); inicio.current?.scrollIntoView({ block: "start", behavior: "smooth" }); };
  const linhas = referencias.filter((r) => r.grupo === aberto && r.especialidade_categoria.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))).map(projetarCredenciamento).sort((a, b) => {
    const comparacao = ordem === "nome" ? a.especialidade_categoria.localeCompare(b.especialidade_categoria, "pt-BR") : ordem === "quantidade" ? a.quantidade_considerada - b.quantidade_considerada : a.valor_projetado - b.valor_projetado;
    return comparacao * (desc ? -1 : 1);
  });
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
            <p className="credenciamento-secondary flex-1 px-4 text-sm leading-5">{grupo.explicacao}</p>
            <div className="p-4"><Button variant="outline" size="sm" onClick={() => abrir(grupo.id)} aria-expanded={aberto === grupo.id}><List className="mr-2 h-4 w-4" />Ver detalhamento<span className="sr-only">: {grupo.titulo}</span></Button></div>
          </article>
        ))}
      </div>
      <div className="credenciamento-summary grid gap-4 rounded-lg px-4 py-4 text-center sm:grid-cols-3">
        {[["TOTAL DE ESPECIALIDADES E CATEGORIAS", RESUMO_CREDENCIAMENTO.categorias], ["TOTAL DE REFERÊNCIAS DISPONÍVEIS", RESUMO_CREDENCIAMENTO.quantidade], ["VALOR MÁXIMO PROJETADO", moedaCredenciamento(RESUMO_CREDENCIAMENTO.total)]].map(([label, valor]) => <div key={label}><p className="text-sm font-medium">{label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{valor}</p></div>)}
      </div>
      <div ref={detalhes} className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold uppercase">Detalhamento por especialidade</h3>{aberto && <Button variant="outline" size="sm" onClick={voltar}><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao resumo</Button>}</div>
        {GRUPOS_CREDENCIAMENTO.map((grupo) => <div key={grupo.id} className="border-b border-border">
          <Button variant="ghost" className="h-auto w-full justify-between whitespace-normal py-2 text-left" onClick={() => aberto === grupo.id ? setAberto(null) : abrir(grupo.id)} aria-expanded={aberto === grupo.id} aria-controls={`detalhes-${grupo.id}`}>{grupo.titulo}{aberto === grupo.id ? <ChevronUp className="ml-2 h-4 w-4 shrink-0" /> : <ChevronDown className="ml-2 h-4 w-4 shrink-0" />}</Button>
          {aberto === grupo.id && <div id={`detalhes-${grupo.id}`} className="space-y-3 pb-4">
            <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar especialidade ou serviço" aria-label="Pesquisar especialidade ou serviço" /></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm"><thead><tr>
              <th className="text-left" aria-sort={ordem === "nome" ? desc ? "descending" : "ascending" : "none"}><Button variant="ghost" size="sm" onClick={() => ordenar("nome")}>ESPECIALIDADE / CATEGORIA<ArrowUpDown className="ml-2 h-4 w-4" /></Button></th>
              <th className="p-2">EVO</th><th className="p-2">UNIMED</th>
              <th aria-sort={ordem === "quantidade" ? desc ? "descending" : "ascending" : "none"}><Button variant="ghost" size="sm" onClick={() => ordenar("quantidade")}>QUANTIDADE CONSIDERADA<ArrowUpDown className="ml-2 h-4 w-4" /></Button></th>
              <th className="p-2">VALOR UNITÁRIO</th><th aria-sort={ordem === "valor" ? desc ? "descending" : "ascending" : "none"}><Button variant="ghost" size="sm" onClick={() => ordenar("valor")}>VALOR PROJETADO<ArrowUpDown className="ml-2 h-4 w-4" /></Button></th>
            </tr></thead><tbody>{linhas.length ? linhas.map((r) => <tr key={r.especialidade_categoria}><th className="p-2 text-left font-medium">{r.especialidade_categoria}</th><td className="p-2 text-center">{r.quantidade_evo ?? "—"}</td><td className="p-2 text-center">{r.quantidade_unimed ?? "—"}</td><td className="p-2 text-center">{r.quantidade_considerada}{r.origem_quantidade === "Unimed" ? " (Unimed)" : ""}</td><td className="p-2 text-center">{moedaCredenciamento(r.valor_unitario)}</td><td className="p-2 text-center">{moedaCredenciamento(r.valor_projetado)}</td></tr>) : <tr><td colSpan={6} className="credenciamento-secondary p-4 text-center">{referencias.some((r) => r.grupo === grupo.id) ? "Nenhum resultado encontrado." : "Dados por especialidade não informados."}</td></tr>}</tbody></table></div>
          </div>}
        </div>)}
      </div>
      <p className="credenciamento-secondary text-sm leading-5">Os quantitativos apresentados representam disponibilidade identificada nas redes de referência e não equivalem a credenciamentos concluídos. A rede EVO foi utilizada como fonte principal e a Unimed como referência complementar nos casos em que não foi identificada disponibilidade na EVO. O pagamento dependerá da conclusão, aprovação e formalização de cada credenciamento pela Bensaúde.</p>
    </section>
  );
}