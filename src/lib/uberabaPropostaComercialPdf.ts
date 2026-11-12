import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import { PDF_COLORS, baseTableStyles, drawReportHeading, drawSectionTitle } from "@/lib/pdfTheme";

// Proposta Comercial Bensaúde|Uberaba — por ora, conteúdo provisório em Lorem ipsum.
const LOREM = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Cras mattis consectetur purus sit amet fermentum. Donec ullamcorper nulla non metus auctor fringilla.",
  "Sed posuere consectetur est at lobortis. Maecenas faucibus mollis interdum. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Nullam quis risus eget urna mollis ornare vel eu leo. Aenean lacinia bibendum nulla sed consectetur.",
  "Curabitur blandit tempus porttitor. Etiam porta sem malesuada magna mollis euismod. Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.",
];

const SECOES = [
  "1. Apresentação",
  "2. Objeto da proposta",
  "3. Produtos e modalidades",
  "4. Condições comerciais",
  "5. Rede assistencial",
  "6. Vigência e validade",
];

export function buildPropostaComercialPdf(timbradoDataUrl?: string | null): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbradoDataUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  // O traço azul do timbrado termina em ~31 mm; o título começa uma linha de texto (≈5 mm) abaixo dele, em todas as páginas.
  const marginL = 18, marginR = 18, top = 59, bottom = 20;
  const usableW = pageW - marginL - marginR;
  const heading = () => drawReportHeading(doc, {
    title: "Proposta Comercial",
    plano: "Bensaúde|Uberaba",
    secao: "Minuta provisória · conteúdo em Lorem ipsum",
    marginL, marginR, top: 38,
  });
  heading();
  let y = top;
  const novaPagina = () => { doc.addPage(); heading(); y = top; };
  const garantir = (h: number) => { if (y + h > pageH - bottom) novaPagina(); };

  const fonteTexto = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.text);
  };
  const paragrafo = (texto: string) => {
    fonteTexto();
    const linhas = doc.splitTextToSize(texto, usableW - 2) as string[];
    const h = linhas.length * 4.8;
    garantir(h);
    fonteTexto(); // o cabeçalho de uma nova página altera a fonte
    doc.text(linhas, marginL, y, { align: "justify", maxWidth: usableW - 2, lineHeightFactor: 1.35 });
    y += h + 3;
  };

  SECOES.forEach((titulo, i) => {
    garantir(16);
    drawSectionTitle(doc, titulo, marginL, y, pageW - marginR);
    y += 8;
    if (titulo.startsWith("4.")) {
      paragrafo(LOREM[0]);
      autoTable(doc, {
        ...baseTableStyles(9),
        startY: y,
        margin: { left: marginL, right: marginR, top, bottom },
        head: [["Lorem", "Ipsum", "Dolor", "Sit amet"]],
        body: Array.from({ length: 4 }, (_, k) => [`Lorem ${k + 1}`, "Ipsum dolor", "0,00", "0,00"]),
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
        didDrawPage: (d) => { if (d.pageNumber > 1) heading(); },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 6;
    }
    LOREM.slice(0, i % 2 === 0 ? 3 : 2).forEach(paragrafo);
    y += 2;
  });

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(`Página ${p} de ${total}`, pageW - marginR, pageH - 10, { align: "right" });
  }
  return doc;
}
