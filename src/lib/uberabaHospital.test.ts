import { describe, expect, it } from "vitest";
import { HOSPITAL_PALMERIO } from "./uberabaHospital";
describe("Indicadores institucionais fornecidos do hospital", () => {
  it("mantém 220 leitos", () => expect(HOSPITAL_PALMERIO.quantidade_leitos).toBe(220));
  it("mantém atendimento 24h", () => expect(HOSPITAL_PALMERIO.atendimento_24h).toBe(true));
  it("mantém 60% de leitos SUS", () => expect(HOSPITAL_PALMERIO.percentual_leitos_sus).toBe(60));
  it("mantém hospital de ensino em 2015", () => expect(HOSPITAL_PALMERIO.ano_hospital_ensino).toBe(2015));
});
