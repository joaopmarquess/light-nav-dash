import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hostingerClient", () => ({ hostinger: {} }));
vi.mock("@/control/benchCLoader", () => ({ loadCPeriods: vi.fn(), loadCQuarter: vi.fn() }));

import { arquivoContasMv } from "./sinistralidadeContabil";
import { sinistralidadeContabilAns } from "./benchC";

describe("Sinistralidade Contábil dos Painéis", () => {
  it("divide as contas 411 pelas contas 311 do balancete no período", () => {
    const file = arquivoContasMv([
      { nr_mes: 1, cd_conta_contabil: 311111061, vl_debito: 0, vl_credito: 1000 },
      { nr_mes: 1, cd_conta_contabil: 311721021, vl_debito: 100, vl_credito: 0 },
      { nr_mes: 1, cd_conta_contabil: 411111011, vl_debito: 850, vl_credito: 40 },
      { nr_mes: 2, cd_conta_contabil: 311111061, vl_debito: 0, vl_credito: 1100 },
      { nr_mes: 2, cd_conta_contabil: 411111011, vl_debito: 990, vl_credito: 0 },
    ]);
    expect(sinistralidadeContabilAns(file, [[1, 2]])[0]).toBeCloseTo((1800 / 2000) * 100, 10);
  });
});
