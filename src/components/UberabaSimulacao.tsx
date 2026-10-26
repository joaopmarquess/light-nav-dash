import { Fragment, useMemo, useRef, useState } from 'react';
import { Calculator, ChevronRight, Download, Printer, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calcularSimulacao, csvSimulacao, fontesSimulacao as fonte, inteiroSimulacao as int, numeroSimulacao as num, percentualSimulacao as pct, validarVidas, validarSinistralidade, sinistralidadePadrao, resumoSimulacao, type ConfigSimulacao, type ResultadoSimulacao } from '@/lib/uberabaSimulacao';

const nomes = ['PCA', 'PME', 'PCE 50 a 99', 'PCE 100+'];
type Resumo = ReturnType<typeof resumoSimulacao>;
type Linha = { label: string; valor: (r: Resumo) => number; destaque?: boolean };
const entes: { titulo: string; linhas: Linha[] }[] = [
  { titulo: 'Beneficiário', linhas: [
    { label: 'Taxa de Adesão', valor: r => r.beneficiario.adesao },
    { label: 'Faturamento', valor: r => r.beneficiario.faturamento },
    { label: 'Total', valor: r => r.beneficiario.total, destaque: true },
  ] },
  { titulo: 'Bensaúde', linhas: [
    { label: 'Faturamento', valor: r => r.bensaude.faturamento },
    { label: '− Despesa Assistencial', valor: r => -r.bensaude.despesa },
    { label: '= Resultado Operacional', valor: r => r.bensaude.operacional, destaque: true },
    { label: '− Agenciamento', valor: r => -r.bensaude.agenciamento },
    { label: '= Resultado Líquido', valor: r => r.bensaude.liquido, destaque: true },
  ] },
  { titulo: 'Lancers', linhas: [{ label: 'Faturamento', valor: r => r.lancers.faturamento, destaque: true }] },
  { titulo: 'SIGA', linhas: [
    { label: 'Taxa de Adesão', valor: r => r.siga.adesao },
    { label: 'Faturamento', valor: r => r.siga.faturamento },
    { label: 'Agenciamento', valor: r => r.siga.agenciamento },
    { label: 'Resultado', valor: r => r.siga.resultado, destaque: true },
  ] },
];

function Valor({ v }: { v: number }) {
  return <td className={`px-3 py-2 text-right tabular-nums ${v < 0 ? 'text-destructive' : ''}`}>{num(v)}</td>;
}

function Entes({ resultados }: { resultados: ResultadoSimulacao[] }) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const total = resumoSimulacao(resultados);
  const porModalidade = resultados.map(r => resumoSimulacao([r]));
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{entes.map(ente =>
    <section key={ente.titulo} aria-label={ente.titulo} className="rounded-md border border-border bg-secondary p-4">
      <h4 className="mb-3 border-b border-border pb-2 text-lg font-semibold text-primary">{ente.titulo}</h4>
      <table className="w-full text-sm">
        <thead><tr className="text-muted-foreground"><th className="px-3 py-1 text-left font-medium">Indicador</th><th className="px-3 py-1 text-right font-medium">Anual</th></tr></thead>
        <tbody>{ente.linhas.map(l => { const k = `${ente.titulo}-${l.label}`; const aberto = !!abertos[k]; return <Fragment key={k}>
          <tr className={`border-t border-border ${l.destaque ? 'font-semibold' : ''}`}>
            <th scope="row" className="px-1 py-2 text-left font-[inherit]"><button type="button" className="flex items-center gap-1 text-left" aria-expanded={aberto} onClick={() => setAbertos(p => ({ ...p, [k]: !aberto }))}><ChevronRight className={`h-4 w-4 transition-transform ${aberto ? 'rotate-90' : ''}`} />{l.label}</button></th>
            <Valor v={l.valor(total)} />
          </tr>
          {porModalidade.map((m, i) => <tr key={i} data-modalidade hidden={!aberto} className="text-muted-foreground"><td className="py-1 pl-9 pr-3">{nomes[i]}</td><Valor v={l.valor(m)} /></tr>)}
        </Fragment>; })}</tbody>
      </table>
    </section>)}</div>;
}

