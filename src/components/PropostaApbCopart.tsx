import { useState } from "react";
import { Eye, RotateCcw, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COPART_PROPOSTA_2027, NOTAS_COPART_2027, LIMITES_PADRAO, chaveCopart, chavePct, fmtLimite, fmtPct, gravarLimitesCopart, pctEditavel, lerLimitesCopart, type LimitesCopart } from "@/lib/propostaApbCopart";

export type L = { n: number; g: string; s: string; f: string; p: string; v: string };
/** Estrutura base da tabela 2490 (Use Bem), que aplica seus próprios valores por grupo. */
const LINHAS_BASE_USEBEM: L[] = [
  { n: 1, g: "Consultas", s: "Consulta", f: "Por Consulta", p: "-", v: "" },
  { n: 2, g: "Consulta Oftalmológica + Pacote de Exames Baixo Custo*", s: "Consulta Oftalmológica + Pacote de Exames Baixo Custo*", f: "Por Consulta Oftalmológica + Pacote de Exames Baixo Custo*", p: "-", v: "" },
  { n: 3, g: "Emergência", s: "Emergência", f: "Por Atendimento", p: "-", v: "" },
  { n: 4, g: "Internação", s: "Internação", f: "Por Internação", p: "-", v: "" },
  { n: 5, g: "Exames e Procedimentos (De 0 a 399 CHs**)", s: "Exames e Procedimentos", f: "Por Exame e/ou Procedimento", p: "", v: "" },
  { n: 6, g: "Exames e Procedimentos Especiais (Acima de 399 CHs**)", s: "Exames e Procedimentos Especiais", f: "Por Exame e/ou Procedimento", p: "", v: "" },
  ...["Acupuntura", "Fisioterapia", "Fonoaudiologia", "Terapia Ocupacional", "Psicoterapia"].map((s) => ({ n: 7, g: "Terapias (De 0 a 399 CHs**)", s, f: "Por Sessão", p: "", v: "" })),
  { n: 8, g: "Terapias Especiais (Acima de 399 CHs**)", s: "Terapias Especiais", f: "Por Sessão", p: "", v: "" },
  { n: 9, g: "Alta Complexidade", s: "Medicamentos Antineoplásicos e de Efeitos Adversos/Imunobiológicos", f: "Por Medicamento Dispensado", p: "", v: "" },
  ...["Hemodiálise/diálise", "Quimioterapia", "Radioterapia"].map((s) => ({ n: 9, g: "Alta Complexidade", s, f: "Por Mês de Execução", p: "", v: "" })),
];

const S = "8 - Sessões", G7 = "7 - Gratuitos", G9 = "9 - Grupos";
/** Valores de coparticipação do 2890 registrados no sistema (imagem fornecida). */
export const COPART_2890: [string, string, string][] = [
  ["1 - Consulta", "Consulta", "21,53"], ["1 - Consulta", "Consulta Oftalmologia + Exames Baixo Custo", "94,60"],
  ["2 - Emergência", "Emergência", "21,53"], ["3 - Internação", "Internação", "215,41"], ["4 - Ressonância", "Ressonância", "85,43"],
  ["5 - Tomografia", "Tomografia", "59,82"], ["6 - Ultrassom", "Ultrassonografia", "44,95"],
  ...["Hemodiálise/diálise", "Quimioterapia", "Radioterapia", "Radioterapia Intervencionista", "Medicamentos Antineoplásicos"].map((t) => [G7, t, "0,00"] as [string, string, string]),
  [S, "Acupuntura", "8,54"],
  ...["Fisioterapia", "Fonoaudiologia", "Psicoterapia", "Terapia Ocupacional"].flatMap((t) => [[S, `${t} - Grupo A`, "8,54"], [S, `${t} - Grupo B`, "51,26"], [S, `${t} - Grupo C`, "85,43"]] as [string, string, string][]),
  [G9, "Grupo A - de 0 a 199 CH's*", "8,54"], [G9, "Grupo B - de 200 a 399 CH's*", "51,26"], [G9, "Grupo C - de 400 a 599 CH's*", "85,43"], [G9, "Grupo D - a partir de 600 CH's*", "215,41"],
];

type Tipo = "usebem" | "flex" | "facil50";
const TITULO: Record<Tipo, string> = {
  usebem: "2490 — Use Bem com teto de R$ 396,96",
  flex: "2890 — Fácil Flex com teto de R$ 656,10",
  facil50: "Plano Proposto Unificado 2027 — Fácil 50 sem teto",
};
const td = "border border-border px-2 py-1";

