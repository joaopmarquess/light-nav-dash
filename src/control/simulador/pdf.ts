import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { baseTableStyles, PDF_COLORS } from "@/control/relatorio/pdfTheme";
import type { ViewShots } from "./capture";
import { calculateBudget, ETAPAS, pdfEligible, total, viewModel, VISOES, type BudgetModel, type SimulationRecord } from "./model";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export function stageRows(model: BudgetModel, stage: number): [string, number[]][] {
  const c = calculateBudget(model), neg = (vs: number[]) => vs.map(v=>-v);
  switch(stage) {
    case 0: return [["Faturamento",c.fat],["Operacionais Primários",c.prim],["Operacionais Secundários",neg(c.demais)],["Operacionais Totais",c.totalOp],["EBITDA",c.ebitda],["Financeiro",c.fin],["Resultado antes dos Impostos",c.rai],["Impostos Federais",neg(c.imp)],["Resultado Líquido",c.liq]];
    case 1: return [...model.rows.map(r=>[r.id,months.map((_,i)=>(r.vidas+(i+1)*(r.entradas-r.saidas))*r.ticket*Math.pow(1+model.reaj_v2/100,i))] as [string,number[]]),["Faturamento",c.fat]];
    case 2: return [["Faturamento",c.fat],["Coparticipação",c.cop],["Entradas Operacionais",c.ent]];
    case 3: return [["Faturamento",c.fat],["Coparticipação",c.cop],["Entradas Operacionais",c.ent],["Rede",c.rede],["Benê",c.bene],["Despesas Assistenciais",c.desp]];
    case 4: return [["Faturamento",c.fat],...c.op.map((v,i)=>[["Comercialização","Impostos Diretos","Provisões","Secundárias"][i],v] as [string,number[]]),["Demais Operacionais",c.demais]];
    case 5: return [["Faturamento",c.fat],...c.admParts.map((v,i)=>[["Pessoal","Informática","Marketing","Demais"][i],v] as [string,number[]]),["Despesas Administrativas",c.adm]];
    case 6: return [["Faturamento",c.fat],["Financeiro",c.fin]];
    default: return [["Faturamento",c.fat],["Coparticipação",c.cop],["Entradas Operacionais",c.ent],["Rede",neg(c.rede)],["Benê",neg(c.bene)],["Despesas Assistenciais",neg(c.desp)],...c.op.map((v,i)=>[["Comercialização","Impostos Diretos","Provisões","Secundárias"][i],neg(v)] as [string,number[]]),["Demais Operacionais",neg(c.demais)],...c.admParts.map((v,i)=>[["Pessoal","Informática","Marketing","Demais"][i],neg(v)] as [string,number[]]),["Despesas Administrativas",neg(c.adm)],["Operacionais Totais",c.totalOp],["EBITDA",c.ebitda],["Financeiro",c.fin],["Resultado antes dos Impostos",c.rai],["Impostos Federais",neg(c.imp)],["Resultado Líquido",c.liq]];
  }
}
export function createSimulatorPdf(sim: SimulationRecord, responsible: string, shots?: ViewShots) {
  if (!pdfEligible(sim)) throw new Error("Conclua e grave as três visões antes de gerar o PDF final.");
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const generated = new Date(), footerLabels: string[] = ["Capa"], viewPages: number[] = [];
  const heading = (title: string, hy = 24) => { doc.setFont("helvetica","bold"); doc.setFontSize(hy===24?16:12); doc.setTextColor(...PDF_COLORS.navy); doc.text(title,14,hy); doc.setFont("helvetica","normal"); doc.setTextColor(...PDF_COLORS.text); };
  const table = (head: string[][], body: (string|number)[][], startY = 34) => autoTable(doc,{ ...baseTableStyles(7), startY, margin: { top: 20, bottom: 18, left:14,right:14 }, head, body, styles:{ ...baseTableStyles(7).styles, fontSize:head[0].length>11?6:7, overflow:"linebreak", cellPadding:head[0].length>11?0.8:1.8 }, rowPageBreak:"avoid", columnStyles: head[0].length>11 ? {0:{cellWidth:40},...Object.fromEntries(head[0].slice(1).map((_,i)=>[i+1,{halign:"right",cellWidth:(269-40)/(head[0].length-1)}]))} : head[0].length>5 ? {0:{cellWidth:42}} : {}, didDrawPage: () => { footerLabels[doc.getNumberOfPages()-1] ??= footerLabels[doc.getNumberOfPages()-2]; } });
  heading("Projeto CONTROL"); doc.setFontSize(30); doc.text("Simulador",14,68); doc.setFontSize(16); doc.text(doc.splitTextToSize(sim.name,260),14,86); doc.setFontSize(11); doc.text(`Identificação: ${sim.id}`,14,116); doc.text(doc.splitTextToSize(`Responsável: ${responsible}`,260),14,127); doc.text(`Gerado em: ${generated.toLocaleString("pt-BR")}`,14,143);
  doc.addPage(); footerLabels.push("Sumário"); heading("Sumário das visões");
  const summaryPage = doc.getNumberOfPages();
  const views = [...sim.simulador_visoes].sort((a,b)=>a.position-b.position);
  for (const v of views) {
    const m = viewModel(v); viewPages.push(doc.getNumberOfPages()+1);
    doc.addPage(); footerLabels[doc.getNumberOfPages()-1]=VISOES[v.position]; heading(`Visão ${VISOES[v.position]}`);
    let y=32;
    const last=()=>((doc as unknown as {lastAutoTable?:{finalY:number}}).lastAutoTable?.finalY ?? y);
    for (let stage=0;stage<8;stage++) {
      const img = shots?.[v.position]?.[stage];
      const need = img ? Math.min(img.h*269/img.w, 150) + 10 : 25;
      if (y+need>186 && y>40) { doc.addPage(); footerLabels[doc.getNumberOfPages()-1]=VISOES[v.position]; y=20; }
      heading(`${VISOES[v.position]} · ${ETAPAS[stage]}`, y+4); y+=10;
      if (!img && stage===1) {
        table([["Plano","Vidas 2026","Ticket médio","Mensal 2026","Anual 2026","Entradas/mês","Saídas/mês","Crescimento","Vidas 2027","Mensal 2027","Anual 2027"]],m.rows.map(r=>{const annual=total(months.map((_,i)=>(r.vidas+(i+1)*(r.entradas-r.saidas))*r.ticket*Math.pow(1+m.reaj_v2/100,i)));return [r.id,fmt(r.vidas),fmt(r.ticket),fmt(r.vidas*r.ticket),fmt(r.vidas*r.ticket*12),fmt(r.entradas),fmt(r.saidas),fmt(12*(r.entradas-r.saidas)),fmt(r.vidas+12*(r.entradas-r.saidas)),fmt(annual/12),fmt(annual)];}),y); y=last()+6;
        doc.setFontSize(9); doc.text(`Correção de discrepâncias: ${fmt(m.reaj_v2)}%`,14,y); y+=8;
      } else if (!img && stage>1 && stage<7) {
        const params: Record<number,string>={2:`Recuperação: ${fmt(m.rec_v2)}%`,3:`Sinistralidade líquida: ${fmt(m.sinLiq_v2)}% · Rede: ${fmt(m.rede_v2)}%`,4:`Percentuais: ${m.demaisOp.map(fmt).join("% · ")}%`,5:`Pessoal: ${fmt(m.admPc_v4[0])}% · Informática: ${fmt(m.admPc_v4[1])}% · Marketing: ${fmt(m.admPc_v4[2])}% · Total: ${fmt(m.admTot_v4)}%`,6:`Financeiro: ${fmt(m.finPc_v2)}%`};
        doc.setFontSize(9); doc.text(params[stage],14,y); y+=10;
      }
      if (img) {
        let w=269, h=img.h*w/img.w;
        const room=192-y; if (h>room) { h=room; w=img.w*h/img.h; }
        doc.addImage(img.data,"JPEG",14,y,w,h); y+=h+8;
      } else if (stage===0) {
        const c=calculateBudget(m), fat=total(c.fat);
        table([["Indicador","Total anual (R$)","% do faturamento"]],stageRows(m,0).map(([n,vs])=>[n,fmt(total(vs)),fat?`${fmt(total(vs)/fat*100)}%`:"—"]),y); y=last()+4;
        table([["DRE simplificada","Total anual (R$)","% do faturamento"]],[["Entradas Operacionais",c.ent],["Despesas Assistenciais",c.desp.map(v=>-v)],["Demais Operacionais",c.demais.map(v=>-v)],["Operacionais Totais",c.totalOp],["Despesas Administrativas",c.adm.map(v=>-v)],["EBITDA",c.ebitda],["Financeiro",c.fin],["Resultado antes dos Impostos",c.rai],["Impostos Federais",c.imp.map(v=>-v)],["Resultado Líquido",c.liq]].map(([n,vs])=>[String(n),fmt(total(vs as number[])),fat?`${fmt(total(vs as number[])/fat*100)}%`:"—"]),y); y=last()+8;
      } else { table([["R$ · 2027",...months,"Total"]],stageRows(m,stage).map(([n,vs])=>[n,...vs.map(fmt),fmt(total(vs))]),y); y=last()+8; }
    }
  }
  doc.addPage(); footerLabels[doc.getNumberOfPages()-1]="Comparativo final"; heading("Quadro comparativo final");
  const all=views.map(v=>calculateBudget(viewModel(v)));
  const indicators: [string,keyof ReturnType<typeof calculateBudget>][]=[["Faturamento","fat"],["Coparticipação","cop"],["Despesas Assistenciais","desp"],["Demais Operacionais","demais"],["Despesas Administrativas","adm"],["Resultado Financeiro","fin"],["Operacionais Primários","prim"],["Operacionais Totais","totalOp"],["EBITDA","ebitda"],["Resultado antes dos Impostos","rai"],["Impostos Federais","imp"],["Resultado final da DRE","liq"]];
  table([["Indicador (R$)",...VISOES]],indicators.map(([n,k])=>[n,...all.map(c=>fmt(total(c[k] as number[])))]));
  const end=doc.getNumberOfPages(); doc.setPage(summaryPage);
  table([["Visão","Página inicial","Conteúdo"]],VISOES.map((v,i)=>[v,viewPages[i],ETAPAS.join(" · ")]).concat([["Comparativo final",end,"Indicadores das três visões"]]));
  for (let p=1;p<=doc.getNumberOfPages();p++) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(...PDF_COLORS.muted); const lb=footerLabels[p-1] ?? "Simulador"; doc.text(`${(VISOES as readonly string[]).includes(lb)?`Visão ${lb}`:lb} | ${p} de ${doc.getNumberOfPages()}`,14,201); }
  return doc;
}
export async function downloadSimulatorPdf(sim: SimulationRecord,responsible: string) { const { captureViewScreens } = await import("./capture"); const shots = await captureViewScreens(sim); const safe=sim.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_").slice(0,80); const date=new Date().toISOString().replace(/[:.]/g,"-"); createSimulatorPdf(sim,responsible,shots).save(`CONTROL_Simulador_${safe}_${date}.pdf`); }