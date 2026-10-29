import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type L = { n: number; g: string; s: string; f: string; p: string; v: string };
const LINHAS: L[] = [
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

export default function PropostaApbCopart() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" title="Ver tabela de coparticipação" className="ml-1 inline-flex align-middle opacity-90 hover:opacity-100"><Eye className="h-3.5 w-3.5" /></button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>Tabela de Coparticipação — 2890 (Fácil 50 sem teto)</DialogTitle></DialogHeader>
        <table className="w-full border-collapse text-xs">
          <thead><tr className="bg-primary text-primary-foreground">{["#", "Grupo", "Subgrupo", "Forma de Cobrança", "% de Coparticipação", "Limite de Valor (R$)"].map((h) => <th key={h} className="border border-border px-2 py-1.5">{h}</th>)}</tr></thead>
          <tbody>{LINHAS.map((l, i) => {
            const first = i === 0 || LINHAS[i - 1].n !== l.n;
            const span = LINHAS.filter((x) => x.n === l.n).length;
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
