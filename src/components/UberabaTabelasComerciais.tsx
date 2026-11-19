import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, Table2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GitCompare, Pin, Printer } from "lucide-react";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { loadMarcaAxis } from "@/lib/pdfMarcaAxis";
import { buildTabelasImpressaoPdf, paginasImpressao } from "@/lib/uberabaTabelasImpressao";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import RestaurarPadraoButton from "@/components/RestaurarPadraoButton";
import { colunasConcorrentes, linhasConcorrentesPorFaixa, outrasBensaude, type ValorOutrasBensaude } from "@/lib/concorrentesUberaba";
import { frenteNoPadrao, restaurarFrentePadrao, FATORES_PADRAO, FATOR_APARTAMENTO_PADRAO, formatarFator, gravarFatores, lerFatores, parseFator, type Fatores, FRENTES_COMERCIAIS, INDICADORES_PADRAO_POR_FRENTE, INDICES_PADRAO, blocosIndicadores, formatarCentavos, formatarPercentual, gravarIndicadores, gravarIndices, gravarPadraoRotulos, gravarRotulos, lerIndicadores, lerIndices, lerPadraoRotulos, lerRotulos, normalizarRotulo, ROTULO_MAX, parseIndicador, parseIndice, tabelaIndexada, tabelaNet, tabelaVenda, operadoraDe, type CampoIndicador, type FrenteId, type Indicadores, type IndicadoresPorFrente, type Indices, type Rotulos, type RotulosPorFrente } from "@/lib/uberabaTabelasComerciais";

// Preços calculados pela Referência × índice de cada frente; indicadores variáveis editáveis por frente (cálculos no helper).
type Linha = [string, string, string];
type Frente = { id: FrenteId; titulo: string; segmento: string; cor: string };

const linhasDe = (indice: number, fator: number = FATOR_APARTAMENTO_PADRAO): Linha[] => tabelaIndexada(indice, fator).map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos), formatarCentavos(l.apartamentoCentavos)]);

type ModoPreco = "venda" | "net";
const linhasDeTabela = (t: ReturnType<typeof tabelaVenda>): Linha[] => t.map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos), formatarCentavos(l.apartamentoCentavos)]);

// Chave VENDA/NET das Tabelas: Venda = Referência × fator; Net = Venda × participação da OPERADORA.
const ChavePreco = ({ modo, onModo, operadora }: { modo: ModoPreco; onModo: (m: ModoPreco) => void; operadora: number }) => (
  <span className="comercial-chave" role="group" aria-label="Preço exibido nas tabelas">
    {(["venda", "net"] as const).map((m) => (
      <button key={m} type="button" aria-pressed={modo === m} onClick={() => onModo(m)}
        title={m === "venda" ? "Preço de Venda = Referência × fator da tabela" : `Preço Net = Preço de Venda × OPERADORA ${formatarPercentual(operadora)}`}>
        {m === "venda" ? "Venda" : "Net"}
      </button>
    ))}
  </span>
);

// Imprime as quatro tabelas em duas páginas (Venda e Net), com os mesmos cálculos da tela.
const BotaoImprimir = ({ onClick }: { onClick: () => void }) => {
  const rotulo = "Imprimir tabelas Venda e Net";
  return (
    <button type="button" onClick={onClick} aria-label={rotulo} title={rotulo}
      className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-sm align-middle opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Printer className="h-4 w-4" />
    </button>
  );
};

const CORES: Record<FrenteId, string> = { pcaAdm: "comercial-adesao", pmeAdm: "comercial-pme", pceAdm: "comercial-medias", pce100: "comercial-grandes" };
export const FRENTES: Frente[] = FRENTES_COMERCIAIS.map((f) => ({ ...f, cor: CORES[f.id] }));

const REFERENCIA = linhasDe(100);

// Sem `apartamento`, a coluna Apartamento fica sempre visível (ex.: Tabela Referencial).
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

