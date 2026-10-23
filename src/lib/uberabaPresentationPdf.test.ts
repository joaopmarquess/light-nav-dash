import { describe, expect, it, vi } from "vitest";
import jsPDF from "jspdf";
import { createPresentationPdf } from "./uberabaPresentationPdf";

describe("Frozen Uberaba PDF", () => {
  it("exports exactly 31 pages without a trailing page", () => {
    const addImage = vi.spyOn(jsPDF.API, "addImage").mockReturnThis();
    try {
      const pdf = createPresentationPdf(Array.from({ length: 31 }, (_, i) => `image-${i}`));
      expect(pdf.getNumberOfPages()).toBe(31);
    } finally { addImage.mockRestore(); }
  });

  it("keeps every image edge within an exact full-bleed 16:9 page", () => {
    const addImage = vi.spyOn(jsPDF.API, "addImage").mockReturnThis();
    try {
      const pdf = createPresentationPdf(Array.from({ length: 31 }, (_, i) => `image-${i}`));
      for (let page = 1; page <= 31; page++) {
        pdf.setPage(page);
        expect(pdf.internal.pageSize.getWidth()).toBe(1440);
        expect(pdf.internal.pageSize.getHeight()).toBe(810);
        expect(pdf.internal.pageSize.getWidth() / pdf.internal.pageSize.getHeight()).toBeCloseTo(16 / 9, 10);
        expect(addImage.mock.calls[page - 1].slice(1, 5)).toEqual([0, 0, 1440, 810]);
      }
    } finally { addImage.mockRestore(); }
  });

  it("rejects a partial deck rather than exporting missing slides", () => {
    expect(() => createPresentationPdf(Array.from({ length: 30 }, () => "image"))).toThrow();
  });
});