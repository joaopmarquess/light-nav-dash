import { describe, expect, it } from "vitest";
import { htmlImpressao } from "./pdfImpressao";

const quebras = (html: string) => (html.match(/break-after:page/g) ?? []).length;

describe("Impressão dos relatórios em PDF", () => {
  it("breaks only between pages, never after the last one (no blank sheet)", () => {
    expect(quebras(htmlImpressao(["a", "b", "c"], false))).toBe(2);
  });
  it("a one-page report has no page break", () => {
    expect(quebras(htmlImpressao(["a"], false))).toBe(0);
  });
  it("prints one block per page", () => {
    expect((htmlImpressao(["a", "b", "c"], false).match(/class="pg"/g) ?? []).length).toBe(3);
  });
});
