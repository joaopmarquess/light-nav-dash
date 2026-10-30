import { hostinger } from "@/lib/hostingerClient";
import { supabase } from "@/integrations/supabase/client";
import { loadDreHostinger, type DreHRow } from "@/lib/dreHostinger";
import { mergeOrcamento } from "@/lib/orcamentoLocal";
import { realizadosOrcamento } from "./orcamentoRegras";
import { datasVidasIndicadores, mesesMovimentacao, somarTotaisMovimentacao } from "./movimentacaoCarga";
import { dinheiro, numero, percentual, type ReportPeriod } from "./controladoriaRegras";
import { agruparPorAno, anosSinistralidade, saldoCompetencia, sinistralidade, somaVazia, somarTotais, type SomaCompetencia } from "./sinistralidadeCompetencias";
import { resumoMovimentacao } from "./movimentacaoResumo";
import { resumoPainelDre } from "./drePainel";
import { aplicarRealizadoMv, gruposOrcamentoDre, impostosFederais, resultadoLiquido, valoresOrcamento } from "./orcamentoDre";

export const UNAVAILABLE = "Informação não disponível na fonte atual.";
export type ReportTable = { headers: string[]; rows: string[][] };
export type ReportSeries = { label: string; values: number[] };
export type ReportBlock = {
  id: string; title: string; introduction: string; sourceModule: "AXIS" | "CONTROL";
  sourceFunction: string; period: ReportPeriod; generatedAt: string;
  status: "available" | "unavailable" | "error"; notice?: string;
  cards: { label: string; value: string }[]; table?: ReportTable;
  chart?: { title: string; labels: string[]; series: ReportSeries[] };
  paragraphs: string[]; considerations: string[]; children?: ReportBlock[];
};
export type ControladoriaReport = { period: ReportPeriod; generatedAt: string; blocks: ReportBlock[]; conclusions: string[] };
const strip = (s: string) => s.replace(/^\d+\|/, "");
const sum = (rows: DreHRow[]) => rows.reduce((t, r) => t + r.valor, 0);
const group = (rows: DreHRow[], level: "g1" | "g2" | "g3") => {
  const map = new Map<string, number>();
  for (const r of rows) { const key = level === "g1" ? r.g1 : level === "g2" ? `${r.g1} / ${r.g2}` : `${r.g1} / ${r.g2} / ${r.g3}`; map.set(key, (map.get(key) ?? 0) + r.valor); }
  return [...map].sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true }));
};
const base = (id: string, title: string, sourceModule: ReportBlock["sourceModule"], sourceFunction: string, period: ReportPeriod, generatedAt: string): ReportBlock => ({ id, title, sourceModule, sourceFunction, period: { ...period }, generatedAt, status: "unavailable", introduction: "", cards: [], paragraphs: [], considerations: [] });
async function rpc(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const { data, error } = await hostinger.rpc(name, args);
  if (error) throw new Error(error.message);
  if (data === null) return [];
  return Array.isArray(data) ? data : [data];
}
export async function carregarRelatorio(period: ReportPeriod, progress: (message: string) => void): Promise<ControladoriaReport> {
  const generatedAt = new Date().toISOString();
  const monthly = mesesMovimentacao(period);
  const months = monthly.map(m => Number(m.de.slice(5, 7)));
  const years = [...new Set(monthly.map(m => Number(m.de.slice(0, 4))))];
  const carteira = base("carteira", "1. Carteira", "AXIS", "carteira_movimentacao_totais; carteira_trial_geo; carteira_trial_siglas", period, generatedAt);
  const assist = base("assistencial", "2. Despesas Assistenciais", "AXIS", "sinistralidade_mv_competencias / view_eard_mensal", period, generatedAt);
  const dre = base("dre", "3. DRE Gerencial", "CONTROL", "loadDreHostinger / demonstracoes_contabeis_oracle_mv + plano_contas_icontabil", period, generatedAt);
  const orc = base("orcamento", "4. Orçamento", "CONTROL", "orcamento_2026; mergeOrcamento; loadDreHostinger; realizadosOrcamento", period, generatedAt);
  progress("Consultando AXIS e CONTROL…");
  // Reuse the exact CONTROL financial treatment, with one fetch shared by DRE and budget.
  const dreRequest = Promise.all(years.map(ano => loadDreHostinger(ano, monthly.filter(m => Number(m.de.slice(0, 4)) === ano).map(m => Number(m.de.slice(5, 7))))));
  const budgetRequest = years.length === 1 && years[0] === 2026 ? supabase.from("orcamento_2026").select("*").order("item").order("nr_mes") : Promise.resolve({ data: null, error: null });
  const [axisResults, dreResult, budgetResult] = await Promise.all([
    Promise.allSettled([
      (async () => {
        const dates = datasVidasIndicadores(period);
        const counts = new Map<string, number>();
        const getLives = async (date: string) => { if (counts.has(date)) return counts.get(date) ?? 0; const rows = await rpc("carteira_trial_geo", { p_data: date }); const n = rows.reduce((t, r) => t + Number(r.ativos ?? 0), 0); counts.set(date, n); return n; };
        const [initial, final] = await Promise.all([getLives(dates.anterior), getLives(dates.final)]);
        const totals: Record<string, unknown>[] = [], lives: number[] = [];
        for (let i = 0; i < monthly.length; i++) {
          progress(`Carteira: mês ${i + 1} de ${monthly.length}…`);
          const m = monthly[i];
          const [t, life] = await Promise.all([rpc("carteira_movimentacao_totais", { p_de: m.de, p_ate: m.ate }), getLives(m.ate)]);
          if (!t.length) throw new Error("Totais de movimentação não retornados.");
          totals.push(t[0]); lives.push(life);
        }
        const total = somarTotaisMovimentacao(totals);
        const res = resumoMovimentacao(total.e, total.s, total.r, total.tp, total.tm);
        carteira.status = "available";
        carteira.introduction = "Indicadores e evolução mensal conforme a visão padrão de Carteira › Movimentação, aplicados ao período do relatório.";
        carteira.cards = [{ label: "Anterior", value: numero(initial) }, { label: "Vendas", value: numero(total.e) }, { label: "Cancelamentos", value: numero(-total.s) }, { label: "Reativações", value: numero(total.r) }, { label: "Transferências Líq.", value: numero(res.transferenciasLiquidas) }, { label: "Final", value: numero(final) }, { label: "Crescimento", value: numero(res.crescimento) }];
        carteira.table = { headers: ["Competência", "Vendas", "Cancelamentos", "Reativações", "Transf. Líq.", "Crescimento", "Vidas ativas"], rows: totals.map((r, i) => { const t = somarTotaisMovimentacao([r]); const m = resumoMovimentacao(t.e, t.s, t.r, t.tp, t.tm); return [monthly[i].de.slice(0, 7), numero(t.e), numero(-t.s), numero(t.r), numero(m.transferenciasLiquidas), numero(m.crescimento), numero(lives[i])]; }) };
        carteira.chart = { title: "Evolução das vidas ativas", labels: monthly.map(m => m.de.slice(0, 7)), series: [{ label: "Vidas", values: lives }] };
        carteira.paragraphs = [`A carteira passou de ${numero(initial)} para ${numero(final)} vidas ativas no período.`, `Foram registradas ${numero(total.e)} vendas, ${numero(total.s)} cancelamentos e ${numero(total.r)} reativações; o saldo das transferências foi de ${numero(res.transferenciasLiquidas)} e o crescimento, de ${numero(res.crescimento)} vidas.`];
        carteira.considerations = ["Suspensos permanecem nas vidas ativas. Anterior corresponde ao dia anterior ao início; Final, à data final selecionada."];
        const child = base("contratacao", "Vidas por contratação", "AXIS", "carteira_trial_siglas", period, generatedAt);
        try { const siglas = await rpc("carteira_trial_siglas", { p_data: period.ate }); child.status = siglas.length ? "available" : "unavailable"; child.table = { headers: ["Contratação", "Vidas", "% sobre vidas ativas"], rows: siglas.map(r => [String(r.sigla), numero(Number(r.vidas)), percentual(final ? Number(r.vidas) / final : null)]) }; } catch { child.status = "error"; child.notice = "Não foi possível consultar a composição por contratação."; }
        carteira.children = [child];
      })(),
      (async () => {
        // Sinistralidade › Períodos (visão padrão): todos os anos, com o(s) ano(s) do relatório expandido(s).
        const responses = await Promise.all(anosSinistralidade(new Date()).map(({ ano, ateMes }) => rpc("sinistralidade_mv_competencias", { p_ano: ano, p_ate_mes: ateMes })));
        const anos = agruparPorAno(responses.flat().map(d => ({ ano: Number(d.nr_ano), mes: Number(d.nr_mes), soma: { ...somaVazia(), recCpp: Number(d.rec_cpp), recCopart: Number(d.rec_copart), recTotal: Number(d.rec_total), despTotal: Number(d.desp_total) } })));
        if (!anos.length) return;
        const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const linha = (rotulo: string, s: SomaCompetencia) => [rotulo, fmt(s.recCpp), fmt(s.recCopart), fmt(s.recTotal), fmt(s.despTotal), fmt(saldoCompetencia(s)), percentual(sinistralidade(s))];
        const noPeriodo = anos.flatMap(a => a.meses).filter(m => monthly.some(p => p.de.slice(0, 7) === `${m.ano}-${String(m.mes).padStart(2, "0")}`));
        const total = somarTotais(noPeriodo.map(m => m.soma));
        assist.status = "available"; assist.introduction = "Receitas e despesas por ano conforme a visão padrão de Sinistralidade › Períodos, com os meses do ano do relatório expandidos.";
        assist.cards = noPeriodo.length ? [{ label: "Receita total (período)", value: dinheiro(total.recTotal) }, { label: "Despesa total (período)", value: dinheiro(total.despTotal) }, { label: "Saldo (período)", value: dinheiro(saldoCompetencia(total)) }, { label: "Sinistralidade (período)", value: percentual(sinistralidade(total)) }] : [];
        assist.table = { headers: ["Período", "Rec. CPP", "Rec. Copart.", "Rec. Total", "Desp. Total", "Saldo", "Sin"], rows: [...anos.flatMap(a => [linha(String(a.ano), a.soma), ...(years.includes(a.ano) ? a.meses.map(m => linha(`   ${String(m.mes).padStart(2, "0")}/${a.ano}`, m.soma)) : [])]), linha("Total", somarTotais(anos.map(a => a.soma)))] };
        const sel = anos.find(a => years.includes(a.ano)) ?? anos[anos.length - 1];
        assist.chart = { title: `Evolução mensal do saldo · ${sel.ano} (R$)`, labels: sel.meses.map(m => `${sel.ano}-${String(m.mes).padStart(2, "0")}`), series: [{ label: "Saldo", values: sel.meses.map(m => saldoCompetencia(m.soma)) }] };
        assist.paragraphs = noPeriodo.length ? [`No período do relatório, a despesa assistencial foi de ${dinheiro(total.despTotal)}, frente a ${dinheiro(total.recTotal)} de receitas, com sinistralidade de ${percentual(sinistralidade(total))}.`, `O saldo entre receitas e despesas assistenciais no período foi de ${dinheiro(saldoCompetencia(total))}.`] : ["Não há competências fechadas no período do relatório na fonte atual."];
        assist.considerations = [`Foram recuperadas ${noPeriodo.length} de ${monthly.length} competências do período. A tabela reproduz todos os anos disponíveis na tela de Períodos.`];
      })(),
    ]), dreRequest.then(data => ({ data: data.flat(), error: null })).catch((error: Error) => ({ data: [] as DreHRow[], error })), budgetRequest,
  ]);
  axisResults.forEach((result, i) => { if (result.status === "rejected") { const b = i === 0 ? carteira : assist; b.status = "error"; b.notice = "Não foi possível consultar os dados deste tópico. Atualize para tentar novamente."; } });
  // Control › Controladoria › Painel: só meses fechados do balancete (até Ago/2026).
  const dreRows = dreResult.data.filter(r => r.ano !== 2026 || r.mes <= 8);
  if (dreResult.error) { dre.status = "error"; dre.notice = "Não foi possível consultar a DRE do CONTROL."; }
  else if (dreRows.length) {
    dre.status = "available"; dre.introduction = "Indicadores e DRE simplificado conforme Control › Controladoria › Painel, a partir do balancete MV e do plano de contas 9D.";
    const p = resumoPainelDre(dreRows);
    const pf = (x: number) => percentual(p.pctFat(x));
    dre.cards = [{ label: "Resultado Líquido", value: dinheiro(p.liq) }, { label: "Margem líquida", value: pf(p.liq) }, { label: "Faturamento", value: dinheiro(p.fat) }, ...p.cards.map(([label, v]) => ({ label, value: `${dinheiro(v)} · ${pf(v)}` }))];
    dre.table = { headers: ["DRE simplificado", "R$", "% fat."], rows: p.linhas.map(([l, v]) => [l.replace(/−/g, "-"), dinheiro(v), pf(v)]) };
    const covered = monthly.filter(m => dreRows.some(r => `${r.ano}-${String(r.mes).padStart(2, "0")}` === m.de.slice(0, 7)));
    dre.chart = { title: "Resultado mensal da DRE (R$)", labels: covered.map(m => m.de.slice(0, 7)), series: [{ label: "Resultado", values: covered.map(m => resumoPainelDre(dreRows.filter(r => `${r.ano}-${String(r.mes).padStart(2, "0")}` === m.de.slice(0, 7))).liq) }] };
    dre.paragraphs = [`O resultado líquido foi de ${dinheiro(p.liq)}, com margem líquida de ${pf(p.liq)} sobre o faturamento de ${dinheiro(p.fat)}.`, `O EBITDA somou ${dinheiro(p.cards[3][1])} e o resultado antes dos impostos, ${dinheiro(p.cards[5][1])}. Os valores são movimentos mensais, não saldos de encerramento.`];
    dre.considerations = [`Foram recuperadas ${new Set(dreRows.map(r => `${r.ano}-${r.mes}`)).size} de ${monthly.length} competências; o Painel considera apenas meses fechados (até agosto/2026). Meses sem movimento não são tratados como resultado zero confirmado.`];
  }
  dre.children = (["g2", "g3"] as const).map((level, i) => {
    const child = base(level, `3.${i + 1} ${level.toUpperCase()}`, "CONTROL", dre.sourceFunction, period, generatedAt);
    const groups = group(dreRows, level);
    if (groups.length) {
      child.status = "available"; child.cards = [{ label: level.toUpperCase(), value: `${groups.length} grupos` }];
      child.introduction = "Desdobramento da hierarquia efetivamente recuperada do CONTROL.";
      child.table = { headers: ["Grupo / hierarquia", "Valor"], rows: groups.map(([label, value]) => [label.split(" / ").map(strip).join(" / "), dinheiro(value)]) };
      const largest = [...groups].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
      child.paragraphs = [`O nível ${level.toUpperCase()} reúne ${groups.length} agrupamentos, mantendo a vinculação aos níveis superiores da DRE. Seu total reconciliado é ${dinheiro(sum(dreRows))}.`, `O agrupamento de maior valor absoluto é ${largest[0].split(" / ").map(strip).join(" / ")}, com ${dinheiro(largest[1])}. Esse destaque descreve a dimensão do movimento, sem atribuir causas não informadas pela fonte.`];
      child.considerations = ["Os subtotais descrevem os mesmos movimentos da DRE e não devem ser somados novamente ao resultado consolidado."];
    }
    return child;
  });
  if (years.length === 1 && years[0] === 2026 && !budgetResult.error) {
    const rows = mergeOrcamento((budgetResult.data ?? []).map(r => ({ item: r.item, mes: Number(r.nr_mes), previsto: Number(r.previsto), realizado: Number(r.realizado), projetado: Number((r as { projetado?: number }).projetado ?? 0) }))).filter(r => months.includes(r.mes));
    if (rows.length) {
      const real = realizadosOrcamento(dreRows.filter(r => r.mes <= 8)); // CONTROL: only closed months through Aug/2026.
      const items = [...new Set(rows.map(r => r.item))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
      const values = items.map(item => { const selected = rows.filter(r => r.item === item); return { item, previsto: selected.reduce((t, r) => t + r.previsto, 0), realizado: selected.some(r => real.meses.has(r.mes)) ? selected.reduce((t, r) => t + (real.meses.has(r.mes) ? real.valor(r.item, r.mes) : 0), 0) : null, projetado: selected.some(r => r.projetado !== 0) ? selected.reduce((t, r) => t + r.projetado, 0) : null }; });
      const previsto = values.reduce((t, r) => t + r.previsto, 0);
      const realizado = values.some(r => r.realizado !== null) ? values.reduce((t, r) => t + (r.realizado ?? 0), 0) : null;
      const projetado = values.some(r => r.projetado !== null) ? values.reduce((t, r) => t + (r.projetado ?? 0), 0) : null;
      orc.status = "available"; orc.introduction = "Comparação gerencial do orçamento vigente de 2026. O previsto e as projeções usam a fonte existente; o realizado reutiliza a classificação do balancete MV do CONTROL.";
      const fullReal = months.every(m => real.meses.has(m));
      // Control › Orçamento 2026 › DRE (visão padrão: grupos recolhidos, meses sem realizado exibem o Projetado), transposta para A4.
      orc.introduction = "DRE do orçamento conforme Control › Orçamento 2026 › DRE: realizado do balancete MV nos meses fechados e projetado nos demais; linhas da tela apresentadas em colunas.";
      const tela = aplicarRealizadoMv(rows, dreRows.filter(r => r.ano === 2026));
      const { comReal, soma } = valoresOrcamento(tela);
      const grupos = gruposOrcamentoDre(items);
      const ultimo = comReal.size ? Math.max(...comReal) : 0;
      const mesesTela = [...new Set(tela.map(r => r.mes))].sort((a, b) => a - b);
      const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const colunas: [string, number[]][] = [];
      for (const m of mesesTela) { colunas.push([`${nomes[m - 1]}/${years[0]}`, [m]]); if (m === ultimo && m !== mesesTela[mesesTela.length - 1]) colunas.push(["Parcial", mesesTela.filter(x => x <= ultimo)]); }
      const rotuloAcum = mesesTela.every(m => comReal.has(m)) ? "Realizado" : "Projetado";
      colunas.push([`Acumulado (${rotuloAcum})`, mesesTela]);
      const f2 = (v: number) => Math.abs(v) < 0.005 ? "-" : (v < 0 ? `(${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      const nomesCol = grupos.map(g => g.label);
      orc.table = { headers: ["Competência", ...nomesCol, "Res. antes impostos", "Impostos Federais", "Resultado Líquido"], rows: colunas.map(([rot, ms]) => { const rai = soma(items, ms).realizado; return [rot, ...grupos.map(g => f2(soma(g.items, ms).realizado)), f2(rai), f2(impostosFederais(rai)), f2(resultadoLiquido(rai))]; }) };
      const acum = soma(items, mesesTela);
      orc.cards = [{ label: "Previsto · Res. antes impostos", value: dinheiro(acum.previsto) }, { label: `${rotuloAcum} · Res. antes impostos`, value: dinheiro(acum.realizado) }, { label: `${rotuloAcum} · Resultado Líquido`, value: dinheiro(resultadoLiquido(acum.realizado)) }];
      const budgetMonths = months.filter(m => rows.some(r => r.mes === m));
      const projectionFull = budgetMonths.every(m => rows.some(r => r.mes === m && r.projetado !== 0));
      orc.chart = { title: "Previsto e projeção disponível por mês (R$)", labels: budgetMonths.map(m => `${years[0]}-${String(m).padStart(2, "0")}`), series: [{ label: "Previsto", values: budgetMonths.map(m => rows.filter(r => r.mes === m).reduce((t, r) => t + r.previsto, 0)) }, ...(projetado === null || !projectionFull ? [] : [{ label: "Projetado", values: budgetMonths.map(m => rows.filter(r => r.mes === m).reduce((t, r) => t + r.projetado, 0)) }])] };
      orc.paragraphs = [`O previsto consolidado é de ${dinheiro(previsto)}. ${realizado === null ? "Não há realizado confirmado para os meses selecionados." : `O realizado disponível é ${dinheiro(realizado)}${fullReal ? "." : ", com cobertura parcial do período."}`}`, projetado === null ? "Não há projeção identificada para este período na fonte atual." : `As projeções já registradas somam ${dinheiro(projetado)}. Não foi criada nova extrapolação financeira.`];
      orc.considerations = ["O orçamento atual possui referência fixa em 2026; meses fechados para o realizado seguem o CONTROL (até agosto/2026). Complementos locais existentes são mantidos e identificados como parte da fonte CONTROL.", "Desvios só são calculados com cobertura equivalente de competências. Ausência de realizado não significa execução zero; natureza de conta não identificada não recebe classificação favorável/desfavorável."];
      orc.children = ["Previsto", "Realizado", "Projetado", "Desvios"].map((name, i) => {
        const child = base(`orc-${i}`, `4.${i + 1} ${name}`, "CONTROL", orc.sourceFunction, period, generatedAt);
        child.introduction = ["Referência planejada para acompanhamento gerencial.", "Execução consolidada no período selecionado.", "Estimativa de encerramento com base nas informações disponíveis.", "Variações entre referência, realização e projeção."][i];
        const available = i === 0 || (i === 1 ? realizado !== null : i === 2 ? projetado !== null : fullReal && realizado !== null);
        if (available) { child.status = "available"; child.cards = [{ label: name, value: i === 0 ? dinheiro(previsto) : i === 1 ? dinheiro(realizado ?? 0) : i === 2 ? dinheiro(projetado ?? 0) : dinheiro((realizado ?? 0) - previsto) }]; child.paragraphs = [i === 3 ? `A variação do resultado consolidado entre realizado e previsto foi de ${dinheiro((realizado ?? 0) - previsto)}.` : orc.paragraphs[i === 0 || i === 1 ? 0 : 1], i === 3 ? "A diferença apresentada usa realizado menos previsto, apenas nas competências com realização confirmada. O sinal não determina, sozinho, a favorabilidade." : "Os valores deste bloco correspondem à mesma seleção aplicada na tabela gerencial e não constituem uma nova base de cálculo."]; child.considerations = [orc.considerations[i === 3 ? 1 : 0]];
          if (i === 3) child.table = { headers: ["Comparação", "Variação"], rows: [["Realizado − Previsto", dinheiro((realizado ?? 0) - previsto)], ["Projetado − Previsto", projetado === null || !projectionFull ? "—" : dinheiro(projetado - previsto)], ["Realizado − Projetado", projetado === null || !projectionFull ? "—" : dinheiro((realizado ?? 0) - projetado)]] };
        }
        return child;
      });
    }
  } else { orc.notice = budgetResult.error ? "Não foi possível consultar o orçamento do CONTROL." : "O orçamento vigente identificado tem referência em 2026; não há fonte compatível para o ano selecionado."; orc.status = budgetResult.error ? "error" : "unavailable"; }
  progress("Compondo o relatório…");
  const blocks = [carteira, assist, dre, orc];
  return { period: { ...period }, generatedAt, blocks, conclusions: blocks.map(b => `${b.title.replace(/^\d+\. /, "")}: ${b.status === "available" ? b.paragraphs[0] : UNAVAILABLE}`) };
}