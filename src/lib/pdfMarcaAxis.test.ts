import { describe, expect, it } from "vitest";
import jsPDF from "jspdf";
import { aplicarMarcaAxis } from "@/lib/pdfMarcaAxis";

// PNG 1×1 válido, só para o teste.
const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const marcar = (logo: string | null) => {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
  doc.addPage(); doc.addPage();
  aplicarMarcaAxis(doc, logo, (_p, w, h) => ({ x: w / 2, y: h - 5, align: "center" }));
  return doc.output();
};

describe("marca do AXIS nos PDFs", () => {
  it("com a logo, entra em todas as páginas sem repetir a palavra AXIS no texto", () => {
    const bruto = marcar(LOGO);
    expect(bruto.match(/\| Executive Intelligence Platform/g)?.length).toBe(3);
    expect(bruto).not.toMatch(/AXIS \| Executive/);
    expect(bruto.match(/by D.nis Santana/g)?.length).toBe(3);
  });

  it("sem a logo, escreve AXIS no texto para a marca não sumir", () => {
    expect(marcar(null).match(/AXIS \| Executive Intelligence Platform/g)?.length).toBe(3);
  });
});
