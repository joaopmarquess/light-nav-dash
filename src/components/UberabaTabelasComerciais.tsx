import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FRENTES_COMERCIAIS, INDICADORES_PADRAO_POR_FRENTE, INDICES_PADRAO, blocosIndicadores, formatarCentavos, formatarPercentual, gravarIndicadores, gravarIndices, gravarRotulos, lerIndicadores, lerIndices, lerRotulos, normalizarRotulo, rotulosPadrao, ROTULO_MAX, parseIndicador, parseIndice, tabelaIndexada, type CampoIndicador, type FrenteId, type Indicadores, type IndicadoresPorFrente, type Indices, type Rotulos, type RotulosPorFrente } from "@/lib/uberabaTabelasComerciais";

// Preços calculados pela Referência × índice de cada frente; indicadores variáveis editáveis por frente (cálculos no helper).
type Linha = [string, string, string];
type Frente = { id: FrenteId; titulo: string; segmento: string; cor: string };

const linhasDe = (indice: number): Linha[] => tabelaIndexada(indice).map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos), formatarCentavos(l.apartamentoCentavos)]);

const CORES: Record<FrenteId, string> = { pcaAdm: "comercial-adesao", pceAdm: "comercial-medias", pce100: "comercial-grandes" };
export const FRENTES: Frente[] = FRENTES_COMERCIAIS.map((f) => ({ ...f, cor: CORES[f.id] }));

const REFERENCIA = linhasDe(100);

// Sem `apartamento`, a coluna Apartamento fica sempre visível (ex.: tabela Referência).
type ApartamentoToggle = { visivel: boolean; alternar: () => void };

const BotaoApartamento = ({ t }: { t: ApartamentoToggle }) => {
  const rotulo = t.visivel ? "Recolher coluna Apartamento" : "Expandir coluna Apartamento";
  const Icone = t.visivel ? ChevronLeft : ChevronRight;
  return (
    <button type="button" onClick={t.alternar} aria-label={rotulo} title={rotulo} aria-expanded={t.visivel}
      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-sm align-middle opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Icone className="h-4 w-4" />
    </button>
  );
};

const Tabela = ({ linhas, apartamento }: { linhas: Linha[]; apartamento?: ApartamentoToggle }) => {
  const mostrarApto = apartamento ? apartamento.visivel : true;
  const th = "px-2 py-1.5 text-base font-semibold";
  return (
    <table className="comercial-table w-full border-collapse text-center text-lg leading-6">
      <thead className="sticky top-0">
        <tr>
          <th className={th}>FAIXA</th>
          <th className={th}>ENFERMARIA{apartamento && !apartamento.visivel && <BotaoApartamento t={apartamento} />}</th>
          {mostrarApto && (
            <th className={th}>
              <Tooltip>
                <TooltipTrigger asChild><span className="cursor-help">APARTAMENTO</span></TooltipTrigger>
                <TooltipContent>Apartamento = TRUNCAR(Enfermaria × 1,25; 2)</TooltipContent>
              </Tooltip>
              {apartamento && <BotaoApartamento t={apartamento} />}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l[0]}>
            {(mostrarApto ? l : l.slice(0, 2)).map((v, j) => <td key={j} className="px-2 py-1.5 tabular-nums">{v}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Texto do cabeçalho editável em uma linha; vazio volta ao padrão ao sair do campo.
const RotuloEditavel = ({ valor, padrao, onChange, className, rotulo }: { valor: string; padrao: string; onChange: (v: string) => void; className?: string; rotulo: string }) => {
  const [texto, setTexto] = useState(valor);
  useEffect(() => { setTexto(valor); }, [valor]);
  const confirmar = () => { const v = normalizarRotulo(texto, padrao); setTexto(v); if (v !== valor) onChange(v); };
  return (
    <input
      type="text"
      aria-label={rotulo}
      title={`Clique para editar · padrão: ${padrao}`}
      value={texto}
      maxLength={ROTULO_MAX}
      size={Math.max(texto.length, 1)}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTexto(valor); e.currentTarget.blur(); } }}
      className={`comercial-rotulo ${className ?? ""}`}
    />
  );
};

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

const CampoIndicadorInput = ({ f, campo, rotulo, valor, onChange }: { f: Frente; campo: CampoIndicador; rotulo: string; valor: number; onChange: (v: number) => void }) => {
  const fmt = (v: number) => String(v).replace(".", ",");
  const [texto, setTexto] = useState(fmt(valor));
  useEffect(() => { setTexto(fmt(valor)); }, [valor]);
  return (
    <span className="comercial-indicador-campo" title={`Padrão ${formatarPercentual(INDICADORES_PADRAO_POR_FRENTE[f.id][campo])}`}>
      <Input
        aria-label={`${rotulo} ${f.titulo}`}
        inputMode="decimal"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); const v = parseIndicador(campo, e.target.value); if (v !== null) onChange(v); }}
        onBlur={() => setTexto(fmt(valor))}
        className="h-7 w-16 px-2 text-right tabular-nums"
      />
      <span>%</span>
    </span>
  );
};

