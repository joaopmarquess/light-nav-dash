import { hostinger } from "./hostingerClient";
import { supabase } from "@/integrations/supabase/client";
import { loadDreHostinger, type DreHRow } from "@/control/dreHostinger";
import { mergeOrcamento } from "@/control/orcamentoLocal";
import { realizadosOrcamento } from "@/control/orcamentoRegras";
import { datasVidasIndicadores, mesesMovimentacao, somarTotaisMovimentacao } from "./movimentacaoCarga";
import { avaliarDesvio, dinheiro, numero, percentual, type ReportPeriod } from "./controladoriaRegras";
import { saldoCompetencia, sinistralidade, somaVazia, somarTotais, type SomaCompetencia } from "./sinistralidadeCompetencias";

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
  const dreRows = dreResult.data;
  if (dreResult.error) { dre.status = "error"; dre.notice = "Não foi possível consultar a DRE do CONTROL."; }
  else if (dreRows.length) {
    dre.status = "available"; dre.introduction = "Demonstração gerencial derivada do balancete MV e do plano de contas 9D, com a hierarquia e o tratamento de crédito menos débito utilizados no CONTROL.";
    const total = sum(dreRows), groups = group(dreRows, "g1");
    dre.cards = [{ label: "Resultado consolidado", value: dinheiro(total) }, ...groups.map(([label, v]) => ({ label: strip(label), value: dinheiro(v) }))];
    // Preserve every hierarchy path; do not sum subtotal rows again.
    dre.table = { headers: ["G1", "G2", "G3", "G4", "Valor"], rows: [...new Set(dreRows.map(r => [r.g1, r.g2, r.g3, r.g4].join("~")))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })).map(key => { const gs = key.split("~"); return [...gs.map(strip), dinheiro(sum(dreRows.filter(r => [r.g1, r.g2, r.g3, r.g4].join("~") === key)))]; }) };
    const covered = monthly.filter(m => dreRows.some(r => `${r.ano}-${String(r.mes).padStart(2, "0")}` === m.de.slice(0, 7)));
    dre.chart = { title: "Resultado mensal da DRE (R$)", labels: covered.map(m => m.de.slice(0, 7)), series: [{ label: "Resultado", values: covered.map(m => sum(dreRows.filter(r => `${r.ano}-${String(r.mes).padStart(2, "0")}` === m.de.slice(0, 7)))) }] };
    dre.paragraphs = [`O resultado consolidado da DRE foi de ${dinheiro(total)} no período recuperado.`, `A estrutura mantém ${groups.length} grupos G1 e os respectivos desdobramentos G2, G3 e G4. Os valores são movimentos mensais, não saldos de encerramento.`];
    dre.considerations = [`Foram recuperadas ${new Set(dreRows.map(r => `${r.ano}-${r.mes}`)).size} de ${monthly.length} competências. Meses sem movimento retornado não são tratados como resultado zero confirmado.`];
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
      orc.cards = [{ label: "Previsto", value: dinheiro(previsto) }, { label: fullReal ? "Realizado" : "Realizado disponível (parcial)", value: realizado === null ? "—" : dinheiro(realizado) }, { label: "Projetado disponível", value: projetado === null ? "—" : dinheiro(projetado) }];
      const nature = (item: string): "receita" | "despesa" | "indefinida" => /^(01|02)\|/.test(item) ? "receita" : /^(03|05|06|08|09|10|11)\|/.test(item) ? "despesa" : "indefinida";
      orc.table = { headers: ["Item", "Previsto", "Realizado", "Projetado", "Desvio real. − prev."], rows: values.map(r => { const d = r.realizado === null || !fullReal ? null : avaliarDesvio(r.previsto, r.realizado, nature(r.item)); return [strip(r.item), dinheiro(r.previsto), r.realizado === null ? "—" : dinheiro(r.realizado), r.projetado === null ? "—" : dinheiro(r.projetado), d ? `${dinheiro(d.desvio)}\n${d.status}` : "—"]; }) };
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