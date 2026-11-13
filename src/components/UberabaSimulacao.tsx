import { Fragment, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Calculator, ChevronRight, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import UberabaSimulacaoFaixas from '@/components/UberabaSimulacaoFaixas';
import BlocoRecolhido from '@/components/BlocoRecolhido';
import { EVENTO_TABELAS_COMERCIAIS, lerIndicadores, lerIndices } from '@/lib/uberabaTabelasComerciais';
import { BASES_AGENCIAMENTO, calcularSimulacaoComercial, comercialDaFrente, type BaseAgenciamento, fontesSimulacao as fonte, inteiroSimulacao as int, numeroSimulacao as num, percentualSimulacao as pct, validarVidas, validarSinistralidade, sinistralidadePadrao, resumoSimulacao, memoriaCalculo, type IndicadorEnte, type ConfigSimulacao, type CondicaoSimulacao, type ResultadoSimulacao } from '@/lib/uberabaSimulacao';

// Siglas dos parâmetros do Proj. Uberaba (13/11/2026); preços e percentuais vêm das tabelas de Resultados Comerciais.
const nomes = ['PCA', 'PME ADM.', 'PCE ADM.', 'PJ+'];
type Resumo = ReturnType<typeof resumoSimulacao>;
type Linha = { chave: IndicadorEnte; label: string; valor: (r: Resumo) => number; destaque?: boolean };
const entes: { titulo: string; linhas: Linha[] }[] = [
  { titulo: 'Beneficiário', linhas: [
    { chave: 'beneficiario.adesao', label: 'Taxa de Adesão', valor: r => r.beneficiario.adesao },
    { chave: 'beneficiario.faturamento', label: 'Faturamento', valor: r => r.beneficiario.faturamento },
    { chave: 'beneficiario.total', label: 'Total', valor: r => r.beneficiario.total, destaque: true },
  ] },
  { titulo: 'Bensaúde', linhas: [
    { chave: 'bensaude.faturamento', label: 'Faturamento', valor: r => r.bensaude.faturamento },
    { chave: 'bensaude.despesa', label: '− Despesa Assistencial', valor: r => -r.bensaude.despesa },
    { chave: 'bensaude.operacional', label: '= Resultado Operacional', valor: r => r.bensaude.operacional, destaque: true },
    { chave: 'bensaude.agenciamento', label: '− Agenciamento', valor: r => -r.bensaude.agenciamento },
    { chave: 'bensaude.liquido', label: '= Resultado Líquido', valor: r => r.bensaude.liquido, destaque: true },
  ] },
  { titulo: 'Lancers', linhas: [{ chave: 'lancers.faturamento', label: 'Faturamento', valor: r => r.lancers.faturamento, destaque: true }] },
  { titulo: 'SIGA', linhas: [
    { chave: 'siga.adesao', label: 'Taxa de Adesão', valor: r => r.siga.adesao },
    { chave: 'siga.faturamento', label: 'Faturamento', valor: r => r.siga.faturamento },
    { chave: 'siga.agenciamento', label: 'Agenciamento', valor: r => r.siga.agenciamento },
    { chave: 'siga.resultado', label: 'Resultado', valor: r => r.siga.resultado, destaque: true },
  ] },
];

function Valor({ v }: { v: number }) {
  return <td className={`px-3 py-2 text-right tabular-nums ${v < 0 ? 'text-destructive' : ''}`}>{num(v)}</td>;
}

// Memória de cálculo do indicador, com os valores do cenário atual (total ou uma modalidade).
function Memoria({ chave, resultados, nomesModalidades, children }: { chave: IndicadorEnte; resultados: ResultadoSimulacao[]; nomesModalidades: string[]; children: ReactElement }) {
  const m = memoriaCalculo(chave, resultados, nomesModalidades);
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="right" align="start" className="max-w-md space-y-1 text-xs leading-snug">
      <p className="font-semibold">Memória de cálculo</p>
      <p>{m.formula}</p>
      <ul className="space-y-0.5 tabular-nums">{m.passos.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </TooltipContent></Tooltip>;
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
            <th scope="row" className="px-1 py-2 text-left font-[inherit]"><Memoria chave={l.chave} resultados={resultados} nomesModalidades={nomes}><button type="button" className="flex items-center gap-1 text-left" aria-expanded={aberto} onClick={() => setAbertos(p => ({ ...p, [k]: !aberto }))}><ChevronRight className={`h-4 w-4 transition-transform ${aberto ? 'rotate-90' : ''}`} />{l.label}</button></Memoria></th>
            <Valor v={l.valor(total)} />
          </tr>
          {porModalidade.map((m, i) => <tr key={i} data-modalidade hidden={!aberto} className="text-muted-foreground"><td className="py-1 pl-9 pr-3"><Memoria chave={l.chave} resultados={[resultados[i]]} nomesModalidades={[nomes[i]]}><span tabIndex={0} className="cursor-help">{nomes[i]}</span></Memoria></td><Valor v={l.valor(m)} /></tr>)}
        </Fragment>; })}</tbody>
      </table>
    </section>)}</div>;
}

