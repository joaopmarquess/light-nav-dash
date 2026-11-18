/** Dados legados de carteira usados pelo Gráfico Carteira (Laboratory) e bandeiras por UF. */
import { useEffect, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";

const todayIso = () => new Date().toISOString().slice(0, 10);

export const UF_FLAGS: Record<string, string> = {
  SP: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Bandeira_do_estado_de_S%C3%A3o_Paulo.svg/40px-Bandeira_do_estado_de_S%C3%A3o_Paulo.svg.png",
  MG: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Bandeira_de_Minas_Gerais.svg/40px-Bandeira_de_Minas_Gerais.svg.png",
  MS: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Bandeira_de_Mato_Grosso_do_Sul.svg/40px-Bandeira_de_Mato_Grosso_do_Sul.svg.png",
  GO: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Flag_of_Goi%C3%A1s.svg/40px-Flag_of_Goi%C3%A1s.svg.png",
};

const brToIso = (s?: string): string | undefined => {
  if (!s) return undefined;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return undefined;
};

const calcIdade = (nasc: string | null, refIso: string): number | null => {
  if (!nasc) return null;
  const m = nasc.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [ry, rm, rd] = refIso.split("-").map(Number);
  const [ny, nmo, nd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = ry - ny;
  if (rm < nmo || (rm === nmo && rd < nd)) age -= 1;
  return age >= 0 ? age : null;
};

export type CatRow = { label: string; total: number };
export type DWCarteiraData = {
  loading: boolean;
  vidas: number | null;
  porFaixa: { faixa: string; total: number; F: number; M: number }[];
  porContratacao: CatRow[];
  porRecuperacao: CatRow[];
  porAcomodacao: CatRow[];
  porUF: { uf: string; total: number }[];
  ufTotals: Record<string, number>;
  cityTotalsByUF: Record<string, Record<string, number>>;
};

export function useDWCarteira(enabled = true, refDate?: string): DWCarteiraData {
  const [vidas, setVidas] = useState<number | null>(null);
  const [porFaixa, setPorFaixa] = useState<
    { faixa: string; total: number; F: number; M: number }[]
  >([]);
  const [porUF, setPorUF] = useState<{ uf: string; total: number }[]>([]);
  const [ufTotals, setUfTotals] = useState<Record<string, number>>({});
  const [cityTotalsByUF, setCityTotalsByUF] = useState<Record<string, Record<string, number>>>({});
  const [porContratacao, setPorContratacao] = useState<CatRow[]>([]);
  const [porRecuperacao, setPorRecuperacao] = useState<CatRow[]>([]);
  const [porAcomodacao, setPorAcomodacao] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ref = refDate ?? todayIso();

      const FAIXAS = [
        { label: "00 a 18", min: 0, max: 18 },
        { label: "19 a 23", min: 19, max: 23 },
        { label: "24 a 28", min: 24, max: 28 },
        { label: "29 a 33", min: 29, max: 33 },
        { label: "34 a 38", min: 34, max: 38 },
        { label: "39 a 43", min: 39, max: 43 },
        { label: "44 a 48", min: 44, max: 48 },
        { label: "49 a 53", min: 49, max: 53 },
        { label: "54 a 58", min: 54, max: 58 },
        { label: "59 ou +", min: 59, max: Infinity },
      ];
      const faixaFor = (idade: number) =>
        FAIXAS.find((f) => idade >= f.min && idade <= f.max)?.label ?? null;

      let totalRows = 0;
      const perFaixa = new Map<string, { F: number; M: number }>(
        FAIXAS.map((f) => [f.label, { F: 0, M: 0 }]),
      );
      const UF_KEYS = ["SP", "MS", "MG", "Outros"] as const;
      const perUF = new Map<string, number>(UF_KEYS.map((u) => [u, 0]));
      const perUFAll = new Map<string, number>();
      const perCityByUF: Record<string, Map<string, number>> = {
        SP: new Map(), MG: new Map(), MS: new Map(),
      };
      const perContratacao = new Map<string, number>();
      const perRecuperacao = new Map<string, number>();
      const perAcomodacao = new Map<string, number>();

      const pageSize = 1000;
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await hostinger
          .from("carteira_beneficiario")
          .select(
            '"NASCIMENTO","idsex","CIDADE_OFICIAL","UF_CIDADE_OFICIAL","Contratacao","Recuperacao","ACOMODACAO"',
          )
          .lte("primeira_vigencia", ref)
          .or(`ultimo_cancelamento.is.null,ultimo_cancelamento.gt.${ref}`)
          .range(from, from + pageSize - 1);
        if (error) { console.error(error); break; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (data ?? []) as any[];
        totalRows += rows.length;
        for (const r of rows) {
          const uf = String(r.UF_CIDADE_OFICIAL ?? "").trim().toUpperCase();
          const key = (["SP", "MS", "MG"] as const).includes(uf as never) ? uf : "Outros";
          perUF.set(key, (perUF.get(key) ?? 0) + 1);
          if (uf) perUFAll.set(uf, (perUFAll.get(uf) ?? 0) + 1);
          if (perCityByUF[uf] && r.CIDADE_OFICIAL) {
            const city = String(r.CIDADE_OFICIAL);
            perCityByUF[uf].set(city, (perCityByUF[uf].get(city) ?? 0) + 1);
          }
          const idade = calcIdade(r.NASCIMENTO, ref);
          if (idade != null) {
            const f = faixaFor(idade);
            if (f) {
              const bucket = perFaixa.get(f)!;
              const sex = String(r.idsex ?? "").trim().toUpperCase();
              if (sex === "F") bucket.F += 1;
              else if (sex === "M") bucket.M += 1;
            }
          }
          const addCat = (m: Map<string, number>, val: unknown) => {
            const k = String(val ?? "").trim();
            if (!k) return;
            m.set(k, (m.get(k) ?? 0) + 1);
          };
          addCat(perContratacao, r.Contratacao);
          addCat(perRecuperacao, r.Recuperacao);
          addCat(perAcomodacao, r.ACOMODACAO);
        }
        if (rows.length < pageSize) break;
        from += pageSize;
      }
      if (cancelled) return;

      setVidas(totalRows);
      setPorFaixa(
        FAIXAS.map((f) => {
          const b = perFaixa.get(f.label) ?? { F: 0, M: 0 };
          return { faixa: f.label, F: b.F, M: b.M, total: b.F + b.M };
        }),
      );
      setPorUF(UF_KEYS.map((u) => ({ uf: u, total: perUF.get(u) ?? 0 })));
      setUfTotals(Object.fromEntries(perUFAll));
      setCityTotalsByUF({
        SP: Object.fromEntries(perCityByUF.SP),
        MG: Object.fromEntries(perCityByUF.MG),
        MS: Object.fromEntries(perCityByUF.MS),
      });
      const toSortedCat = (m: Map<string, number>): CatRow[] =>
        Array.from(m, ([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
      setPorContratacao(toSortedCat(perContratacao));
      setPorRecuperacao(toSortedCat(perRecuperacao));
      setPorAcomodacao(toSortedCat(perAcomodacao));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [enabled, refDate]);

  return {
    loading, vidas, porFaixa,
    porContratacao, porRecuperacao, porAcomodacao,
    porUF, ufTotals, cityTotalsByUF,
  };
}