type LinhaIndicador = { rotulo: string; campo?: CampoIndicador; calculado?: number; formula?: string };

const PADRAO_ROTULOS = rotulosPadrao();

const Card = ({ f, indice, onIndice, apartamento, indicadores, onIndicador, rotulos, onRotulo }: {
  f: Frente; indice: number; onIndice: (v: number) => void; apartamento: ApartamentoToggle;
  rotulos: Rotulos; onRotulo: (campo: keyof Rotulos, v: string) => void;
  indicadores: Indicadores; onIndicador: (campo: CampoIndicador, v: number) => void;
}) => {
  const blocos: [string, LinhaIndicador[]][] = blocosIndicadores(f.id, indicadores).map((b) => [b.titulo, b.linhas.map((l) => ({ rotulo: l.rotulo, campo: l.campo, calculado: l.campo ? undefined : l.valor, formula: l.formula }))]);
  return (
    <div className={`comercial-card ${f.cor}`}>
      <div className="flex items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center">
        <RotuloEditavel valor={rotulos.titulo} padrao={PADRAO_ROTULOS[f.id].titulo} onChange={(v) => onRotulo("titulo", v)} rotulo={`Nome da frente ${f.titulo}`} className="text-xl font-bold" />
        <RotuloEditavel valor={rotulos.segmento} padrao={PADRAO_ROTULOS[f.id].segmento} onChange={(v) => onRotulo("segmento", v)} rotulo={`Segmento da frente ${f.titulo}`} className="comercial-rotulo-segmento text-sm font-semibold tracking-normal" />
        <IndiceCampo f={f} valor={indice} onChange={onIndice} />
      </div>
      <Tabela linhas={linhasDe(indice)} apartamento={apartamento} />
      <div className="px-3 pb-3 pt-2">
        <p className="mb-2 text-center text-sm font-semibold uppercase tracking-normal">Indicadores variáveis</p>
        <div className="comercial-indicadores">
          {blocos.map(([titulo, linhas]) => (
            <table key={titulo} className="w-full border-collapse text-base leading-5">
              <thead>
                <tr><th colSpan={2} className="px-3 py-1 text-center font-semibold uppercase">{titulo}</th></tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.rotulo}>
                    <td className="px-3 py-1 text-left uppercase">{l.rotulo}</td>
                    <td className={`w-28 px-2 py-1 text-right tabular-nums ${l.calculado !== undefined && l.calculado < 0 ? "text-destructive" : ""}`}>
                      {l.campo
                        ? <CampoIndicadorInput f={f} campo={l.campo} rotulo={l.rotulo} valor={indicadores[l.campo]} onChange={(v) => onIndicador(l.campo!, v)} />
                        : <span title={l.formula}>{formatarPercentual(l.calculado ?? 0)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </div>
    </div>
  );
};

const UberabaTabelasComerciais = () => {
  const [indices, setIndices] = useState<Indices>(() => lerIndices());
  // Coluna Apartamento recolhida por padrão; o mesmo controle vale para as três frentes.
  const [aptoVisivel, setAptoVisivel] = useState(false);
  const apartamento: ApartamentoToggle = { visivel: aptoVisivel, alternar: () => setAptoVisivel((v) => !v) };
  const [indicadores, setIndicadores] = useState<IndicadoresPorFrente>(() => lerIndicadores());
  const alterarIndicador = (id: FrenteId, campo: CampoIndicador, v: number) => setIndicadores((atual) => {
    const novo = { ...atual, [id]: { ...atual[id], [campo]: v } };
    gravarIndicadores(novo);
    return novo;
  });
  const [rotulos, setRotulos] = useState<RotulosPorFrente>(() => lerRotulos());
  const alterarRotulo = (id: FrenteId, campo: keyof Rotulos, v: string) => setRotulos((atual) => {
    const novo = { ...atual, [id]: { ...atual[id], [campo]: v } };
    gravarRotulos(novo);
    return novo;
  });
  const alterar = (id: FrenteId, v: number) => setIndices((atual) => { const novo = { ...atual, [id]: v }; gravarIndices(novo); return novo; });
  return (
    <section className="comercial-presentation" aria-label="Tabelas comerciais">
      <div className="comercial-grid">
        {FRENTES.map((f) => <Card key={f.id} f={f} indice={indices[f.id]} onIndice={(v) => alterar(f.id, v)} apartamento={apartamento} indicadores={indicadores[f.id]} onIndicador={(c, v) => alterarIndicador(f.id, c, v)} rotulos={rotulos[f.id]} onRotulo={(c, v) => alterarRotulo(f.id, c, v)} />)}
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
      </DialogContent>
    </Dialog>
  );
};