function TabelaProposta() {
  const [salvos, setSalvos] = useState<LimitesCopart>(() => lerLimitesCopart(window.localStorage));
  const fmt = (k: string, v: number) => (k.startsWith("pct|") ? fmtPct(v) : fmtLimite(v));
  const [edit, setEdit] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(salvos).map(([k, v]) => [k, fmt(k, v)])));
  const [status, setStatus] = useState("");
  const parse = (t: string, k = "") => { const v = Number(t.trim().replace("%", "").replace(/\./g, "").replace(",", ".")); return t.trim() !== "" && Number.isFinite(v) && v >= 0 && (!k.startsWith("pct|") || v <= 100) ? v : null; };
  const valores = Object.fromEntries(Object.entries(edit).map(([k, t]) => [k, parse(t, k)]));
  const invalido = Object.values(valores).some((v) => v == null);
  const alterado = !invalido && Object.keys(salvos).some((k) => Math.round((valores[k] as number) * 100) !== Math.round(salvos[k] * 100));
  const gravar = () => {
    try { setSalvos(gravarLimitesCopart(window.localStorage, valores as LimitesCopart)); setStatus("Valores gravados."); }
    catch { setStatus("Não foi possível gravar neste navegador."); }
  };
  const campo = (k: string, label: string, largura: string) => <input aria-label={label} inputMode="decimal" value={edit[k]} onChange={(e) => { setStatus(""); setEdit((x) => ({ ...x, [k]: e.target.value })); }}
    onBlur={() => { const v = parse(edit[k], k); if (v != null) setEdit((x) => ({ ...x, [k]: fmt(k, v) })); }}
    className={`${largura} rounded border bg-background px-2 py-0.5 text-right ${valores[k] == null ? "border-destructive" : "border-input"}`} />;
  const restaurar = () => { setEdit(Object.fromEntries(Object.entries(LIMITES_PADRAO).map(([k, v]) => [k, fmt(k, v)]))); setStatus("Valores da tabela fornecida restaurados. Clique em Gravar para manter."); };
  const L = COPART_PROPOSTA_2027;
  return <>
    <table className="w-full border-collapse text-sm">
      <thead><tr className="bg-primary text-primary-foreground">{["#", "Grupo", "Subgrupo", "Forma de Cobrança", "% de Coparticipação", "Limite de Valor (R$)"].map((h) => <th key={h} className="border border-border px-2 py-1.5">{h}</th>)}</tr></thead>
      <tbody>{L.map((l, i) => {
        const first = i === 0 || L[i - 1].n !== l.n, span = L.filter((x) => x.n === l.n).length, k = chaveCopart(l);
        return <tr key={k}>
          {first && <><td rowSpan={span} className={`${td} text-center`}>{l.n}</td><td rowSpan={span} className={`${td} font-medium`}>{l.g}{l.nota && <span className="ml-1 font-normal text-primary">{l.nota}</span>}</td></>}
          <td className={td}>{l.s}</td><td className={td}>{l.f}</td><td className={`${td} text-center`}>{pctEditavel(l) ? <span className="inline-flex items-center gap-1">{campo(chavePct(l), `Percentual ${l.s}`, "w-14")}%</span> : l.p}</td>
          <td className={`${td} text-right`}>{campo(k, `Limite ${l.s}`, "w-24")}</td>
        </tr>;
      })}</tbody>
    </table>
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status && <span className="text-xs text-muted-foreground">{status}</span>}
      {invalido && <span className="text-xs text-destructive">Informe valores válidos (limite de R$ 0,00 ou mais; percentual de 0 a 100).</span>}
      <Button type="button" size="sm" variant="outline" onClick={restaurar}><RotateCcw className="mr-2 h-4 w-4" />Restaurar tabela</Button>
      <Button type="button" size="sm" onClick={gravar} disabled={invalido || !alterado}><Save className="mr-2 h-4 w-4" />Gravar</Button>
    </div>
    <div className="space-y-1 text-xs text-muted-foreground">{NOTAS_COPART_2027.map((t) => <p key={t}>{t}</p>)}</div>
  </>;
}

export default function PropostaApbCopart({ tipo }: { tipo: Tipo }) {
  const linhas = LINHAS_BASE_USEBEM.map((l) => (l.n === 1 ? { ...l, v: "28,39" } : l.n === 3 ? { ...l, v: "47,06" } : l.n === 4 ? { ...l, v: "284,35" } : { ...l, p: "30%", v: "Sem limite" }));
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" title="Ver tabela de coparticipação" className="ml-1 inline-flex align-middle opacity-90 hover:opacity-100"><Eye className="h-3.5 w-3.5" /></button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl space-y-2 overflow-y-auto text-foreground">
        <DialogHeader><DialogTitle>Tabela de Coparticipação — {TITULO[tipo]}</DialogTitle></DialogHeader>
        {tipo === "facil50" ? <TabelaProposta /> : tipo === "flex" ? <table className="w-full border-collapse text-sm">
          <thead><tr className="bg-primary text-primary-foreground">{["Grupo", "Tipo", "Valor (R$)"].map((h) => <th key={h} className="border border-border px-2 py-1.5">{h}</th>)}</tr></thead>
          <tbody>{COPART_2890.map(([g, t, v], i) => <tr key={i}><td className={td}>{g}</td><td className={td}>{t}</td><td className={`${td} text-right`}>{v}</td></tr>)}</tbody>
        </table> : <table className="w-full border-collapse text-sm">
          <thead><tr className="bg-primary text-primary-foreground">{["#", "Grupo", "Subgrupo", "Forma de Cobrança", "% de Coparticipação", "Limite de Valor (R$)"].map((h) => <th key={h} className="border border-border px-2 py-1.5">{h}</th>)}</tr></thead>
          <tbody>{linhas.map((l, i) => {
            const first = i === 0 || linhas[i - 1].n !== l.n;
            const span = linhas.filter((x) => x.n === l.n).length;
            return <tr key={i} className="text-center">
              {first && <><td rowSpan={span} className={td}>{l.n}</td><td rowSpan={span} className={`${td} font-medium`}>{l.g}</td></>}
              <td className={td}>{l.s}</td><td className={td}>{l.f}</td><td className={td}>{l.p}</td><td className={td}>{l.v}</td>
            </tr>;
          })}</tbody>
        </table>}
      </DialogContent>
    </Dialog>
  );
}
