import { describe, expect, it } from "vitest";
import { insideMAA, isExplicitMAAMember, maaFillRole, outerMAARings, smoothMAAPath } from "./maaGeometry";

const ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
describe("MAA municipality rules", () => {
  it.each([
    ["MG", "Limeira do Oeste"],
    ["MG", "Campina verde"],
    ["MG", "Comendador Gomes"],
    ["GO", "Chapadão do Céu"],
    ["GO", "Mineiros"],
    ["MS", "Costa Rica"],
  ])("includes %s / %s independently of lives", (uf, name) => {
    expect(isExplicitMAAMember(uf, name)).toBe(true);
    expect(maaFillRole(isExplicitMAAMember(uf, name), false, 0)).toBe("member");
    expect(isExplicitMAAMember("SP", name)).toBe(false);
  });
  it("keeps disconnected external areas while removing internal island outlines", () => {
    const hole = [[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]];
    const separate = [[20, 0], [22, 0], [22, 2], [20, 2], [20, 0]];
    expect(outerMAARings([ring, hole, separate])).toEqual([ring, separate]);
  });
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