function PremissasImportadas({ condicoes, base }: { condicoes: CondicaoSimulacao[]; base: string }) {
  return <details className="sim-assumptions"><summary>Premissas e fontes (Resultados Comerciais e %CART fornecido em 26/10/2026)</summary><ul>
    <li>Distribuição etária: %CART da imagem de Entradas Lancers, referência de 11.318 entradas, aplicada às quatro modalidades; faixas arredondadas por mês, com residual na faixa 59 ou mais.</li>
    {fonte.faixas.map(f => <li key={f.faixa_numero}>{f.faixa_etaria}: {pct(f.percentual_normalizado)}</li>)}
    <li>Mensalidade: Enfermaria da tabela de cada produto no quadro Tabelas acima (Tabela Referencial × índice).</li>
    <li>Agenciamento: percentual {base} (chave acima da tabela) × uma mensalidade de cada venda, pago no mês da venda, somente de janeiro a dezembro.</li>
    <li>Participações: Bensaúde = Operadora; Lancers = Administradora; SIGA = Agenciadora, conforme os Indicadores variáveis de cada produto.</li>
    <li>Despesa Assistencial = faturamento × Sinistralidade informada por modalidade.</li>
    <li>Taxa de adesão paga pelo beneficiário diretamente à SIGA.</li>
    <li>Faturamento cumulativo, sem cancelamentos ou reajustes. Acomodação: Enfermaria. Simulação de proposta, não resultado realizado.</li>
    {condicoes.map((c, i) => <li key={c.produto_codigo}>{nomes[i]}: Bensaúde {pct(c.participacao_bensaude)}, Lancers {pct(c.participacao_lancers)}, SIGA {pct(c.participacao_siga)}, agenciamento {pct(c.agenciamento_parcela_1)}, adesão {pct(c.taxa_adesao)}</li>)}
  </ul></details>;
}

// Índices e Indicadores variáveis atuais das tabelas de Resultados Comerciais (atualizados a cada gravação).
function useResultadosComerciais() {
  const [v, setV] = useState(() => ({ indices: lerIndices(), indicadores: lerIndicadores() }));
  useEffect(() => {
    const atualizar = () => setV({ indices: lerIndices(), indicadores: lerIndicadores() });
    window.addEventListener(EVENTO_TABELAS_COMERCIAIS, atualizar);
    return () => window.removeEventListener(EVENTO_TABELAS_COMERCIAIS, atualizar);
  }, []);
  return v;
}

