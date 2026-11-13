import { Fragment, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Calculator, ChevronRight, Copy, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import UberabaSimulacaoFaixas from '@/components/UberabaSimulacaoFaixas';
import BlocoRecolhido from '@/components/BlocoRecolhido';
import UberabaMemoriaCalculoButton from '@/components/UberabaMemoriaCalculoButton';
import { EVENTO_TABELAS_COMERCIAIS, lerIndicadores, lerIndices } from '@/lib/uberabaTabelasComerciais';
import { simularPorBase, BASES_DESPESA, premissaDespesa, baseDespesaDos, type BaseDespesa, replicarParametro, PADRAO_PARAMETRO, validarDespesaMedia, validarCopart, validarPercentual, coparticipacaoVidaMes, receitaVidaMes, netVidaMes, type ParametroReplicavel, type CenarioAgenciamento, fontesSimulacao as fonte, inteiroSimulacao as int, numeroSimulacao as num, percentualSimulacao as pct, validarVidas, validarSinistralidade, resumoSimulacao, memoriaCalculo, ENTES_RESULTADO, resultadoTotalEnte, type IndicadorEnte, type ConfigSimulacao, type ResultadoSimulacao } from '@/lib/uberabaSimulacao';

// Siglas dos parâmetros do Proj. Uberaba (13/11/2026); preços e percentuais vêm das tabelas de Resultados Comerciais.
const nomes = ['PCA', 'PME ADM.', 'PCE ADM.', 'PJ+'];
const entes = ENTES_RESULTADO;
// Valores digitados mostrados com vírgula decimal (pt-BR).
const campoTexto = (campo: ParametroReplicavel, v?: number) => String(v ?? PADRAO_PARAMETRO[campo]).replace('.', ',');
// Campos dos Parâmetros com ícone Replicar na linha do PCA (Sinistralidade, Desp. Assist. média e % Copart).
const CAMPOS: { campo: ParametroReplicavel; rotulo: string; valido: (v: number) => boolean }[] = [
  { campo: 'sinistralidade_percentual', rotulo: 'Sinistralidade', valido: validarSinistralidade },
  { campo: 'despesa_media', rotulo: 'Desp. Assist. média', valido: validarDespesaMedia },
  { campo: 'copart_percentual', rotulo: '% Copart', valido: validarCopart },
];
// Equipe própria (pedido de 13/11/2026): logo depois dos Agenciamentos, também com Replicar.
const CAMPOS_EQUIPE: typeof CAMPOS = [
  { campo: 'equipe_propria_percentual', rotulo: '% Equipe Própria', valido: validarPercentual },
  { campo: 'agenc_proprio_percentual', rotulo: '% Agenc. Próprio', valido: validarPercentual },
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
  // Quadros recolhidos por padrão: o título mostra o ente e o seu resultado total (pedido de 13/11/2026).
  const [quadrosAbertos, setQuadrosAbertos] = useState<Record<string, boolean>>({});
  return <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">{entes.map(ente => { const aberto = !!quadrosAbertos[ente.titulo]; const res = resultadoTotalEnte(ente); const v = res.valor(total); return (
    <section key={ente.titulo} aria-label={ente.titulo} className="rounded-md border border-border bg-secondary p-4">
      <h4 className={`flex items-center justify-between gap-3 text-lg font-semibold text-primary ${aberto ? 'mb-3 border-b border-border pb-2' : ''}`}>
        <button type="button" className="flex items-center gap-1 text-left" aria-expanded={aberto} aria-label={`${aberto ? 'Recolher' : 'Expandir'} ${ente.titulo}`} onClick={() => setQuadrosAbertos(p => ({ ...p, [ente.titulo]: !aberto }))}>
          <ChevronRight className={`h-5 w-5 transition-transform ${aberto ? 'rotate-90' : ''}`} />{ente.titulo}
        </button>
        {!aberto && <Memoria chave={res.chave} resultados={resultados} nomesModalidades={nomes}><span tabIndex={0} aria-label={`Resultado total ${ente.titulo}`} className="flex cursor-help items-baseline gap-2 text-base">
          <span className="text-sm font-normal text-muted-foreground">{res.label.replace(/^[=−-]\s*/, '')}</span>
          <span className={`tabular-nums ${v < 0 ? 'text-destructive' : ''}`}>{num(v)}</span>
        </span></Memoria>}
      </h4>
      <table hidden={!aberto} className="w-full text-sm">
        <thead><tr className="text-muted-foreground"><th className="px-3 py-1 text-left font-medium">Indicador</th><th className="px-3 py-1 text-right font-medium">Anual</th></tr></thead>
        <tbody>{ente.linhas.map(l => { const k = `${ente.titulo}-${l.label}`; const aberto = !!abertos[k]; return <Fragment key={k}>
          <tr className={`border-t border-border ${l.destaque ? 'font-semibold' : ''}`}>
            <th scope="row" className="px-1 py-2 text-left font-[inherit]"><Memoria chave={l.chave} resultados={resultados} nomesModalidades={nomes}><button type="button" className="flex items-center gap-1 text-left" aria-expanded={aberto} onClick={() => setAbertos(p => ({ ...p, [k]: !aberto }))}><ChevronRight className={`h-4 w-4 transition-transform ${aberto ? 'rotate-90' : ''}`} />{l.label}</button></Memoria></th>
            <Valor v={l.valor(total)} />
          </tr>
          {porModalidade.map((m, i) => <tr key={i} data-modalidade hidden={!aberto} className="text-muted-foreground"><td className="py-1 pl-9 pr-3"><Memoria chave={l.chave} resultados={[resultados[i]]} nomesModalidades={[nomes[i]]}><span tabIndex={0} className="cursor-help">{nomes[i]}</span></Memoria></td><Valor v={l.valor(m)} /></tr>)}
        </Fragment>; })}</tbody>
      </table>
    </section>); })}</div>;
}

