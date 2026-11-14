import { describe, expect, it } from "vitest";
import jsPDF from "jspdf";
import { aplicarMarcaAxis } from "@/lib/pdfMarcaAxis";

describe("marca do AXIS nos PDFs", () => {
  it("entra em todas as páginas com a expressão e o autor", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
    doc.addPage(); doc.addPage();
    aplicarMarcaAxis(doc, null, (_p, w, h) => ({ x: w / 2, y: h - 5, align: "center" }));
    const bruto = doc.output();
    expect(bruto.match(/AXIS \| Executive Intelligence Platform/g)?.length).toBe(3);
    expect(bruto.match(/by D.nis Santana/g)?.length).toBe(3);
  });
});