function PremissasImportadas() {
  return <details className="sim-assumptions"><summary>Premissas e fontes (CSVs fornecidos em 26/10/2026)</summary><ul>
    <li>Agenciamento: percentual × uma mensalidade de cada venda, em até cinco parcelas, pagas somente de janeiro a dezembro.</li>
    <li>Despesa Assistencial = faturamento × Sinistralidade informada por modalidade.</li>
    <li>Taxa de adesão paga pelo beneficiário diretamente à SIGA.</li>
    <li>Faturamento cumulativo, sem cancelamentos ou reajustes. Acomodação: Enfermaria. Simulação de proposta, não resultado realizado.</li>
    {fonte.condicoes.map(c => <li key={c.produto_codigo + c.condicao}>{c.produto_codigo} · {c.condicao}: Lancers {pct(c.participacao_lancers)}, SIGA {pct(c.participacao_siga)}, Bensaúde {pct(c.participacao_bensaude)}, agenciamento {[c.agenciamento_parcela_1, c.agenciamento_parcela_2, c.agenciamento_parcela_3, c.agenciamento_parcela_4, c.agenciamento_parcela_5].filter(Boolean).map(pct).join(' + ')}, adesão {pct(c.taxa_adesao)}</li>)}
  </ul></details>;
}

export default function UberabaSimulacao() {
  const [configuracoes, setConfiguracoes] = useState<ConfigSimulacao[]>(() => fonte.padroes.map(c => ({ ...c, sinistralidade_percentual: sinistralidadePadrao })));
  const [erro, setErro] = useState('');
  const [vidaText, setVidaText] = useState<Record<string, string>>({});
  const [sinText, setSinText] = useState<Record<string, string>>({});
  const impressao = useRef<HTMLDivElement>(null);
  const resultados = useMemo(() => configuracoes.map(calcularSimulacao), [configuracoes]);
  const alterar = (codigo: string, patch: Partial<ConfigSimulacao>) => setConfiguracoes(prev => prev.map(c => c.produto_codigo === codigo ? { ...c, ...patch } : c));
  const exportar = () => {
    const url = URL.createObjectURL(new Blob([csvSimulacao(resultados)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'Simulacao_Bensaude_Uberaba.csv'; link.click(); URL.revokeObjectURL(url);
  };
  const imprimir = () => {
    const content = impressao.current; if (!content) return;
    const popup = window.open('', '_blank', 'width=1200,height=850');
    if (!popup) { setErro('Permita abrir a janela de impressão.'); return; }
    const estilos = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(el => el.outerHTML).join('');
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><title>Simulação — Bensaúde|Uberaba</title>${estilos}<style>@page{size:A4 landscape;margin:10mm}body{padding:15px}section{break-inside:avoid}button svg{display:none}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body><main class="uberaba-simulation"><h2>Simulador Comercial Bensaúde|Uberaba</h2>${content.innerHTML}</main></body></html>`);
    popup.document.close();
    popup.document.querySelectorAll('[data-modalidade]').forEach(el => el.removeAttribute('hidden'));
    popup.document.querySelectorAll('details').forEach(el => (el as HTMLDetailsElement).open = true);
    popup.setTimeout(() => { popup.focus(); popup.print(); }, 500);
  };
  const restaurar = (codigo: string) => {
    const original = fonte.padroes.find(c => c.produto_codigo === codigo); if (!original) return;
    alterar(codigo, { ...original, sinistralidade_percentual: sinistralidadePadrao });
    setSinText(p => ({ ...p, [codigo]: String(sinistralidadePadrao) }));
    setVidaText(p => ({ ...p, [codigo]: String(original.total_vidas) }));
  };
  return <article className="uberaba-simulation" aria-label="Simulador Comercial Bensaúde|Uberaba">
    <header className="sim-heading"><div><h2><Calculator />Simulador Comercial Bensaúde|Uberaba</h2><p>Enfermaria · Proposta comercial · Valores anuais</p></div><div className="flex gap-2"><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Exportar cenário para CSV" onClick={exportar}><Download /></Button></TooltipTrigger><TooltipContent>Exportar CSV</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label="Imprimir simulação" onClick={imprimir}><Printer /></Button></TooltipTrigger><TooltipContent>Imprimir</TooltipContent></Tooltip></div></header>
    {erro && <p role="alert" className="text-destructive">{erro}</p>}
    <section aria-label="Variáveis por modalidade" className="rounded-md border border-border p-4">
      <h3 className="mb-3">Variáveis</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground"><th className="px-2 py-1">Modalidade</th><th className="px-2 py-1">Tabela de preço</th><th className="px-2 py-1">Condição comercial</th><th className="px-2 py-1">Agenciamento</th><th className="px-2 py-1">Taxa de Adesão</th><th className="px-2 py-1">Participação Bensaúde</th><th className="px-2 py-1">Participação Lancers</th><th className="px-2 py-1">Participação SIGA</th><th className="px-2 py-1">Total de vidas</th><th className="px-2 py-1">Sinistralidade (%)</th><th className="px-2 py-1">Mensalidade média</th><th /></tr></thead>
        <tbody>{resultados.map((r, i) => { const c = r.config, cod = c.produto_codigo; const parcelas = [r.condicao.agenciamento_parcela_1, r.condicao.agenciamento_parcela_2, r.condicao.agenciamento_parcela_3, r.condicao.agenciamento_parcela_4, r.condicao.agenciamento_parcela_5]; const vt = vidaText[cod] ?? String(c.total_vidas); const st = sinText[cod] ?? String(c.sinistralidade_percentual ?? sinistralidadePadrao); return <tr key={cod} className="border-t border-border align-top">
          <th scope="row" className="px-2 py-2 text-left">{nomes[i]}{!r.participacoesValidas && <span className="block text-xs text-destructive">Participações ≠ 100%</span>}</th>
          <td className="px-2 py-2"><Select value={c.tabela_preco} onValueChange={v => alterar(cod, { tabela_preco: v })}><SelectTrigger aria-label={`Tabela de preço ${nomes[i]}`} className="sim-editable min-w-28"><SelectValue /></SelectTrigger><SelectContent>{['Bensaúde', 'SIGA'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></td>
          <td className="px-2 py-2"><Select value={c.condicao_comercial} onValueChange={v => alterar(cod, { condicao_comercial: v })}><SelectTrigger aria-label={`Condição comercial ${nomes[i]}`} className="sim-editable min-w-40"><SelectValue /></SelectTrigger><SelectContent>{fonte.condicoes.filter(x => x.produto_codigo === cod).map(x => <SelectItem key={x.condicao} value={x.condicao}>{x.condicao}</SelectItem>)}</SelectContent></Select></td>
          <td aria-label={`Agenciamento ${nomes[i]}`} className="px-2 py-2 text-right tabular-nums"><span className="block whitespace-nowrap font-medium">{pct(parcelas.reduce((total, parcela) => total + parcela, 0))}</span><span className="mt-1 block text-xs text-muted-foreground">{parcelas.filter(Boolean).map(pct).join(' + ') || pct(0)}</span></td>
          <td aria-label={`Taxa de Adesão ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{pct(r.condicao.taxa_adesao)}</td>
          <td aria-label={`Participação Bensaúde ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{pct(r.condicao.participacao_bensaude)}</td>
          <td aria-label={`Participação Lancers ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{pct(r.condicao.participacao_lancers)}</td>
          <td aria-label={`Participação SIGA ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{pct(r.condicao.participacao_siga)}</td>
          <td className="px-2 py-2"><Input aria-label={`Total de vidas ${nomes[i]}`} className="sim-editable w-28" type="number" min={1} max={100000} step={1} value={vt} aria-invalid={!validarVidas(Number(vt))} onChange={e => { const v = e.target.value; setVidaText(p => ({ ...p, [cod]: v })); if (validarVidas(Number(v))) alterar(cod, { total_vidas: Number(v) }); }} onBlur={() => setVidaText(p => ({ ...p, [cod]: String(c.total_vidas) }))} /></td>
          <td className="px-2 py-2"><Input aria-label={`Sinistralidade ${nomes[i]}`} className="sim-editable w-24" type="text" inputMode="decimal" value={st} aria-invalid={st.trim() === '' || !validarSinistralidade(Number(st.replace(',', '.')))} onChange={e => { const v = e.target.value; setSinText(p => ({ ...p, [cod]: v })); const n = Number(v.replace(',', '.')); if (v.trim() !== '' && validarSinistralidade(n)) alterar(cod, { sinistralidade_percentual: n }); }} onBlur={() => setSinText(p => ({ ...p, [cod]: String(c.sinistralidade_percentual ?? sinistralidadePadrao) }))} /></td>
          <td className="px-2 py-2 text-right tabular-nums">{num(r.media)}</td>
          <td className="px-2 py-2"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Restaurar ${nomes[i]}`} onClick={() => restaurar(cod)}><RotateCcw /></Button></TooltipTrigger><TooltipContent>Restaurar padrão</TooltipContent></Tooltip></td>
        </tr>; })}</tbody>
      </table></div>
    </section>
    <div ref={impressao} className="space-y-4">
      <h3 className="flex items-center gap-2">Resultado por Ente <span className="text-sm font-normal text-muted-foreground">· clique no indicador para ver por modalidade</span></h3>
      <Entes resultados={resultados} />
      <PremissasImportadas />
    </div>
    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Info className="h-3 w-3" />Simulação de proposta comercial, não aprovação ou resultado realizado.</p>
  </article>;
}
