import { useState } from "react";
import { BarChart3, BriefcaseBusiness, CircleDollarSign, FileText, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FAIXAS_LANCERS, LANCERS_PREMISSAS, LANCERS_SOURCES, OPORTUNIDADES_LANCERS, formatarLancers, moedaLancers, precosLancers, rankingLancers, totalPotencialLancers, type Accommodation, type LancersTable } from "@/lib/uberabaLancers";
import "./UberabaDados.css";

type View = "mercado" | "precos" | "oportunidades" | "premissas";
type Reference = { title: string; table?: LancersTable; text?: string };
const views = [
  { id: "mercado", label: "Mercado", icon: Users },
  { id: "precos", label: "Preços", icon: CircleDollarSign },
  { id: "oportunidades", label: "Oportunidades", icon: BriefcaseBusiness },
  { id: "premissas", label: "Premissas", icon: ShieldAlert },
] as const;

function Table({ table }: { table: LancersTable }) {
  return <table className="study-data-table"><thead><tr>{table.headers.map((header, i) => <th scope="col" key={i}>{header}</th>)}</tr></thead><tbody>{table.rows.map((row, i) => <tr key={i} className={row[0]?.startsWith("★") ? "data-reference" : ""}>{row.map((cell, j) => j === 0 ? <th scope="row" key={j}>{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table>;
}
function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return <section className="study-data-kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></section>;
}
function Notice({ children }: { children: React.ReactNode }) {
  return <aside className="study-data-notice"><ShieldAlert aria-hidden="true" /><div>{children}</div></aside>;
}

export default function UberabaDados() {
  const [view, setView] = useState<View>("mercado");
  const [accommodation, setAccommodation] = useState<Accommodation>("enfermaria");
  const [age, setAge] = useState("0");
  const [scenario, setScenario] = useState<"conservador" | "base">("conservador");
  const [reference, setReference] = useState<Reference | null>(null);
  const [source, setSource] = useState<"mercado" | "precos">("mercado");
  const [sourceTable, setSourceTable] = useState("0");
  const products = precosLancers(accommodation);
  const referencePrice = products[0]?.valores[Number(age)] ?? 0;
  const openTable = (table: LancersTable) => setReference({ title: table.title, table });
  const sections = LANCERS_SOURCES[source].sections;
  return <article className="study-data" aria-label="Dados do Estudo">
    <div className="study-data-heading"><div><h3>Dados · leitura de mercado</h3><p>Lancers · estudo conceitual · ANS ago/2026 e preços consultados em 08/10/2026</p></div><div role="group" aria-label="Telas de Dados" className="flex flex-wrap gap-2">{views.map(({ id, label, icon: Icon }) => <Button key={id} variant={view === id ? "default" : "outline"} aria-pressed={view === id} onClick={() => setView(id)}><Icon className="h-4 w-4" />{label}</Button>)}</div></div>
    {view === "mercado" && <>
      <div className="study-data-kpis"><Kpi label="Mercado do estudo" value="514.465" note="Vidas médico-hospitalares · 20 municípios" /><Kpi label="Uberaba" value="141.122" note="39,3% de penetração · 359.275 habitantes" /><Kpi label="Empresarial em Uberaba" value="76,2%" note="107.588 vidas · principal frente de mercado" /><Kpi label="Bensaúde no universo" value="4.611" note="0,90% de participação · 4.625 vidas em MG" /></div>
      <div className="study-data-columns"><section className="study-data-section"><h4>Território e sequência de entrada</h4><Table table={{ title: "Lâminas do estudo", headers: ["Frente", "Mercado", "Bensaúde", "Leitura"], rows: [["L1 · Uberaba + 8 limítrofes", "166.731", "3", "Praça nova e entorno"], ["L2 · Uberlândia", "292.511", "1", "Segundo momento; fora das metas"], ["L3 · Triângulo com presença", "55.223", "4.607", "Consolidar a presença regional"]] }} /><p className="mt-4">O recorte L1 exclui Uberlândia, embora seja limítrofe: a cidade aparece separada em L2. Os três recortes formam o universo de 20 municípios, sem modificar a Área do projeto.</p></section><section className="study-data-section"><h4>Composição da praça de Uberaba</h4><Table table={{ title: "Modalidades Uberaba", headers: ["Modalidade", "Vidas", "Participação"], rows: [["Empresarial", "107.588", "76,2%"], ["Individual", "20.893", "14,8%"], ["Adesão", "12.627", "8,9%"]] }} /><p className="mt-4">A Unimed Uberaba concentra 55,5% da praça; o grupo Hapvida/NotreDame, 17,3%. O Bensaúde registra 2 vidas no município na base ANS do anexo.</p></section></div>
      <Notice>Os dados são do relatório Lancers, não da carteira atual do AXIS. As modalidades não esgotam o total: o anexo registra contratação não identificada. O crescimento de adesão em ago/2026 inclui migração entre produtos, não apenas vendas.</Notice>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openTable(LANCERS_SOURCES.mercado.tables[7])}><BarChart3 />Municípios</Button><Button variant="outline" onClick={() => openTable(LANCERS_SOURCES.mercado.tables[1])}>Território e renda</Button><Button variant="outline" onClick={() => openTable(LANCERS_SOURCES.mercado.tables[3])}>Emprego formal</Button><Button variant="outline" onClick={() => openTable(LANCERS_SOURCES.mercado.tables[8])}>Série histórica</Button></div>
    </>}
    {view === "precos" && <>
      <div className="study-data-price-controls"><div className="flex gap-2" role="group" aria-label="Acomodação">{(["enfermaria", "apartamento"] as const).map(value => <Button key={value} variant={accommodation === value ? "default" : "outline"} aria-pressed={accommodation === value} onClick={() => setAccommodation(value)}>{value === "enfermaria" ? "Enfermaria" : "Apartamento"}</Button>)}</div><label htmlFor="lancers-age" className="text-sm font-medium">Faixa etária</label><Select value={age} onValueChange={setAge}><SelectTrigger id="lancers-age" className="w-36"><SelectValue /></SelectTrigger><SelectContent>{FAIXAS_LANCERS.map((label, index) => <SelectItem key={label} value={String(index)}>{label} anos</SelectItem>)}</SelectContent></Select><span className="text-sm text-muted-foreground">Referência: {accommodation === "enfermaria" ? "Flex 50 Prata · Adesão" : "Flex 50 Ouro · PME"} · {rankingLancers(accommodation, Number(age))}º de 7 nesta faixa</span></div>
      <Notice><strong>Comparação histórica, não oferta vigente.</strong> Hapvida: promoção vencida em 30/09/2026. Bases de contratação distintas. Mensalidade não inclui o custo de utilização; rede, abrangência e carências do Bensaúde em Uberaba permanecem sujeitas à definição.</Notice>
      <div className="study-data-price-list">{products.filter((_, index) => index === 0 || index >= 3).map(product => {
        const price = product.valores[Number(age)] ?? 0;
        const difference = price > 0 ? (referencePrice / price - 1) * 100 : 0;
        const max = Math.max(...product.valores);
        return <section key={product.nome} className={`study-data-price ${product.referencia ? "reference" : ""}`}><h4>{product.nome}</h4><strong>{moedaLancers(price)}</strong><p>{product.contexto}</p><svg className="study-data-spark" viewBox="0 0 240 40" role="img" aria-label={`Evolução por idade: ${product.nome}`}><polyline className="study-data-price-line" points={product.valores.map((v, i) => `${i * 26.5},${38 - v / max * 34}`).join(" ")} /></svg><em>{product.referencia ? "Referência Bensaúde · por beneficiário/mês" : `O Bensaúde custa ${Math.abs(difference).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ${difference < 0 ? "menos" : "mais"} nesta faixa`}</em></section>;
      })}</div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openTable(LANCERS_SOURCES.precos.tables[accommodation === "enfermaria" ? 1 : 3])}><FileText />Tabela completa · 10 faixas</Button><Button variant="outline" onClick={() => openTable(LANCERS_SOURCES.precos.tables[4])}>Coparticipação</Button><Button variant="outline" onClick={() => setReference({ title: "Condições e método", text: LANCERS_SOURCES.precos.sections.filter(section => ["copart", "fontes"].includes(section.id)).map(section => section.text).join("\n\n") })}>Condições e método</Button></div>
    </>}
    {view === "oportunidades" && <>
      <div className="study-data-price-controls"><div role="group" aria-label="Cenário de oportunidades" className="flex gap-2"><Button variant={scenario === "conservador" ? "default" : "outline"} aria-pressed={scenario === "conservador"} onClick={() => setScenario("conservador")}>Conservador</Button><Button variant={scenario === "base" ? "default" : "outline"} aria-pressed={scenario === "base"} onClick={() => setScenario("base")}>Base</Button></div><p className="text-sm text-muted-foreground">Horizonte proposto: 24 meses · sujeito à validação</p></div>
      <div className="study-data-kpis"><Kpi label="Potencial adicional" value={`+${formatarLancers(totalPotencialLancers(scenario))}`} note="Vidas adicionais · quatro oportunidades" /><Kpi label="Sobre a carteira em MG" value={scenario === "conservador" ? "+42%" : "+130%"} note="Referência: 4.625 vidas · ANS ago/2026" /><Kpi label="Receita anual potencial" value={scenario === "conservador" ? "R$ 10,5 mi" : "R$ 32,4 mi"} note="Ordem de grandeza; não é lucro ou garantia" /><Kpi label="Receita média adotada" value="R$ 449,28" note="Por vida/mês · DIOPS ÷ VDA · H1/2026" /></div>
      <div className="study-data-opportunities">{OPORTUNIDADES_LANCERS.map(op => <section className="study-data-opportunity" key={op.id}><span className="text-sm font-semibold text-primary">{op.id}</span><h4>{op.titulo}</h4><p>{op.territorio}</p><strong>+{formatarLancers(op[scenario])}</strong><p>vidas potenciais adicionais</p><dl><div><dt>Mercado</dt><dd>{formatarLancers(op.mercado)}</dd></div><div><dt>Bensaúde na base</dt><dd>{op.hoje}</dd></div><div><dt>Metas cons. / base</dt><dd>{op.meta}</dd></div><div><dt>Receita/ano · R$ mi</dt><dd>{op.receita}</dd></div></dl></section>)}</div>
      <Notice>Metas sugeridas pela Lancers, não aprovadas pelo projeto. Exigem produto com Uberaba na área de comercialização e hospital âncora contratado. O PME do anexo não equivale automaticamente aos segmentos PCE 50 a 99 e PCE 100+ do projeto; Uberlândia não entra nestas metas.</Notice>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openTable(LANCERS_SOURCES.mercado.tables[27])}>Memória de cálculo</Button><Button variant="outline" onClick={() => openTable(LANCERS_SOURCES.mercado.tables[28])}>Ritmo mensal proposto</Button></div>
    </>}
    {view === "premissas" && <>
      <div className="study-data-premises">{LANCERS_PREMISSAS.map((premise, index) => <section className="study-data-premise" key={premise.titulo}><span className="text-sm text-muted-foreground">0{index + 1}</span><h4>{premise.titulo}</h4><p>{premise.texto}</p></section>)}</div>
      <div className="study-data-columns"><section className="study-data-section"><h4>Sustentabilidade da entrada</h4><Table table={{ title: "Indicadores financeiros", headers: ["Indicador", "2025", "1º semestre/2026"], rows: [["Sinistralidade", "92,9%", "96,5%"], ["Margem", "1,6%", "−2,6%"], ["Resultado", "R$ 5,70 mi", "−R$ 5,10 mi"], ["Despesa comercial / receita", "0,82%", "0,85%"]] }} /><p className="mt-4">A referência setorial de Medicina de Grupo é 76,3% de sinistralidade em 2025. O estudo recomenda avaliar preço, rede e canal em conjunto, sem pressupor espaço para descontos.</p></section><section className="study-data-section"><h4>Fontes e limites</h4><p>Mercado: ANS PDA-024, município de residência, cobertura médico-hospitalar, ago/2026. Finanças: DIOPS, acumulados anuais e semestrais. Território e emprego: IBGE, RAIS 2025 e Novo CAGED.</p><p className="mt-3">Preços: AGSI em 08/10/2026, Unimed set/2026, EVO jul/2026 e Hapvida promocional set/2026. VCM da NTRP é referência técnica, não preço cobrado. As fontes externas são citadas pelos anexos, sem nova verificação neste painel.</p></section></div>
      <div className="study-data-section"><h4>Referências dos anexos</h4><div className="flex flex-wrap gap-3"><Select value={source} onValueChange={value => { setSource(value as "mercado" | "precos"); setSourceTable("0"); }}><SelectTrigger className="w-60" aria-label="Anexo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mercado">Relatório de mercado</SelectItem><SelectItem value="precos">Comparativo de preços</SelectItem></SelectContent></Select><Select value={sourceTable} onValueChange={setSourceTable}><SelectTrigger className="w-full sm:w-96" aria-label="Tabela do anexo"><SelectValue /></SelectTrigger><SelectContent>{LANCERS_SOURCES[source].tables.map((table, index) => <SelectItem key={index} value={String(index)}>{index + 1}. {table.title}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => { const table = LANCERS_SOURCES[source].tables[Number(sourceTable)]; if (table) openTable(table); }}><FileText />Abrir tabela</Button><Button variant="outline" onClick={() => setReference({ title: source === "mercado" ? "Relatório de mercado · texto do anexo" : "Comparativo de preços · texto do anexo", text: sections.map(section => section.text).join("\n\n") })}>Texto do anexo</Button></div></div>
    </>}
    <p className="study-data-footnote">Material interno Lancers · recortes e datas próprios dos anexos · informações sujeitas à validação e formalização.</p>
    <Dialog open={reference !== null} onOpenChange={open => { if (!open) setReference(null); }}><DialogContent className="study-data-dialog"><DialogHeader><DialogTitle>{reference?.title}</DialogTitle><DialogDescription>Referência extraída dos HTMLs Lancers enviados · material interno de estudo.</DialogDescription></DialogHeader><div className="study-data-dialog-body">{reference?.table && <Table table={reference.table} />}{reference?.text && <p>{reference.text}</p>}</div></DialogContent></Dialog>
  </article>;
}