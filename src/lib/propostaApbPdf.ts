import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FAIXAS_APB, PRECOS_PROPOSTA, PLANO_NOVO } from "@/lib/propostaApb";
import { LINHAS_COPART_FACIL50 } from "@/components/PropostaApbCopart";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function montarPropostaPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const azul: [number, number, number] = [31, 78, 121];
  doc.setFontSize(18); doc.setTextColor(...azul); doc.text("Proposta APB", 14, 20);
  doc.setFontSize(10); doc.setTextColor(90); doc.text(`Plano ${PLANO_NOVO} · gerada em ${new Date().toLocaleDateString("pt-BR")}`, 14, 27);
  doc.setFontSize(13); doc.setTextColor(...azul); doc.text("1. Tabela de preços proposta", 14, 40);
  autoTable(doc, {
    startY: 44, head: [["Faixa etária", "Enfermaria", "Apartamento"]],
    body: FAIXAS_APB.map((f, i) => [f, brl(PRECOS_PROPOSTA[i][0]), brl(PRECOS_PROPOSTA[i][1])]),
    headStyles: { fillColor: azul, halign: "center" }, columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } }, styles: { fontSize: 10 },
  });
  doc.addPage();
  doc.setFontSize(13); doc.setTextColor(...azul); doc.text("2. Tabela de coparticipação — Fácil 50 sem teto", 14, 20);
  const L = LINHAS_COPART_FACIL50;
  const body = L.map((l, i) => {
    const first = i === 0 || L[i - 1].n !== l.n; const span = L.filter((x) => x.n === l.n).length;
    const cells: any[] = first ? [{ content: String(l.n), rowSpan: span, styles: { valign: "middle" } }, { content: l.g, rowSpan: span, styles: { valign: "middle", fontStyle: "bold" } }] : [];
    return [...cells, l.s, l.f, l.p, l.v];
  });
  autoTable(doc, {
    startY: 24, head: [["#", "Grupo", "Subgrupo", "Forma de cobrança", "% copart.", "Limite (R$)"]], body,
    headStyles: { fillColor: azul, halign: "center" }, styles: { fontSize: 8.5, halign: "center", lineWidth: 0.1 }, theme: "grid",
  });
  return doc;
}
export const gerarPropostaPdf = () => montarPropostaPdf().save(`Proposta_APB_${PLANO_NOVO}.pdf`);
