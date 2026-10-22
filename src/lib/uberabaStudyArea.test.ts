import { describe, expect, it } from "vitest";
import { isAdditionalUberabaStudyMember } from "./uberabaStudyArea";

describe("additional green Uberaba study municipalities", () => {
  it.each(["Gurinhatã", "Ipiaçu", "Santa Vitória", "Cachoeira Dourada", "Cascalho Rico"])("includes MG / %s", (name) => {
    expect(isAdditionalUberabaStudyMember("MG", name)).toBe(true);
    expect(isAdditionalUberabaStudyMember("GO", name)).toBe(false);
  });
  it("does not include unrequested municipalities", () => {
    expect(isAdditionalUberabaStudyMember("MG", "Belo Horizonte")).toBe(false);
  });
});