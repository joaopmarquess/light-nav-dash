import { describe, expect, it } from "vitest";
import { availableQuarters, quarterFilename } from "../../supabase/functions/bench-c/quarterFiles";

describe("arquivos históricos oficiais ANS", () => {
  it("descobre os quatro trimestres de 2017 incluindo o nome legado do terceiro", () => {
    const directory = '<a href="1T2017.zip">1</a><a href="2T2017.zip">2</a><a href="3-Trimestre.zip">3</a><a href="4T2017.zip">4</a>';
    expect(availableQuarters(directory, 2017)).toEqual([1, 2, 3, 4]);
    expect(quarterFilename(2017, 3)).toBe("3-Trimestre.zip");
    expect(quarterFilename(2015, 3)).toBe("3T2015.zip");
    expect(availableQuarters(directory, 2015)).toEqual([]);
  });
});