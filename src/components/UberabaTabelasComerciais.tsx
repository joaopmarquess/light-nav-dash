import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Valores estáticos informados pelo usuário; estrutura pronta para vir do banco no futuro.
type Linha = [string, string, string];
type Frente = { titulo: string; segmento: string; cor: string; linhas: Linha[]; indicadores: [string, string][] };

const FAIXAS = ["00 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 ou +"];
const mk = (enf: string[], apt: string[]): Linha[] => FAIXAS.map((f, i) => [f, enf[i], apt[i]]);

export const FRENTES: Frente[] = [
  {
    titulo: "PCA / ACIU", segmento: "ADESÃO", cor: "#D1A755",
    linhas: mk(
      ["157,50", "183,80", "214,49", "236,36", "275,81", "315,24", "386,16", "481,54", "638,99", "944,73"],
      ["196,88", "229,75", "268,11", "295,45", "344,77", "394,05", "482,70", "601,92", "798,74", "1.180,91"]),
    indicadores: [
      ["Participação", "Lancers 20% | SIGA 3% | Bensaúde 77%"],
      ["Agenciamento", "Base 90% | Promoção 2027: 150%"],
      ["Taxa de adesão", "99%"],
      ["Meta 2027", "Mais de 2.000 vidas | Mais de 167 vidas por mês"],
      ["Ticket estimado", "Aproximadamente R$ 299,17"],
    ],
  },
  {
    titulo: "PCE 50 A 99", segmento: "MÉDIAS EMPRESAS", cor: "#2E97D4",
    linhas: mk(
      ["140,00", "163,38", "190,66", "210,10", "245,17", "280,22", "343,26", "428,03", "567,99", "839,76"],
      ["175,00", "204,22", "238,32", "262,62", "306,46", "350,27", "429,07", "535,04", "709,99", "1.049,70"]),
    indicadores: [
      ["Participação", "SIGA 4% | Bensaúde 96%"],
      ["Agenciamento", "Base 90% | Promoção 2027: 100%"],
      ["Taxa de adesão", "0%"],
      ["Meta 2027", "Mais de 3.000 vidas | Mais de 250 vidas por mês"],
      ["Ticket estimado", "Aproximadamente R$ 265,39"],
    ],
  },
  {
    titulo: "PCE 100+", segmento: "GRANDES EMPRESAS", cor: "#D88E73",
    linhas: mk(
      ["131,25", "153,17", "178,74", "196,97", "229,85", "262,70", "321,80", "401,28", "532,49", "787,28"],
      ["164,06", "191,46", "223,43", "246,21", "287,31", "328,38", "402,25", "501,60", "665,62", "984,09"]),
    indicadores: [
      ["Participação", "SIGA 5% | Bensaúde 95%"],
      ["Agenciamento", "Base 90% em 5 parcelas | Promoção: 100% em 3 parcelas"],
      ["Taxa de adesão", "0%"],
      ["Meta 2027", "Mais de 5.000 vidas | Mais de 417 vidas por mês"],
      ["Ticket estimado", "Aproximadamente R$ 248,40"],
    ],
  },
];

const REFERENCIA = mk(
  ["175,00", "204,22", "238,32", "262,62", "306,46", "350,27", "429,07", "535,04", "709,99", "1.049,70"],
  ["218,75", "255,27", "297,90", "328,27", "383,07", "437,83", "536,33", "668,80", "887,48", "1.312,12"]);

const C = { fundo: "#F7F9FB", card: "#FFFFFF", head: "#DCEEF8", alt: "#F8FAFB", borda: "#D6E2E8", txt: "#233E52", txt2: "#647783" };

const Tabela = ({ linhas }: { linhas: Linha[] }) => (
  <table className="w-full border-collapse text-center text-base" style={{ color: C.txt }}>
    <thead className="sticky top-0">
      <tr style={{ background: C.head }}>
        {["FAIXA", "ENFERMARIA", "APARTAMENTO"].map((h) => <th key={h} className="px-2 py-1.5 text-sm font-semibold">{h}</th>)}
      </tr>
    </thead>
    <tbody>
      {linhas.map((l, i) => (
        <tr key={l[0]} style={{ background: i % 2 ? C.alt : C.card, borderTop: `1px solid ${C.borda}` }}>
          {l.map((v, j) => <td key={j} className="px-2 py-1 tabular-nums">{v}</td>)}
        </tr>
      ))}
    </tbody>
  </table>
);

const Card = ({ f }: { f: Frente }) => {
  const [aberto, setAberto] = useState(true);
  return (
    <div className="flex min-w-[280px] snap-center flex-col overflow-hidden rounded-lg" style={{ background: C.card, border: `1px solid ${C.borda}` }}>
      <div className="h-2" style={{ background: f.cor }} />
      <div className="flex items-baseline justify-center gap-2 px-4 py-1.5 text-center">
        <p className="text-lg font-bold" style={{ color: C.txt }}>{f.titulo}</p>
        <p className="text-xs font-semibold tracking-wide" style={{ color: f.cor }}>{f.segmento}</p>
      </div>
      <Tabela linhas={f.linhas} />
      <button type="button" onClick={() => setAberto(!aberto)} className="flex items-center justify-center gap-1 px-4 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: C.txt, borderTop: `1px solid ${C.borda}`, background: C.alt }} aria-expanded={aberto}>
        Indicadores variáveis <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <dl className="flex-1 space-y-0.5 px-3 py-2 text-center text-sm">
          {f.indicadores.map(([k, v]) => (
            <div key={k} className="truncate" title={`${k}: ${v}`}>
              <dt className="inline font-semibold" style={{ color: C.txt2 }}>{k}: </dt>
              <dd className="inline" style={{ color: C.txt }}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

const UberabaTabelasComerciais = () => {
  const [ref, setRef] = useState(false);
  return (
    <section className="flex flex-1 flex-col rounded-lg p-3" style={{ background: C.fundo, color: C.txt }}>
      <div className="mb-3 flex snap-x gap-4 overflow-x-auto sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 [&>*]:w-[85%] [&>*]:shrink-0 sm:[&>*]:w-auto">
        {FRENTES.map((f) => <Card key={f.titulo} f={f} />)}
      </div>
      <div className="mt-auto pt-0 overflow-hidden rounded-lg" style={{ background: C.card, border: `1px solid ${C.borda}` }}>
        <button type="button" onClick={() => setRef(!ref)} aria-expanded={ref} className="flex w-full items-center justify-between px-4 py-1.5 text-left">
          <span>
            <span className="mr-3 text-sm font-bold">REFERÊNCIA</span>
            <span className="text-xs" style={{ color: C.txt2 }}>Tabela-base para cálculo das frentes comerciais</span>
          </span>
          <ChevronDown className={`h-5 w-5 transition-transform ${ref ? "rotate-180" : ""}`} />
        </button>
        {ref && (
          <div className="px-4 pb-4">
            <div className="mx-auto max-w-xl"><Tabela linhas={REFERENCIA} /></div>
            <p className="mt-3 text-center text-sm font-medium">Apartamento = TRUNCAR(Enfermaria × 1,25; 2)</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default UberabaTabelasComerciais;
