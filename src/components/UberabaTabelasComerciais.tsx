import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { INDICES_PADRAO, formatarCentavos, gravarIndices, lerIndices, parseIndice, tabelaIndexada, tabelaReferencia, type FrenteId, type Indices } from "@/lib/uberabaTabelasComerciais";

// Preços calculados pela Referência × índice de cada frente; indicadores estáticos informados pelo usuário.
type Linha = [string, string, string];
type Frente = { id: FrenteId; titulo: string; segmento: string; cor: string; indicadores: [string, string][] };

const linhasDe = (indice: number): Linha[] => tabelaIndexada(indice).map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos), formatarCentavos(l.apartamentoCentavos)]);

export const FRENTES: Frente[] = [
  {
    id: "pcaAdm", titulo: "PCA Adm.", segmento: "ADESÃO", cor: "comercial-adesao",
    indicadores: [
      ["Participação", "Lancers 20% | SIGA 3% | Bensaúde 77%"],
      ["Agenciamento", "Base 90% | Promoção 2027: 150%"],
      ["Taxa de adesão", "99%"],
      ["Meta 2027", "Mais de 2.000 vidas | Mais de 167 vidas por mês"],
      ["Ticket estimado", "Aproximadamente R$ 299,17"],
    ],
  },
  {
    id: "pceAdm", titulo: "PCE Adm.", segmento: "MÉDIAS EMPRESAS", cor: "comercial-medias",
    indicadores: [
      ["Participação", "SIGA 4% | Bensaúde 96%"],
      ["Agenciamento", "Base 90% | Promoção 2027: 100%"],
      ["Taxa de adesão", "0%"],
      ["Meta 2027", "Mais de 3.000 vidas | Mais de 250 vidas por mês"],
      ["Ticket estimado", "Aproximadamente R$ 265,39"],
    ],
  },
  {
    id: "pce100", titulo: "PCE 100+", segmento: "GRANDES EMPRESAS", cor: "comercial-grandes",
    indicadores: [
      ["Participação", "SIGA 5% | Bensaúde 95%"],
      ["Agenciamento", "Base 90% em 5 parcelas | Promoção: 100% em 3 parcelas"],
      ["Taxa de adesão", "0%"],
      ["Meta 2027", "Mais de 5.000 vidas | Mais de 417 vidas por mês"],
      ["Ticket estimado", "Aproximadamente R$ 248,40"],
    ],
  },
];

const REFERENCIA = linhasDe(100);

const Tabela = ({ linhas }: { linhas: Linha[] }) => (
  <table className="comercial-table w-full border-collapse text-center text-lg leading-6">
    <thead className="sticky top-0">
      <tr>
        {["FAIXA", "ENFERMARIA", "APARTAMENTO"].map((h) => <th key={h} className="px-2 py-1.5 text-base font-semibold">{h}</th>)}
      </tr>
    </thead>
    <tbody>
      {linhas.map((l, i) => (
        <tr key={l[0]} >
          {l.map((v, j) => <td key={j} className="px-2 py-1.5 tabular-nums">{v}</td>)}
        </tr>
      ))}
    </tbody>
  </table>
);

const IndiceCampo = ({ f, valor, onChange }: { f: Frente; valor: number; onChange: (v: number) => void }) => {
  const [texto, setTexto] = useState(String(valor).replace(".", ","));
  useEffect(() => { setTexto(String(valor).replace(".", ",")); }, [valor]);
  const id = `indice-${f.id}`;
  return (
    <label htmlFor={id} className="comercial-indice" title={`Índice sobre a tabela Referência · padrão ${INDICES_PADRAO[f.id]}%`}>
      <span>x Referência</span>
      <Input
        id={id}
        aria-label={`Índice ${f.titulo} x Referência`}
        inputMode="decimal"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); const v = parseIndice(e.target.value); if (v !== null) onChange(v); }}
        onBlur={() => setTexto(String(valor).replace(".", ","))}
        className="h-8 w-16 px-2 text-right tabular-nums"
      />
      <span>%</span>
    </label>
  );
};

const Card = ({ f, indice, onIndice }: { f: Frente; indice: number; onIndice: (v: number) => void }) => (
  <div className={`comercial-card ${f.cor}`}>
    <div className="flex items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center">
      <p className="text-xl font-bold">{f.titulo}</p>
      <p className="text-sm font-semibold tracking-normal">{f.segmento}</p>
      <IndiceCampo f={f} valor={indice} onChange={onIndice} />
    </div>
    <Tabela linhas={linhasDe(indice)} />
    <div className="px-3 pb-2 pt-2">
      <p className="mb-2 text-center text-sm font-semibold uppercase tracking-normal">Indicadores variáveis</p>
      <table className="w-full border-collapse text-base leading-5">
        <tbody>
          {f.indicadores.map(([k, v]) => (
            <tr key={k}>
              <th className="whitespace-nowrap px-3 py-1.5 text-right font-semibold">{k}</th>
              <td className="px-3 py-1.5 text-left">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const UberabaTabelasComerciais = () => {
  const [indices, setIndices] = useState<Indices>(() => lerIndices());
  const alterar = (id: FrenteId, v: number) => setIndices((atual) => { const novo = { ...atual, [id]: v }; gravarIndices(novo); return novo; });
  return (
    <section className="comercial-presentation" aria-label="Tabelas comerciais">
      <div className="comercial-grid">
        {FRENTES.map((f) => <Card key={f.id} f={f} indice={indices[f.id]} onIndice={(v) => alterar(f.id, v)} />)}
      </div>
    </section>
  );
};

export default UberabaTabelasComerciais;

export const ReferenciaButton = () => {
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; dx: number } | null>(null);
  const down = (e: PointerEvent<HTMLDivElement>) => { drag.current = { x: e.clientX, dx }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent<HTMLDivElement>) => { if (drag.current) setDx(drag.current.dx + e.clientX - drag.current.x); };
  const up = () => { drag.current = null; };
  return (
    <Dialog onOpenChange={(o) => o && setDx(0)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Referência</Button>
      </DialogTrigger>
      <DialogContent className="comercial-reference max-w-xl" style={{ marginLeft: dx }}>
        <DialogHeader onPointerDown={down} onPointerMove={move} onPointerUp={up} className="cursor-ew-resize select-none" title="Arraste para mover">
          <DialogTitle>Referência</DialogTitle>
          <p className="text-sm">Tabela-base para cálculo das frentes comerciais</p>
        </DialogHeader>
        <Tabela linhas={REFERENCIA} />
        <p className="text-center text-sm font-medium">Apartamento = TRUNCAR(Enfermaria × 1,25; 2)</p>
      </DialogContent>
    </Dialog>
  );
};