export default function UberabaSimulacao() {
  const [configuracoes, setConfiguracoes] = useState<ConfigSimulacao[]>(() => fonte.padroes.map(c => ({ ...c, sinistralidade_percentual: sinistralidadePadrao })));
  const [vidaText, setVidaText] = useState<Record<string, string>>({});
  const [sinText, setSinText] = useState<Record<string, string>>({});
  const { indices, indicadores } = useResultadosComerciais();
  const [baseAgenciamento, setBaseAgenciamento] = useState<BaseAgenciamento>('contratual');
  const rotuloBase = BASES_AGENCIAMENTO.find(b => b.id === baseAgenciamento)!.rotulo;
  const resultados = useMemo(() => configuracoes.map(c => calcularSimulacaoComercial(c, comercialDaFrente(c.produto_codigo, indices, indicadores, baseAgenciamento))), [configuracoes, indices, indicadores, baseAgenciamento]);
  const totalVidas = resultados.reduce((total, r) => total + r.anual.vidas, 0);
  const alterar = (codigo: string, patch: Partial<ConfigSimulacao>) => setConfiguracoes(prev => prev.map(c => c.produto_codigo === codigo ? { ...c, ...patch } : c));
  const restaurar = (codigo: string) => {
    const original = fonte.padroes.find(c => c.produto_codigo === codigo); if (!original) return;
    alterar(codigo, { ...original, sinistralidade_percentual: sinistralidadePadrao });
    setSinText(p => ({ ...p, [codigo]: String(sinistralidadePadrao) }));
    setVidaText(p => ({ ...p, [codigo]: String(original.total_vidas) }));
  };
  // Resumo por faixa etária: ícone ao lado do título "Total de vidas".
  const resumoFaixas = <Dialog><Tooltip><TooltipTrigger asChild><DialogTrigger asChild><Button variant="ghost" size="icon" aria-label="Resumo por faixa etária" className="h-6 w-6 align-middle"><Calculator className="h-4 w-4" /></Button></DialogTrigger></TooltipTrigger><TooltipContent>Resumo por faixa etária</TooltipContent></Tooltip><UberabaSimulacaoFaixas resultados={resultados} /></Dialog>;
  return <article className="uberaba-simulation" aria-label="Simulador Comercial Bensaúde|Uberaba">
    <BlocoRecolhido titulo="Parâmetros"><section aria-label="Variáveis por modalidade" className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Preços (Enfermaria), Agenciamento ({rotuloBase}), Taxa de adesão e Participações vêm das tabelas de Resultados Comerciais acima.</p>
        <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Agenciamento</span>
          <div role="group" aria-label="Percentual de agenciamento" className="inline-flex overflow-hidden rounded-md border border-border">
            {BASES_AGENCIAMENTO.map(b => <button key={b.id} type="button" aria-pressed={baseAgenciamento === b.id} onClick={() => setBaseAgenciamento(b.id)} className={`px-3 py-1 text-xs font-semibold uppercase ${baseAgenciamento === b.id ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}>{b.rotulo}</button>)}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground"><th className="px-2 py-1 text-center">Modalidade</th><th className="px-2 py-1 text-center">Agenciamento <span className="font-normal">({rotuloBase.toLowerCase()})</span></th><th className="px-2 py-1 text-center">Taxa de Adesão</th><th className="px-2 py-1 text-center">Participação Bensaúde</th><th className="px-2 py-1 text-center">Participação Lancers</th><th className="px-2 py-1 text-center">Participação SIGA</th><th className="whitespace-nowrap px-2 py-1 text-center">Total de vidas {resumoFaixas}</th><th className="px-2 py-1 text-center">Sinistralidade (%)</th><th className="px-2 py-1 text-center">Mensalidade média</th><th /></tr></thead>
        <tbody>{resultados.map((r, i) => { const c = r.config, cod = c.produto_codigo; const vt = vidaText[cod] ?? String(c.total_vidas); const st = sinText[cod] ?? String(c.sinistralidade_percentual ?? sinistralidadePadrao); return <tr key={cod} className="border-t border-border align-top">
          <th scope="row" className="px-2 py-2 text-left">{nomes[i]}{!r.participacoesValidas && <span className="block text-xs text-destructive">Participações ≠ 100%</span>}</th>
          <td aria-label={`Agenciamento ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.agenciamento_parcela_1)}</td>
          <td aria-label={`Taxa de Adesão ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.taxa_adesao)}</td>
          <td aria-label={`Participação Bensaúde ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.participacao_bensaude)}</td>
          <td aria-label={`Participação Lancers ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.participacao_lancers)}</td>
          <td aria-label={`Participação SIGA ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.participacao_siga)}</td>
          <td className="px-2 py-2"><Input aria-label={`Total de vidas ${nomes[i]}`} className="sim-editable mx-auto w-28 text-center" type="number" min={1} max={100000} step={1} value={vt} aria-invalid={!validarVidas(Number(vt))} onChange={e => { const v = e.target.value; setVidaText(p => ({ ...p, [cod]: v })); if (validarVidas(Number(v))) alterar(cod, { total_vidas: Number(v) }); }} onBlur={() => setVidaText(p => ({ ...p, [cod]: String(c.total_vidas) }))} /></td>
          <td className="px-2 py-2"><Input aria-label={`Sinistralidade ${nomes[i]}`} className="sim-editable mx-auto w-24 text-center" type="text" inputMode="decimal" value={st} aria-invalid={st.trim() === '' || !validarSinistralidade(Number(st.replace(',', '.')))} onChange={e => { const v = e.target.value; setSinText(p => ({ ...p, [cod]: v })); const n = Number(v.replace(',', '.')); if (v.trim() !== '' && validarSinistralidade(n)) alterar(cod, { sinistralidade_percentual: n }); }} onBlur={() => setSinText(p => ({ ...p, [cod]: String(c.sinistralidade_percentual ?? sinistralidadePadrao) }))} /></td>
          <td className="px-2 py-2 text-center tabular-nums">{num(r.media)}</td>
          <td className="px-2 py-2"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Restaurar ${nomes[i]}`} onClick={() => restaurar(cod)}><RotateCcw /></Button></TooltipTrigger><TooltipContent>Restaurar padrão</TooltipContent></Tooltip></td>
        </tr>; })}</tbody>
        <tfoot><tr className="border-t border-border bg-secondary font-semibold text-primary">
          <th scope="row" colSpan={6} className="px-2 py-3 text-left">Total</th>
          <td className="px-2 py-3"><output aria-label="Total de vidas consolidado" className="block w-full text-center tabular-nums">{int(totalVidas)}</output></td>
          <td colSpan={3} />
        </tr></tfoot>
      </table></div>
    </section></BlocoRecolhido>
    <BlocoRecolhido titulo="Resultado por Ente" className="mt-4"><div className="space-y-3 p-4">
      <p className="text-sm text-muted-foreground">Clique no indicador para ver por modalidade; passe o mouse para ver a memória de cálculo.</p>
      <Entes resultados={resultados} />
    </div></BlocoRecolhido>
    <PremissasImportadas condicoes={resultados.map(r => r.condicao)} base={rotuloBase} />
    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Info className="h-3 w-3" />Simulação de proposta comercial, não aprovação ou resultado realizado.</p>
  </article>;
}