// Ícone [Comparar] ao lado do nome: mostra só esta tabela, à esquerda do contêiner.
const BotaoComparar = ({ nome, onClick }: { nome: string; onClick: () => void }) => {
  const rotulo = `Comparar ${nome}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={onClick} aria-label={rotulo} className="comercial-rotulo-padrao comercial-comparar-botao">
          <GitCompare className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>Comparar</TooltipContent>
    </Tooltip>
  );
};

// Contêineres ao lado da tabela comparada: mesmas alturas de topo, título, cabeçalho e linhas (CSS .comercial-comparar-area),
// para que cada faixa fique exatamente no mesmo nível da tabela escolhida.
const th = "px-2 text-base font-semibold";
const td = "px-2 tabular-nums";
const formatarOuTraco = (c: number | null) => (c == null ? "—" : formatarCentavos(c));

const ChaveOutras = ({ modo, onModo }: { modo: ValorOutrasBensaude; onModo: (m: ValorOutrasBensaude) => void }) => (
  <span className="comercial-chave" role="group" aria-label="Preço exibido em Outras Bensaúde">
    {(["venda", "net"] as const).map((m) => (
      <button key={m} type="button" aria-pressed={modo === m} onClick={() => onModo(m)}
        title={m === "venda" ? "Preço de Venda (tabela de preços dos planos)" : "Preço Net (planilha Lancers)"}>
        {m === "venda" ? "Venda" : "Net"}
      </button>
    ))}
  </span>
);

// Topo dos contêineres da comparação: título e seta para recolher/expandir.
const TopoComparado = ({ titulo, aberto, onAlternar }: { titulo: string; aberto: boolean; onAlternar: () => void }) => {
  const rotulo = `${aberto ? "Recolher" : "Expandir"} ${titulo}`;
  const Icone = aberto ? ChevronLeft : ChevronRight;
  return (
    <div className="flex items-center justify-center gap-1 text-center">
      <span className="text-xl font-bold">{titulo}</span>
      <button type="button" onClick={onAlternar} aria-label={rotulo} title={rotulo} aria-expanded={aberto}
        className="inline-flex h-6 w-6 items-center justify-center rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Icone className="h-4 w-4" />
      </button>
    </div>
  );
};

const OutrasBensaude = ({ aberto, onAlternar, modo, onModo, comApartamento }: { aberto: boolean; onAlternar: () => void; modo: ValorOutrasBensaude; onModo: (m: ValorOutrasBensaude) => void; comApartamento: boolean }) => {
  const { colunas, linhas } = outrasBensaude(modo, comApartamento);
  return (
    <section className="comercial-card comercial-comparado comercial-outras" aria-label="OUTRAS BENSAÚDE" data-recolhido={!aberto || undefined}>
      <TopoComparado titulo="OUTRAS BENSAÚDE" aberto={aberto} onAlternar={onAlternar} />
      {aberto && (
        <section className="comercial-secao">
          <p className="comercial-secao-titulo">Tabelas<ChaveOutras modo={modo} onModo={onModo} /></p>
          <div className="comercial-precos">
            <table className="comercial-table w-full border-collapse text-center text-lg leading-6">
              <thead>
                <tr>
                  {colunas.map((c) => <th key={c.rotulo} className={th} title={`${c.plano} · ${c.nome} · ${c.acomodacao === "PRATA" ? "Enfermaria (Prata)" : "Apartamento (Ouro)"}`}>{c.rotulo}</th>)}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.faixa}>
                    {l.centavos.map((v, j) => <td key={j} className={td}>{formatarOuTraco(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
};

// Tabela Concorrentes (valores enviados pelo Dênis), uma linha por faixa para comparar com a tabela escolhida.
const TabelaConcorrentes = ({ aberto, onAlternar }: { aberto: boolean; onAlternar: () => void }) => (
  <section className="comercial-card comercial-comparado comercial-concorrentes" aria-label="CONCORRENTES" data-recolhido={!aberto || undefined}>
    <TopoComparado titulo="CONCORRENTES" aberto={aberto} onAlternar={onAlternar} />
    {aberto && <section className="comercial-secao">
      <p className="comercial-secao-titulo">Tabelas</p>
      <div className="comercial-precos overflow-x-auto">
        <table className="comercial-table w-full border-collapse text-center text-lg leading-6">
          <thead>
            <tr>
              {colunasConcorrentes().map((c) => <th key={c.numero} className={th} title={c.produto} data-sem-quebra={c.rotulo.startsWith("Hapvida") || undefined}>{c.rotulo.toUpperCase()}</th>)}
            </tr>
          </thead>
          <tbody>
            {linhasConcorrentesPorFaixa().map((l) => (
              <tr key={l.faixa}>
                {l.centavos.map((v, j) => <td key={j} className={td}>{formatarCentavos(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>}
  </section>
);

// Recolher/expandir uma seção (grade de preços ou Indicadores variáveis) nas quatro tabelas ao mesmo tempo.
const BotaoSecao = ({ t, nome }: { t: ApartamentoToggle; nome: string }) => {
  const rotulo = `${t.visivel ? "Recolher" : "Expandir"} ${nome}`;
  const Icone = t.visivel ? ChevronUp : ChevronDown;
  return (
    <button type="button" onClick={t.alternar} aria-label={rotulo} title={rotulo} aria-expanded={t.visivel}
      className="inline-flex h-5 w-5 items-center justify-center rounded-sm align-middle opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Icone className="h-4 w-4" />
    </button>
  );
};

const Tabela = ({ linhas, apartamento, fator = FATOR_APARTAMENTO_PADRAO }: { linhas: Linha[]; apartamento?: ApartamentoToggle; fator?: number }) => {
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
                <TooltipContent>Apartamento = TRUNCAR(Enfermaria × {formatarFator(fator)}; 2)</TooltipContent>
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
    <label htmlFor={id} className="comercial-indice" title={`x Referência · índice sobre a Tabela Referencial · padrão ${INDICES_PADRAO[f.id]}%`}>
      <Input
        id={id}
        aria-label={`Índice ${f.titulo} x Referência`}
        inputMode="decimal"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); const v = parseIndice(e.target.value); if (v !== null) onChange(v); }}
        onBlur={() => setTexto(String(valor).replace(".", ","))}
        className="h-8 w-12 px-1.5 text-right tabular-nums"
      />
      <span>%</span>
    </label>
  );
};

// "APARTAMENTO [1,25] x ENFERMARIA": fator editável que calcula a coluna Apartamento desta tabela.
const FatorApartamento = ({ f, valor, onChange }: { f: Frente; valor: number; onChange: (v: number) => void }) => {
  const [texto, setTexto] = useState(formatarFator(valor));
  useEffect(() => { setTexto(formatarFator(valor)); }, [valor]);
  const id = `fator-apto-${f.id}`;
  return (
    <label htmlFor={id} className="comercial-fator" title={`Apartamento = TRUNCAR(Enfermaria × fator; 2) · padrão ${formatarFator(FATORES_PADRAO[f.id])}`}>
      <span>APARTAMENTO</span>
      <Input
        id={id}
        aria-label={`Fator Apartamento x Enfermaria ${f.titulo}`}
        inputMode="decimal"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); const v = parseFator(e.target.value); if (v !== null) onChange(v); }}
        onBlur={() => setTexto(formatarFator(valor))}
        className="h-7 w-16 px-2 text-right tabular-nums"
      />
      <span>x ENFERMARIA</span>
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

// Ícone discreto: grava o nome atual como novo padrão da tabela (o que volta quando o campo fica vazio).
const GravarPadrao = ({ f, ativo, onClick }: { f: Frente; ativo: boolean; onClick: () => void }) => {
  const dica = ativo ? "Gravar este nome como novo padrão" : "Este nome já é o padrão";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={onClick} disabled={!ativo} aria-label={`${dica} · ${f.titulo}`} className="comercial-rotulo-padrao">
          <Pin className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{dica}</TooltipContent>
    </Tooltip>
  );
};

const Card = ({ f, indice, onIndice, fator, onFator, apartamento, precos, variaveis, indicadores, onIndicador, rotulos, padroes, onRotulo, onGravarPadrao, modo, onModo, onImprimir, noPadrao, onRestaurar, onComparar, comparando = false }: {
  modo: ModoPreco; onModo: (m: ModoPreco) => void; onImprimir: () => void; noPadrao: boolean; onRestaurar: () => void; onComparar: () => void; comparando?: boolean;
  f: Frente; indice: number; onIndice: (v: number) => void; fator: number; onFator: (v: number) => void; apartamento: ApartamentoToggle; precos: ApartamentoToggle; variaveis: ApartamentoToggle;
  rotulos: Rotulos; padroes: Rotulos; onRotulo: (campo: keyof Rotulos, v: string) => void; onGravarPadrao: () => void;
  indicadores: Indicadores; onIndicador: (campo: CampoIndicador, v: number) => void;
}) => {
  const operadora = operadoraDe(f.id, indicadores);
  const linhas = linhasDeTabela(modo === "net" ? tabelaNet(indice, operadora, fator) : tabelaVenda(indice, fator));
  const blocos: [string, LinhaIndicador[]][] = blocosIndicadores(f.id, indicadores).map((b) => [b.titulo, b.linhas.map((l) => ({ rotulo: l.rotulo, campo: l.campo, calculado: l.campo ? undefined : l.valor, formula: l.formula }))]);
  return (
    <div className={`comercial-card ${f.cor}`}>
      <div className="flex items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center">
        <span className="inline-flex items-center gap-0.5">
          <RotuloEditavel valor={rotulos.titulo} padrao={padroes.titulo} onChange={(v) => onRotulo("titulo", v)} rotulo={`Nome da frente ${f.titulo}`} className="text-xl font-bold" />
          <GravarPadrao f={f} ativo={rotulos.titulo !== padroes.titulo} onClick={onGravarPadrao} />
          {!comparando && <BotaoComparar nome={rotulos.titulo} onClick={onComparar} />}
        </span>
        <IndiceCampo f={f} valor={indice} onChange={onIndice} />
        <RestaurarPadraoButton alvo={`${rotulos.titulo} (índice, fator Apartamento e Indicadores variáveis)`} desativado={noPadrao} onRestaurar={onRestaurar} className="h-6 w-6" />
      </div>
      <section className="comercial-secao" aria-label={`Tabelas ${f.titulo}`}>
        <p className="comercial-secao-titulo">Tabelas{precos.visivel && <><ChavePreco modo={modo} onModo={onModo} operadora={operadora} /><BotaoImprimir onClick={onImprimir} /></>}{!comparando && <BotaoSecao t={precos} nome="Tabelas" />}</p>
        {precos.visivel && (
          <div className="comercial-precos" data-modo={modo}>
            <Tabela linhas={linhas} apartamento={apartamento} fator={fator} />
            <FatorApartamento f={f} valor={fator} onChange={onFator} />
          </div>
        )}
      </section>
      {!comparando && <div className="comercial-secao comercial-secao-indicadores">
        <p className="comercial-secao-titulo">Indicadores variáveis<BotaoSecao t={variaveis} nome="Indicadores variáveis" /></p>
        {variaveis.visivel && <div className="comercial-indicadores">
          {blocos.map(([titulo, linhas]) => (
            <table key={titulo} data-bloco={titulo} className="w-full border-collapse text-base leading-5">
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
        </div>}
      </div>}
    </div>
  );
};

// Botão que encerra a comparação; a tela-mãe o coloca na linha dos botões Referência e Proposta.
// iconOnly: só o ícone (com dica), para caber na barra da Timeline.
export const VoltarTabelasButton = ({ onClick, iconOnly = false }: { onClick: () => void; iconOnly?: boolean }) => iconOnly ? (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon" variant="outline" className="h-9 w-9" aria-label="Voltar às Tabelas" onClick={onClick}><ArrowLeft className="h-4 w-4" /></Button>
    </TooltipTrigger>
    <TooltipContent>Voltar às Tabelas</TooltipContent>
  </Tooltip>
) : (
  <Button size="sm" variant="outline" onClick={onClick}><ArrowLeft className="mr-1 h-4 w-4" />Voltar às Tabelas</Button>
);

// Frente em comparação controlada pela tela-mãe (que esconde o restante do contêiner e mostra "Voltar às Tabelas");
// sem controle, o estado fica aqui e o botão aparece acima das tabelas.
const UberabaTabelasComerciais = ({ comparada: comparadaExterna, onComparar }: { comparada?: FrenteId | null; onComparar?: (id: FrenteId | null) => void } = {}) => {
  const [comparadaLocal, setComparadaLocal] = useState<FrenteId | null>(null);
  const controlado = comparadaExterna !== undefined;
  const comparada = controlado ? comparadaExterna : comparadaLocal;
  const setComparada = (id: FrenteId | null) => { if (!controlado) setComparadaLocal(id); };
  // "OUTRAS BENSAÚDE" (3019 e 3020, chave Venda/Net própria) abre expandido; "CONCORRENTES" abre recolhido.
  const [outrasAberto, setOutrasAberto] = useState(true);
  const [concorrentesAberto, setConcorrentesAberto] = useState(false);
  const [modoOutras, setModoOutras] = useState<ValorOutrasBensaude>("venda");
  const comparar = (id: FrenteId | null) => { setComparada(id); onComparar?.(id); };
  const [indices, setIndices] = useState<Indices>(() => lerIndices());
  // Coluna Apartamento recolhida por padrão; o mesmo controle vale para as quatro frentes.
  const [aptoVisivel, setAptoVisivel] = useState(false);
  const apartamento: ApartamentoToggle = { visivel: aptoVisivel, alternar: () => setAptoVisivel((v) => !v) };
  // Tabelas e Indicadores variáveis abrem recolhidos; cada ícone vale para as quatro frentes.
  const [precosVisivel, setPrecosVisivel] = useState(false);
  const precos: ApartamentoToggle = { visivel: precosVisivel, alternar: () => setPrecosVisivel((v) => !v) };
  const [variaveisVisivel, setVariaveisVisivel] = useState(false);
  const variaveis: ApartamentoToggle = { visivel: variaveisVisivel, alternar: () => setVariaveisVisivel((v) => !v) };
  // Preço de Venda por padrão; a chave vale para as quatro tabelas e só muda a exibição.
  const [modo, setModo] = useState<ModoPreco>("venda");
  const [imprimindo, setImprimindo] = useState(false);
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
  const [padroes, setPadroes] = useState<RotulosPorFrente>(() => lerPadraoRotulos());
  const gravarPadrao = (id: FrenteId) => setPadroes((atual) => {
    const novo = { ...atual, [id]: { ...atual[id], titulo: rotulos[id].titulo } };
    gravarPadraoRotulos(novo);
    return novo;
  });
  const [fatores, setFatores] = useState<Fatores>(() => lerFatores());
  const alterarFator = (id: FrenteId, v: number) => setFatores((atual) => { const novo = { ...atual, [id]: v }; gravarFatores(novo); return novo; });
  const alterar = (id: FrenteId, v: number) => setIndices((atual) => { const novo = { ...atual, [id]: v }; gravarIndices(novo); return novo; });
  const restaurar = (id: FrenteId) => {
    const novo = restaurarFrentePadrao(id, { indices, fatores, indicadores });
    gravarIndices(novo.indices); gravarFatores(novo.fatores); gravarIndicadores(novo.indicadores);
    setIndices(novo.indices); setFatores(novo.fatores); setIndicadores(novo.indicadores);
  };
  const precosComparacao: ApartamentoToggle = { visivel: true, alternar: () => {} };
  const cartao = (f: Frente, comparando: boolean) => <Card key={f.id} f={f} indice={indices[f.id]} onIndice={(v) => alterar(f.id, v)} fator={fatores[f.id]} onFator={(v) => alterarFator(f.id, v)} apartamento={apartamento} precos={comparando ? precosComparacao : precos} variaveis={variaveis} indicadores={indicadores[f.id]} onIndicador={(c, v) => alterarIndicador(f.id, c, v)} rotulos={rotulos[f.id]} padroes={padroes[f.id]} onRotulo={(c, v) => alterarRotulo(f.id, c, v)} onGravarPadrao={() => gravarPadrao(f.id)} modo={modo} onModo={setModo} onImprimir={() => setImprimindo(true)} noPadrao={frenteNoPadrao(f.id, { indices, fatores, indicadores })} onRestaurar={() => restaurar(f.id)} onComparar={() => comparar(f.id)} comparando={comparando} />;
  return (
    <section className="comercial-presentation" aria-label="Tabelas comerciais">
      {comparada ? (
        <div className="comercial-comparar">
          {!controlado && <div className="self-start"><VoltarTabelasButton onClick={() => comparar(null)} /></div>}
          <div className="comercial-comparar-area">
            {/* Tabela comparada e OUTRAS BENSAÚDE no mesmo par: mesma largura e altura. */}
            <div className="comercial-comparar-par">
            {FRENTES.filter((f) => f.id === comparada).map((f) => cartao(f, true))}
            <OutrasBensaude aberto={outrasAberto} onAlternar={() => setOutrasAberto((v) => !v)} modo={modoOutras} onModo={setModoOutras} comApartamento={aptoVisivel} />
            </div>
            <TabelaConcorrentes aberto={concorrentesAberto} onAlternar={() => setConcorrentesAberto((v) => !v)} />
          </div>
        </div>
      ) : (
        <div className={`comercial-grid ${variaveisVisivel ? "" : "indicadores-recolhidos"}`}>
          {FRENTES.map((f) => cartao(f, false))}
        </div>
      )}
      {imprimindo && (
        <PdfPreview
          build={async () => buildTabelasImpressaoPdf(await loadTimbrado(), await loadMarcaAxis(), paginasImpressao({ indices, fatores, indicadores, rotulos }))}
          fileName="Uberaba_Tabelas_Venda_e_Net.pdf"
          onClose={() => setImprimindo(false)}
        />
      )}
    </section>
  );
};

export default UberabaTabelasComerciais;

export const ReferenciaButton = ({ iconOnly = false }: { iconOnly?: boolean } = {}) => {
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; dx: number } | null>(null);
  const down = (e: PointerEvent<HTMLDivElement>) => { drag.current = { x: e.clientX, dx }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent<HTMLDivElement>) => { if (drag.current) setDx(drag.current.dx + e.clientX - drag.current.x); };
  const up = () => { drag.current = null; };
  return (
    <Dialog onOpenChange={(o) => o && setDx(0)}>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="h-9 w-9" aria-label="Referência"><Table2 className="h-4 w-4" /></Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Referência</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">Referência</Button>
        </DialogTrigger>
      )}
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
