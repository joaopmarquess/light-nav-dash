import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type L = { n: number; g: string; s: string; f: string; p: string; v: string };
export const LINHAS_COPART_FACIL50: L[] = [
  { n: 1, g: "Consultas", s: "Consulta", f: "Por Consulta", p: "-", v: "21,00" },
  { n: 2, g: "Consulta Oftalmológica + Pacote de Exames Baixo Custo*", s: "Consulta Oftalmológica + Pacote de Exames Baixo Custo*", f: "Por Consulta Oftalmológica + Pacote de Exames Baixo Custo*", p: "-", v: "42,00" },
  { n: 3, g: "Emergência", s: "Emergência", f: "Por Atendimento", p: "-", v: "79,00" },
  { n: 4, g: "Internação", s: "Internação", f: "Por Internação", p: "-", v: "150,00" },
  { n: 5, g: "Exames e Procedimentos (De 0 a 399 CHs**)", s: "Exames e Procedimentos", f: "Por Exame e/ou Procedimento", p: "50%", v: "79,00" },
  { n: 6, g: "Exames e Procedimentos Especiais (Acima de 399 CHs**)", s: "Exames e Procedimentos Especiais", f: "Por Exame e/ou Procedimento", p: "50%", v: "150,00" },
  ...["Acupuntura", "Fisioterapia", "Fonoaudiologia", "Terapia Ocupacional", "Psicoterapia"].map((s) => ({ n: 7, g: "Terapias (De 0 a 399 CHs**)", s, f: "Por Sessão", p: "50%", v: "79,00" })),
  { n: 8, g: "Terapias Especiais (Acima de 399 CHs**)", s: "Terapias Especiais", f: "Por Sessão", p: "50%", v: "150,00" },
  { n: 9, g: "Alta Complexidade", s: "Medicamentos Antineoplásicos e de Efeitos Adversos/Imunobiológicos", f: "Por Medicamento Dispensado", p: "50%", v: "-" },
  ...["Hemodiálise/diálise", "Quimioterapia", "Radioterapia"].map((s) => ({ n: 9, g: "Alta Complexidade", s, f: "Por Mês de Execução", p: "50%", v: "-" })),
];

type Tipo = "usebem" | "flex" | "facil50";
const CFG: Record<Tipo, { t: string; pct: string; teto: string | null; ilustr: boolean }> = {
  usebem: { t: "2490 — Use Bem com teto de R$ 396,96", pct: "30%", teto: "R$ 396,96", ilustr: true },
  flex: { t: "2890 — Fácil Flex com teto de R$ 656,10", pct: "40%", teto: "R$ 656,10", ilustr: true },
  facil50: { t: "Proposta — Fácil 50 sem teto", pct: "50%", teto: null, ilustr: false },
};

export default function PropostaApbCopart({ tipo }: { tipo: Tipo }) {
  const c = CFG[tipo];
  const linhas = LINHAS_COPART_FACIL50.map((l) => (l.p === "-" ? l : { ...l, p: c.pct }));
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" title="Ver tabela de coparticipação" className="ml-1 inline-flex align-middle opacity-90 hover:opacity-100"><Eye className="h-3.5 w-3.5" /></button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>Tabela de Coparticipação — {c.t}</DialogTitle></DialogHeader>
        {c.ilustr && <p className="rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm">Tabela ilustrativa: percentuais e limites a confirmar. Teto mensal de coparticipação: {c.teto}.</p>}
        <table className="w-full border-collapse text-sm">
          <thead><tr className="bg-primary text-primary-foreground">{["#", "Grupo", "Subgrupo", "Forma de Cobrança", "% de Coparticipação", "Limite de Valor (R$)"].map((h) => <th key={h} className="border border-border px-2 py-1.5">{h}</th>)}</tr></thead>
          <tbody>{linhas.map((l, i) => {
            const first = i === 0 || linhas[i - 1].n !== l.n;
            const span = linhas.filter((x) => x.n === l.n).length;
            return <tr key={i} className="text-center">
              {first && <><td rowSpan={span} className="border border-border px-2 py-1">{l.n}</td><td rowSpan={span} className="border border-border px-2 py-1 font-medium">{l.g}</td></>}
              <td className="border border-border px-2 py-1">{l.s}</td><td className="border border-border px-2 py-1">{l.f}</td><td className="border border-border px-2 py-1">{l.p}</td><td className="border border-border px-2 py-1">{l.v}</td>
            </tr>;
          })}</tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
