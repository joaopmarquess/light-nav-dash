import { describe, expect, it } from "vitest";
import { avaliarEnvio, type EnvioRegistro } from "./benchVidasEnvio";

const agora = Date.parse("2026-11-11T15:50:00Z");
const base: EnvioRegistro = { etapa: "Download da ANS", etapa_ordem: 1, etapas: 3, total: 1820, feitos: 137, falhas: 0, situacao: "em_andamento", mensagem: null, progresso_em: "2026-11-11T15:49:40Z", atualizado_em: "2026-11-11T15:49:50Z" };
const min = (m: number) => new Date(agora - m * 60_000).toISOString();

describe("avaliarEnvio", () => {
  it("conta enviados e pendentes reais", () => {
    const r = avaliarEnvio(base, agora);
    expect([r.feitos, r.pendentes, r.percentual, r.estado]).toEqual([137, 1683, 7, "andamento"]);
  });
  it("marca parado quando o programa fica mais de 2 minutos sem sinal", () => {
    expect(avaliarEnvio({ ...base, atualizado_em: min(2.5) }, agora).estado).toBe("parado");
    expect(avaliarEnvio({ ...base, atualizado_em: min(1.5) }, agora).estado).toBe("andamento");
  });
  it("marca sem avanço quando nenhum arquivo novo chega em mais de 10 minutos", () => {
    expect(avaliarEnvio({ ...base, progresso_em: min(11) }, agora).estado).toBe("sem_avanco");
    expect(avaliarEnvio({ ...base, progresso_em: min(9) }, agora).estado).toBe("andamento");
  });
  it("concluído não vira parado e some depois de 24 horas", () => {
    const fim = { ...base, situacao: "concluido", feitos: 1820, atualizado_em: min(30) };
    expect(avaliarEnvio(fim, agora)).toMatchObject({ estado: "concluido", pendentes: 0, percentual: 100, visivel: true });
    expect(avaliarEnvio({ ...fim, atualizado_em: min(25 * 60) }, agora).visivel).toBe(false);
  });
});
