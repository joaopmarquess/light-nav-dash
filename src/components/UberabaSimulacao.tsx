import { useMemo, useRef, useState } from 'react';
import { Calculator, Download, Printer, RotateCcw, Info, Users, TrendingUp, Wallet, BriefcaseBusiness } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calcularSimulacao, consolidarSimulacao, csvSimulacao, fontesSimulacao as fonte, indicadoresSimulacao as indicadores, inteiroSimulacao as int, numeroSimulacao as num, percentualSimulacao as pct, validarVidas, validarSinistralidade, sinistralidadePadrao, type ConfigSimulacao, type FinanceiroSimulacao, type ResultadoSimulacao } from '@/lib/uberabaSimulacao';

const nomes = ['PCA', 'PME', 'PCE 50 a 99', 'PCE 100+'];
function Tabela({ titulo, headers, rows, footer }: { titulo: string; headers: string[]; rows: (string | number)[][]; footer?: (string | number)[] }) {
  return <section className="sim-table-section"><h4>{titulo}</h4><div className="sim-table-scroll" tabIndex={0} aria-label={titulo}><table><thead><tr>{headers.map((h,i)=><th key={i} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{row.map((cell,i)=>i===0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>)}</tr>)}</tbody>{footer && <tfoot><tr>{footer.map((cell,i)=><td key={i}>{cell}</td>)}</tr></tfoot>}</table></div></section>;
}
function Financeiro({ mensal, anual, titulo }: { mensal: FinanceiroSimulacao[]; anual: FinanceiroSimulacao; titulo: string }) {
  return <Tabela titulo={titulo} headers={['Indicador',...fonte.meses.map(m=>m.mes.slice(0,3)), 'Anual / final']} rows={indicadores.map(i=>[i.label,...mensal.map(m=>i.integer ? int(m[i.key]) : num(m[i.key])),i.integer ? int(anual[i.key]) : num(anual[i.key])])} />;
}
function PremissasCalculo() {
  return <details className="sim-assumptions"><summary>Premissas do cálculo</summary><ul>
    <li>Vidas arredondadas por mês; dezembro recebe o saldo residual para fechar o total anual. Em cada mês, a faixa 10 recebe o residual para fechar as vidas do mês.</li>
    <li>Faturamento cumulativo: receita das novas vidas somada ao faturamento do mês anterior, sem cancelamentos ou reajustes. O faturamento anual soma os 12 faturamentos cumulativos.</li>
    <li>Despesa Assistencial = faturamento cumulativo × Sinistralidade informada para cada modalidade. O consolidado soma as despesas das modalidades; não altera as participações comerciais.</li>
    <li>Participações da Lancers, da SIGA e do Bensaúde aplicadas ao faturamento cumulativo, conforme condição selecionada.</li>
    <li>Agenciamento sobre a receita de novas vidas, com cinco parcelas aplicadas no mês da venda e nos quatro meses seguintes. O total anual considera somente pagamentos de janeiro a dezembro.</li>
    <li>Taxa de adesão sobre a receita das novas vidas. Custo comercial = agenciamento + taxa de adesão; não é descontado da participação do Bensaúde.</li>
    <li>Mensalidade média ponderada pela distribuição efetiva anual, após arredondamentos. Vidas acumuladas anuais representam o saldo de dezembro, não a soma mensal.</li>
    <li>Fonte: CSVs fornecidos em 26/10/2026. Simulação de proposta comercial, não aprovação ou resultado realizado. Acomodação: Enfermaria.</li>
  </ul></details>;
}
function ResultadoFinal({ resultados }: { resultados: ResultadoSimulacao[] }) {
  const total = consolidarSimulacao(resultados);
  const cards = [
    { label: 'Vidas totais', value: int(total.anual.vidas), icon: Users },
    { label: 'Faturamento anual', value: num(total.anual.faturamento), icon: TrendingUp },
    { label: 'Receita do Bensaúde', value: num(total.anual.bensaude), icon: Wallet },
    { label: 'Custo comercial', value: num(total.anual.agenciamento+total.anual.adesao), icon: BriefcaseBusiness },
  ];
  return <div className="sim-final"><h3>Resultado Final</h3><div className="sim-kpis">{cards.map(({label,value,icon:Icon})=><div className="sim-kpi" key={label}><Icon aria-hidden="true" /><p>{label}</p><strong>{value}</strong></div>)}</div>
    <Tabela titulo="Cenários selecionados" headers={['Modalidade','Tabela de preço','Condição comercial','Total de vidas','Mensalidade média ponderada','Sinistralidade']} rows={resultados.map(r=>[r.produto.produto_nome,r.config.tabela_preco,r.config.condicao_comercial,int(r.config.total_vidas),num(r.media),pct((r.config.sinistralidade_percentual ?? sinistralidadePadrao)/100)])} />
    <Tabela titulo="Resultado entre as Partes (anual)" headers={['Modalidade','Bensaúde','SIGA','Lancers']} rows={resultados.map((r,i)=>[nomes[i],num(r.anual.bensaude),num(r.anual.siga),num(r.anual.lancers)])} footer={['Total',num(total.anual.bensaude),num(total.anual.siga),num(total.anual.lancers)]} />
    <Financeiro titulo="Visão mensal consolidada" mensal={total.mensal} anual={total.anual} />
    <Tabela titulo="Resultado anual por modalidade" headers={['Modalidade','Vidas','Faturamento','Despesa Assistencial','Lancers','SIGA','Bensaúde','Agenciamento SIGA','Taxa de adesão','Custo comercial']} rows={resultados.map((r,i)=>[nomes[i],int(r.anual.vidas),num(r.anual.faturamento),num(r.anual.despesa_assistencial),num(r.anual.lancers),num(r.anual.siga),num(r.anual.bensaude),num(r.anual.agenciamento),num(r.anual.adesao),num(r.anual.agenciamento+r.anual.adesao)])} footer={['Total',int(total.anual.vidas),num(total.anual.faturamento),num(total.anual.despesa_assistencial),num(total.anual.lancers),num(total.anual.siga),num(total.anual.bensaude),num(total.anual.agenciamento),num(total.anual.adesao),num(total.anual.agenciamento+total.anual.adesao)]} />
    <PremissasCalculo />
  </div>;
}
function PremissasImportadas() {
  return <div className="space-y-5"><h3>Premissas importadas · somente leitura</h3>
    <Tabela titulo="Modalidades · produtos.csv" headers={['Código','Modalidade','Acomodação','Ativo']} rows={fonte.produtos.map(p=>[p.produto_codigo,p.produto_nome,p.acomodacao,p.ativo?'Sim':'Não'])} />
    <Tabela titulo="Preços · precos_enfermaria.csv" headers={['Modalidade','Faixa etária','Bensaúde','SIGA']} rows={fonte.precos.map(p=>[p.produto_codigo,p.faixa_etaria,num(p.preco_bensaude),num(p.preco_siga)])} />
    <Tabela titulo="Condições · condicoes_comerciais.csv" headers={['Modalidade','Condição','Lancers','SIGA','Bensaúde','Parcela 1','Parcela 2','Parcela 3','Parcela 4','Parcela 5','Adesão']} rows={fonte.condicoes.map(c=>[c.produto_codigo,c.condicao,...[c.participacao_lancers,c.participacao_siga,c.participacao_bensaude,c.agenciamento_parcela_1,c.agenciamento_parcela_2,c.agenciamento_parcela_3,c.agenciamento_parcela_4,c.agenciamento_parcela_5,c.taxa_adesao].map(pct)])} />
    <div className="grid gap-5 lg:grid-cols-2"><Tabela titulo="Distribuição mensal · distribuicao_mensal.csv" headers={['Mês','Percentual anual']} rows={fonte.meses.map(m=>[m.mes,pct(m.percentual_anual)])} /><Tabela titulo="Distribuição etária · distribuicao_faixa_etaria.csv" headers={['Faixa etária','Percentual normalizado']} rows={fonte.faixas.map(f=>[f.faixa_etaria,pct(f.percentual_normalizado)])} /></div>
    <Tabela titulo="Configuração padrão · configuracao_padrao.csv" headers={['Modalidade','Tabela','Condição','Vidas']} rows={fonte.padroes.map(c=>[c.produto_codigo,c.tabela_preco,c.condicao_comercial,int(c.total_vidas)])} />
    <PremissasCalculo />
  </div>;
}
export default function UberabaSimulacao() {
  const [configuracoes,setConfiguracoes] = useState<ConfigSimulacao[]>(()=>fonte.padroes.map(c=>({...c,sinistralidade_percentual:sinistralidadePadrao})));
  const [aba,setAba] = useState('final');
  const [erro,setErro] = useState('');
  const [vidaText,setVidaText] = useState<Record<string,string>>({});
  const [sinText,setSinText] = useState<Record<string,string>>({});
  const impressao = useRef<HTMLDivElement>(null);
  const resultados = useMemo(()=>configuracoes.map(calcularSimulacao),[configuracoes]);
  const selecionado = resultados.find(r=>r.config.produto_codigo===aba);
  const alterar = (codigo: string, patch: Partial<ConfigSimulacao>) => setConfiguracoes(prev=>prev.map(c=>c.produto_codigo===codigo ? {...c,...patch} : c));
  const exportar = () => {
    const url = URL.createObjectURL(new Blob([csvSimulacao(resultados)],{type:'text/csv;charset=utf-8;'}));
    const link = document.createElement('a'); link.href=url; link.download='Simulacao_Bensaude_Uberaba.csv'; link.click(); URL.revokeObjectURL(url);
  };
  const imprimir = () => {
    const content = impressao.current;
    if (!content) return;
    const popup = window.open('','_blank','width=1200,height=850');
    if (!popup) { setErro('Permita abrir a janela de impressão para imprimir o Resultado Final.'); return; }
    const estilos = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(el=>el.outerHTML).join('');
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><title>Resultado Final — Bensaúde|Uberaba</title>${estilos}<style>@page{size:A3 landscape;margin:10mm}body{padding:15px}.sim-table-scroll{overflow:visible!important;max-height:none!important}.sim-table-scroll table{min-width:0!important;width:100%;font-size:9px}.sim-table-scroll th,.sim-table-scroll td{padding:6px}.sim-table-section{break-inside:avoid}.sim-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}details ul{display:block}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body><main class="uberaba-simulation"><h2>Simulador Comercial Bensaúde|Uberaba</h2>${content.innerHTML}</main></body></html>`);
    popup.document.close(); popup.document.querySelectorAll('details').forEach(el=>el.open=true);
    popup.setTimeout(()=>{popup.focus();popup.print();},500);
  };
  return <article className="uberaba-simulation" aria-label="Simulador Comercial Bensaúde|Uberaba">
    <header className="sim-heading"><div><h2><Calculator />Simulador Comercial Bensaúde|Uberaba</h2><p>Enfermaria · Proposta comercial · Fonte: CSVs fornecidos em 26/10/2026</p></div><div className="flex gap-2"><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Exportar cenário para CSV" onClick={exportar}><Download /></Button></TooltipTrigger><TooltipContent>Exportar cenário atual para CSV</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Imprimir Resultado Final" onClick={imprimir}><Printer /></Button></TooltipTrigger><TooltipContent>Imprimir Resultado Final</TooltipContent></Tooltip></div></header>
    <nav className="sim-tabs" aria-label="Modalidades da Simulação"><Button variant={aba==='final'?'default':'outline'} aria-pressed={aba==='final'} onClick={()=>setAba('final')}>Resultado Final</Button>{fonte.produtos.map((p,i)=><Button key={p.produto_codigo} variant={aba===p.produto_codigo?'default':'outline'} aria-pressed={aba===p.produto_codigo} onClick={()=>setAba(p.produto_codigo)}>{nomes[i]}</Button>)}<Button variant={aba==='premissas'?'default':'outline'} aria-pressed={aba==='premissas'} onClick={()=>setAba('premissas')}><Info />Premissas</Button></nav>
    {erro && <p role="alert" className="text-destructive">{erro}</p>}
    {selecionado && <div className="space-y-5"><h3>{selecionado.produto.produto_nome}</h3><div className="sim-controls">
      <label>Tabela de preço<Select value={selecionado.config.tabela_preco} onValueChange={v=>alterar(aba,{tabela_preco:v})}><SelectTrigger aria-label="Tabela de preço" className="sim-editable"><SelectValue /></SelectTrigger><SelectContent>{['Bensaúde','SIGA'].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></label>
      <label>Condição comercial<Select value={selecionado.config.condicao_comercial} onValueChange={v=>alterar(aba,{condicao_comercial:v})}><SelectTrigger aria-label="Condição comercial" className="sim-editable"><SelectValue /></SelectTrigger><SelectContent>{fonte.condicoes.filter(c=>c.produto_codigo===aba).map(c=><SelectItem key={c.condicao} value={c.condicao}>{c.condicao}</SelectItem>)}</SelectContent></Select></label>
      <label>Total de vidas<Input aria-label="Total de vidas" className="sim-editable" type="number" min={1} max={100000} step={1} value={vidaText[aba] ?? selecionado.config.total_vidas} aria-invalid={!validarVidas(Number(vidaText[aba] ?? selecionado.config.total_vidas))} onChange={e=>{const v=e.target.value;setVidaText(p=>({...p,[aba]:v}));if(validarVidas(Number(v))) alterar(aba,{total_vidas:Number(v)});}} onBlur={()=>setVidaText(p=>({...p,[aba]:String(selecionado.config.total_vidas)}))} />{!validarVidas(Number(vidaText[aba] ?? selecionado.config.total_vidas)) && <span className="text-destructive">Informe um inteiro entre 1 e 100.000; mantido o último cenário válido.</span>}</label>
      <label>Sinistralidade (%)<Input aria-label="Sinistralidade (%)" className="sim-editable" type="text" inputMode="decimal" placeholder="Informe o percentual" value={sinText[aba] ?? selecionado.config.sinistralidade_percentual ?? sinistralidadePadrao} aria-invalid={sinText[aba] !== undefined && (sinText[aba].trim()==='' || !validarSinistralidade(Number(sinText[aba].replace(',','.'))))} onChange={e=>{const v=e.target.value;setSinText(p=>({...p,[aba]:v}));const percentual=Number(v.replace(',','.'));if(v.trim()!=='' && validarSinistralidade(percentual)) alterar(aba,{sinistralidade_percentual:percentual});}} onBlur={()=>setSinText(p=>({...p,[aba]:String(selecionado.config.sinistralidade_percentual ?? sinistralidadePadrao)}))} /></label>
      <Button variant="outline" onClick={()=>{const original=fonte.padroes.find(c=>c.produto_codigo===aba);if(original){alterar(aba,{...original,sinistralidade_percentual:sinistralidadePadrao});setSinText(p=>({...p,[aba]:String(sinistralidadePadrao)}));setVidaText(p=>({...p,[aba]:String(original.total_vidas)}));}}}><RotateCcw />Restaurar configuração padrão</Button>
    </div>
    {!selecionado.participacoesValidas && <p role="alert" className="text-destructive">As participações não somam 100%.</p>}
    {selecionado.residualNegativo && <p role="alert" className="text-destructive">O arredondamento solicitado gerou residual negativo na faixa 10. Resultado mantido conforme regra dos CSVs; revise a quantidade de vidas.</p>}
    <div className="sim-participations"><span>Lancers <strong>{pct(selecionado.condicao.participacao_lancers)}</strong></span><span>SIGA <strong>{pct(selecionado.condicao.participacao_siga)}</strong></span><span>Bensaúde <strong>{pct(selecionado.condicao.participacao_bensaude)}</strong></span><span>Mensalidade média <strong>{num(selecionado.media)}</strong></span></div>
    <Tabela titulo="Distribuição de vidas por faixa etária" headers={['Faixa etária',...fonte.meses.map(m=>m.mes.slice(0,3)),'Total anual','% efetivo','Mensalidade']} rows={fonte.faixas.map((f,i)=>[f.faixa_etaria,...selecionado.faixasMes.map(m=>int(m[i])),int(selecionado.faixaAnual[i]),pct(selecionado.faixaAnual[i]/selecionado.config.total_vidas),num(selecionado.mensalidades[i])])} footer={['Total',...selecionado.vidasMes.map(int),int(selecionado.config.total_vidas),pct(1),num(selecionado.media)]} />
    <Financeiro titulo="Resumo financeiro mensal" mensal={selecionado.mensal} anual={selecionado.anual} /><PremissasCalculo /></div>}
    {aba==='premissas' && <PremissasImportadas />}
    <div ref={impressao} hidden={aba!=='final'}><ResultadoFinal resultados={resultados} /></div>
  </article>;
}