function PremissasImportadas({ cenarios }: { cenarios: CenarioAgenciamento[] }) {
  const [contratual, promocional] = cenarios.map(c => c.resultados.map(r => r.condicao));
  return <details className="sim-assumptions"><summary>Premissas e fontes (Resultados Comerciais e %CART fornecido em 26/10/2026)</summary><ul>
    <li>Distribuição etária: %CART da imagem de Entradas Lancers, referência de 11.318 entradas, aplicada às quatro modalidades; faixas arredondadas por mês, com residual na faixa 59 ou mais.</li>
    {fonte.faixas.map(f => <li key={f.faixa_numero}>{f.faixa_etaria}: {pct(f.percentual_normalizado)}</li>)}
    <li>Mensalidade: Enfermaria da tabela de cada produto no quadro Tabelas acima (Tabela Referencial × índice).</li>
    <li>Agenciamento Externo = (100% − % Equipe Própria) × percentual Contratual ou Promocional (um bloco de resultados para cada) × uma mensalidade de cada venda, pago no mês da venda, somente de janeiro a dezembro; é custo da OPERADORA e receita da ADMINISTRADORA no PCA e no PME ADM. (03 a 29 vidas) e da AGENCIADORA nas demais modalidades.</li>
    <li>Agenciamento Próprio = % Equipe Própria × % Agenc. Próprio × uma mensalidade de cada venda, igual nos dois blocos; custo da OPERADORA com a equipe própria, sem passar pela AGENCIADORA. Total Agenciamento = Externo + Próprio.</li>
    <li>Participações: OPERADORA, ADMINISTRADORA e AGENCIADORA, conforme os Indicadores variáveis de cada produto.</li>
    <li>{premissaDespesa(baseDespesaDos(cenarios))}</li>
    <li>Coparticipação = vidas projetadas acumuladas em cada mês × Desp. Assist. média × % Copart; o ano soma os valores mensais, não as vidas; paga pelo beneficiário, soma ao Total dele e entra 100% para a OPERADORA.</li>
    <li>Taxa de adesão paga pelo beneficiário diretamente à AGENCIADORA.</li>
    <li>Faturamento cumulativo, sem cancelamentos ou reajustes. Acomodação: Enfermaria. Simulação de proposta, não resultado realizado.</li>
    {contratual.map((c, i) => <li key={c.produto_codigo}>{nomes[i]}: OPERADORA {pct(c.participacao_bensaude)}, ADMINISTRADORA {pct(c.participacao_lancers)}, AGENCIADORA {pct(c.participacao_siga)}, agenciamento contratual {pct(c.agenciamento_parcela_1)} / promocional {pct(promocional[i].agenciamento_parcela_1)}, adesão {pct(c.taxa_adesao)}</li>)}
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
  const [configuracoes, setConfiguracoes] = useState<ConfigSimulacao[]>(() => fonte.padroes.map(c => ({ ...c, ...PADRAO_PARAMETRO })));
  const [vidaText, setVidaText] = useState<Record<string, string>>({});
  // Texto digitado por campo e modalidade (chave `campo:modalidade`).
  const [textos, setTextos] = useState<Record<string, string>>({});
  const { indices, indicadores } = useResultadosComerciais();
  // Resultado por Ente em dois cenários (pedido de 13/11/2026): Agenciamento Contratual e Promocional.
  // Chave PERCENTUAL / MÉDIA ASSIST. (pedido de 13/11/2026): como calcular a Despesa Assistencial nos dois cenários.
  const [baseDespesa, setBaseDespesa] = useState<BaseDespesa>('percentual');
  const cenarios = useMemo(() => simularPorBase(configuracoes, indices, indicadores, baseDespesa), [configuracoes, indices, indicadores, baseDespesa]);
  const [contratual, promocional] = cenarios;
  const resultados = contratual.resultados;
  const totalVidas = resultados.reduce((total, r) => total + r.anual.vidas, 0);
  const alterar = (codigo: string, patch: Partial<ConfigSimulacao>) => setConfiguracoes(prev => prev.map(c => c.produto_codigo === codigo ? { ...c, ...patch } : c));
  const restaurar = (codigo: string) => {
    const original = fonte.padroes.find(c => c.produto_codigo === codigo); if (!original) return;
    alterar(codigo, { ...original, ...PADRAO_PARAMETRO });
    setTextos(p => ({ ...p, ...Object.fromEntries([...CAMPOS, ...CAMPOS_EQUIPE].map(({ campo }) => [`${campo}:${codigo}`, campoTexto(campo)])) }));
    setVidaText(p => ({ ...p, [codigo]: String(original.total_vidas) }));
  };
  // Ícone Replicar na linha do PCA: copia o valor dele para as demais modalidades.
  const replicar = (campo: ParametroReplicavel) => {
    const novas = replicarParametro(configuracoes, 'PCA', campo);
    setConfiguracoes(novas);
    setTextos(p => ({ ...p, ...Object.fromEntries(novas.map(c => [`${campo}:${c.produto_codigo}`, campoTexto(campo, c[campo])])) }));
  };
  // Resumo por faixa etária: ícone ao lado do título "Total de vidas".
  const resumoFaixas = <Dialog><Tooltip><TooltipTrigger asChild><DialogTrigger asChild><Button variant="ghost" size="icon" aria-label="Resumo por faixa etária" className="h-6 w-6 align-middle"><Calculator className="h-4 w-4" /></Button></DialogTrigger></TooltipTrigger><TooltipContent>Resumo por faixa etária</TooltipContent></Tooltip><UberabaSimulacaoFaixas resultados={resultados} /></Dialog>;
  return <article className="uberaba-simulation" aria-label="Simulador Comercial Bensaúde|Uberaba">
    <BlocoRecolhido titulo="Parâmetros"><section aria-label="Variáveis por modalidade" className="p-4">
      <p className="mb-3 text-xs text-muted-foreground">Preços (Enfermaria), Agenciamento (Contratual e Promocional), Taxa de adesão e Participações vêm das tabelas de Resultados Comerciais acima.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground"><th className="px-2 py-1 text-center">Modalidade</th><th className="px-2 py-1 text-center">Agenciamento <span className="font-normal">(contratual)</span></th><th className="px-2 py-1 text-center">Agenciamento <span className="font-normal">(promocional)</span></th><th className="px-2 py-1 text-center">% Equipe Própria</th><th className="px-2 py-1 text-center">% Agenc. Próprio <span className="font-normal">(equipe própria)</span></th><th className="px-2 py-1 text-center">Taxa de Adesão</th><th className="px-2 py-1 text-center">Participação OPERADORA</th><th className="px-2 py-1 text-center">Participação ADMINISTRADORA</th><th className="px-2 py-1 text-center">Participação AGENCIADORA</th><th className="whitespace-nowrap px-2 py-1 text-center">Total de vidas {resumoFaixas}</th><th className="px-2 py-1 text-center">Sinistralidade (%)</th><th className="px-2 py-1 text-center">Desp. Assist. média <span className="font-normal">(R$ vida/mês)</span></th><th className="px-2 py-1 text-center">% Copart <span className="font-normal">(sobre a Desp. Assist. média)</span></th><th className="px-2 py-1 text-center">Mensalidade média</th><th className="px-2 py-1 text-center">Net média <span className="font-normal">(mensalidade × participação OPERADORA)</span></th><th className="px-2 py-1 text-center">Copart. <span className="font-normal">(% Copart × Desp. Assist. média)</span></th><th className="px-2 py-1 text-center">Receitas <span className="font-normal">(net média + copart.)</span></th><th /></tr></thead>
        <tbody>{resultados.map((r, i) => { const c = r.config, cod = c.produto_codigo; const vt = vidaText[cod] ?? String(c.total_vidas);
          // Campo editável com Replicar na linha do PCA.
          const celula = ({ campo, rotulo, valido }: (typeof CAMPOS)[number]) => { const k = `${campo}:${cod}`; const t = textos[k] ?? campoTexto(campo, c[campo]); return <td key={campo} className="px-2 py-2"><div className="flex items-center justify-center gap-1"><Input aria-label={`${rotulo} ${nomes[i]}`} className="sim-editable w-[4.5rem] px-1 text-center" type="text" inputMode="decimal" value={t} aria-invalid={t.trim() === '' || !valido(Number(t.replace(',', '.')))} onChange={e => { const v = e.target.value; setTextos(p => ({ ...p, [k]: v })); const n = Number(v.replace(',', '.')); if (v.trim() !== '' && valido(n)) alterar(cod, { [campo]: n } as Partial<ConfigSimulacao>); }} onBlur={() => setTextos(p => ({ ...p, [k]: campoTexto(campo, c[campo]) }))} />
            {i === 0 ? <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Replicar ${rotulo} do PCA nos demais`} onClick={() => replicar(campo)}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Replicar</TooltipContent></Tooltip> : <span aria-hidden className="h-7 w-7 shrink-0" />}
            </div></td>; };
          return <tr key={cod} className="border-t border-border align-top">
          <th scope="row" className="px-2 py-2 text-left">{nomes[i]}{!r.participacoesValidas && <span className="block text-xs text-destructive">Participações ≠ 100%</span>}</th>
          <td aria-label={`Agenciamento contratual ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.agenciamento_parcela_1)}</td>
          <td aria-label={`Agenciamento promocional ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(promocional.resultados[i].condicao.agenciamento_parcela_1)}</td>
          {CAMPOS_EQUIPE.map(celula)}
          <td aria-label={`Taxa de Adesão ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.taxa_adesao)}</td>
          <td aria-label={`Participação OPERADORA ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.participacao_bensaude)}</td>
          <td aria-label={`Participação ADMINISTRADORA ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.participacao_lancers)}</td>
          <td aria-label={`Participação AGENCIADORA ${nomes[i]}`} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">{pct(r.condicao.participacao_siga)}</td>
          <td className="px-2 py-2"><Input aria-label={`Total de vidas ${nomes[i]}`} className="sim-editable mx-auto w-24 text-center" type="number" min={1} max={100000} step={1} value={vt} aria-invalid={!validarVidas(Number(vt))} onChange={e => { const v = e.target.value; setVidaText(p => ({ ...p, [cod]: v })); if (validarVidas(Number(v))) alterar(cod, { total_vidas: Number(v) }); }} onBlur={() => setVidaText(p => ({ ...p, [cod]: String(c.total_vidas) }))} /></td>
          {CAMPOS.map(celula)}
          <td className="px-2 py-2 text-center tabular-nums">{num(r.media)}</td>
          <td aria-label={`Net média ${nomes[i]}`} className="px-2 py-2 text-center tabular-nums">{num(netVidaMes(r))}</td>
          <td aria-label={`Copart. ${nomes[i]}`} className="px-2 py-2 text-center tabular-nums">{num(coparticipacaoVidaMes(c))}</td>
          <td aria-label={`Receitas ${nomes[i]}`} className="px-2 py-2 text-center font-semibold tabular-nums">{num(receitaVidaMes(r))}</td>
          <td className="px-2 py-2"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Restaurar ${nomes[i]}`} onClick={() => restaurar(cod)}><RotateCcw /></Button></TooltipTrigger><TooltipContent>Restaurar padrão</TooltipContent></Tooltip></td>
        </tr>; })}</tbody>
        <tfoot><tr className="border-t border-border bg-secondary font-semibold text-primary">
          <th scope="row" colSpan={9} className="px-2 py-3 text-left">Total</th>
          <td className="px-2 py-3"><output aria-label="Total de vidas consolidado" className="block w-full text-center tabular-nums">{int(totalVidas)}</output></td>
          <td colSpan={8} />
        </tr></tfoot>
      </table></div>
    </section></BlocoRecolhido>
    <BlocoRecolhido titulo="Resultado por Ente" className="mt-4"><div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Clique no indicador para ver por modalidade; passe o mouse para ver a memória de cálculo.</p>
        <UberabaMemoriaCalculoButton cenarios={cenarios} nomes={nomes} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium text-foreground">Calcular despesas assistenciais por</span>
        <div role="group" aria-label="Calcular despesas assistenciais por" className="inline-flex overflow-hidden rounded-md border border-border">
          {BASES_DESPESA.map(b => <button key={b.id} type="button" aria-pressed={baseDespesa === b.id} onClick={() => setBaseDespesa(b.id)} className={`px-3 py-1 text-xs font-semibold uppercase ${baseDespesa === b.id ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}>{b.rotulo}</button>)}
        </div>
        <span className="text-xs text-muted-foreground">{baseDespesa === 'media' ? 'Vidas projetadas acumuladas × Desp. Assist. média' : 'Faturamento × Sinistralidade (%)'}</span>
      </div>
      {cenarios.map(c => <BlocoRecolhido key={c.base} titulo={c.rotulo}><div className="p-4"><Entes resultados={c.resultados} /></div></BlocoRecolhido>)}
    </div></BlocoRecolhido>
    <PremissasImportadas cenarios={cenarios} />
    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Info className="h-3 w-3" />Simulação de proposta comercial, não aprovação ou resultado realizado.</p>
  </article>;
}
