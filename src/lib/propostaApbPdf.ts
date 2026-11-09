import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FAIXAS_APB, PLANO_NOVO, tabelaLinear, tabelaDependente } from "@/lib/propostaApb";
import type { VariaveisApb } from "@/lib/propostaApbDefaults";
import { LIMITES_PADRAO, NOTAS_COPART_2027, fmtLimite, linhasComLimites, type LimitesCopart } from "@/lib/propostaApbCopart";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function montarPropostaPdf(estrategico: VariaveisApb, limites: LimitesCopart = LIMITES_PADRAO) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const azul: [number, number, number] = [31, 78, 121];
  doc.setFontSize(18); doc.setTextColor(...azul); doc.text("Proposta APB", 14, 20);
  doc.setFontSize(10); doc.setTextColor(90); doc.text(`Plano ${PLANO_NOVO} · gerada em ${new Date().toLocaleDateString("pt-BR")}`, 14, 27);
  doc.setFontSize(13); doc.setTextColor(...azul); doc.text("1. Tabela de preços proposta — Estratégico", 14, 40);
  const titular = tabelaLinear(estrategico.linEnf), dependente = tabelaDependente(estrategico.depBase);
  autoTable(doc, {
    startY: 44, head: [
      [{ content: "Faixa etária", rowSpan: 2 }, { content: "Titular", colSpan: 2 }, { content: "Dependente", colSpan: 2 }],
      ["Enfermaria", "Apartamento", "Enfermaria", "Apartamento"],
    ],
    body: FAIXAS_APB.map((f, i) => [f, ...(i === 0 ? titular.map((v) => ({ content: brl(v), rowSpan: FAIXAS_APB.length, styles: { valign: "middle" as const, fontStyle: "bold" as const } })) : []), brl(dependente[i][0]), brl(dependente[i][1])]),
    headStyles: { fillColor: azul, halign: "center", valign: "middle" }, styles: { fontSize: 10, halign: "center", lineWidth: 0.1 }, theme: "grid",
  });
  doc.addPage();
  doc.setFontSize(13); doc.setTextColor(...azul); doc.text(`2. Tabela de coparticipação — Plano Proposto ${PLANO_NOVO}`, 14, 20);
  const L = linhasComLimites(limites);
  const body = L.map((l, i) => {
    const first = i === 0 || L[i - 1].n !== l.n; const span = L.filter((x) => x.n === l.n).length;
    const cells: any[] = first ? [{ content: String(l.n), rowSpan: span, styles: { valign: "middle" } }, { content: l.nota ? `${l.g} ${l.nota}` : l.g, rowSpan: span, styles: { valign: "middle", fontStyle: "bold" } }] : [];
    return [...cells, l.s, l.f, l.p, fmtLimite(l.limite)];
  });
  autoTable(doc, {
    startY: 24, head: [["#", "Grupo", "Subgrupo", "Forma de cobrança", "% copart.", "Limite (R$)"]], body,
    headStyles: { fillColor: azul, halign: "center" }, styles: { fontSize: 8.5, halign: "center", lineWidth: 0.1 }, theme: "grid",
    columnStyles: { 5: { halign: "right" } },
  });
  let y = ((doc as any).lastAutoTable?.finalY ?? 200) + 6;
  doc.setFontSize(7.5); doc.setTextColor(90);
  for (const nota of NOTAS_COPART_2027) {
    const linhas = doc.splitTextToSize(nota, 182);
    if (y + linhas.length * 3.5 > 285) { doc.addPage(); y = 20; }
    doc.text(linhas, 14, y); y += linhas.length * 3.5 + 2;
  }
  return doc;
}
