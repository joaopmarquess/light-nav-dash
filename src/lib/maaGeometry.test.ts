import { describe, expect, it } from "vitest";
import { insideMAA, maaFillRole, smoothMAAPath } from "./maaGeometry";

const ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
describe("MAA municipality rules", () => {
  it("classifies an internal island using the original outer ring", () => {
    expect(insideMAA([5, 5], ring)).toBe(true);
    expect(maaFillRole(false, insideMAA([5, 5], ring), 0)).toBe("island");
  });
  it("classifies municipalities with lives outside MAA separately", () => {
    expect(insideMAA([12, 5], ring)).toBe(false);
    expect(maaFillRole(false, false, 71)).toBe("outside-with-lives");
  });
  it("preserves member classification regardless of total", () => {
    expect(maaFillRole(true, true, 5000)).toBe("member");
  });
  it("creates a closed rounded outline without mutating the classification ring", () => {
    expect(smoothMAAPath(ring)).toContain("Q");
    expect(smoothMAAPath(ring).endsWith("Z")).toBe(true);
    expect(ring).toEqual([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
  });
});