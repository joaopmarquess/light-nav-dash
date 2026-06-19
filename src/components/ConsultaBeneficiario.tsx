import { useMemo, useState } from "react";
import { Search } from "lucide-react";

type Beneficiario = {
  codigo: string;
  nome: string;
  vigencia: string; // dd/mm/aaaa
  reativacao: string | null;
  cancelamento: string | null;
  status: 0 | 1;
};

// Pseudo-random determinístico
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMES = [
  "ANA", "JOSE", "MARIA", "JOAO", "ANTONIO", "FRANCISCO", "CARLOS", "PAULO",
  "PEDRO", "LUCAS", "LUIZ", "MARCOS", "GABRIEL", "RAFAEL", "DANIEL", "MARCELO",
  "BRUNO", "EDUARDO", "FELIPE", "RODRIGO", "MANOEL", "FERNANDO", "GUSTAVO", "DIEGO",
  "JULIANA", "MARIANA", "FERNANDA", "PATRICIA", "ALINE", "AMANDA", "BEATRIZ", "CAMILA",
  "CARLA", "CLAUDIA", "DANIELA", "ELAINE", "GABRIELA", "ISABELA", "LARISSA", "LETICIA",
  "LUANA", "MARCIA", "MONICA", "NATALIA", "PRISCILA", "RENATA", "SANDRA", "TATIANA",
  "VANESSA", "VIVIANE",
];
const SOBRENOMES = [
  "SILVA", "SANTOS", "OLIVEIRA", "SOUZA", "RODRIGUES", "FERREIRA", "ALVES", "PEREIRA",
  "LIMA", "GOMES", "RIBEIRO", "CARVALHO", "ALMEIDA", "LOPES", "SOARES", "FERNANDES",
  "VIEIRA", "BARBOSA", "ROCHA", "DIAS", "NASCIMENTO", "ANDRADE", "MOREIRA", "NUNES",
  "MARQUES", "MACHADO", "MENDES", "FREITAS", "CARDOSO", "RAMOS", "GONCALVES", "SANTANA",
  "TEIXEIRA", "ARAUJO", "PINTO", "BATISTA", "CORREIA", "CASTRO", "CAMPOS", "MELO",
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(d: Date) { return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; }

const BENEFICIARIOS: Beneficiario[] = (() => {
  const rand = mulberry32(20260619);
  const out: Beneficiario[] = [];
  const total = 3000;
  const hoje = new Date();
  for (let i = 0; i < total; i++) {
    const nome = `${NOMES[Math.floor(rand() * NOMES.length)]} ${SOBRENOMES[Math.floor(rand() * SOBRENOMES.length)]} ${SOBRENOMES[Math.floor(rand() * SOBRENOMES.length)]}`;
    const codigo = String(100000 + i);
    // vigência: entre 2010 e 2024
    const vigDate = new Date(2010 + Math.floor(rand() * 15), Math.floor(rand() * 12), 1 + Math.floor(rand() * 28));
    const vigencia = fmtDate(vigDate);

    let reativacao: string | null = null;
    let cancelamento: string | null = null;
    let status: 0 | 1 = 1;

    const r = rand();
    if (r < 0.18) {
      // cancelado
      const cancDate = new Date(vigDate.getTime() + (30 + Math.floor(rand() * 365 * 10)) * 86400000);
      if (cancDate < hoje) {
        cancelamento = fmtDate(cancDate);
        status = 0;
      }
    } else if (r < 0.25) {
      // reativado (cancelou e voltou)
      const cancDate = new Date(vigDate.getTime() + (60 + Math.floor(rand() * 365 * 5)) * 86400000);
      const reatDate = new Date(cancDate.getTime() + (30 + Math.floor(rand() * 365 * 3)) * 86400000);
      if (cancDate < hoje) cancelamento = fmtDate(cancDate);
      if (reatDate < hoje) {
        reativacao = fmtDate(reatDate);
        status = 1;
      } else if (cancelamento) {
        status = 0;
      }
    }
    out.push({ codigo, nome, vigencia, reativacao, cancelamento, status });
  }
  return out;
})();

export default function ConsultaBeneficiario() {
  const [termo, setTermo] = useState("");
  const [consultado, setConsultado] = useState<string | null>(null);

  const resultados = useMemo(() => {
    if (consultado === null) return [];
    const q = consultado.trim().toUpperCase();
    if (!q) return [];
    const partes = q.split(/\s+/).filter(Boolean);
    return BENEFICIARIOS.filter((b) => partes.every((p) => b.nome.includes(p))).slice(0, 500);
  }, [consultado]);

  const onConsultar = () => setConsultado(termo);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            NOME BENEFICIÁRIO
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onConsultar(); }}
              placeholder="Digite parte do nome (ex: ANA SILVA)"
              className="h-10 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onConsultar}
          className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Consultar
        </button>
      </div>

      {consultado !== null && (
        <div className="text-xs text-muted-foreground">
          {resultados.length === 0
            ? "Nenhum beneficiário encontrado."
            : `${resultados.length} beneficiário(s) encontrado(s)${resultados.length === 500 ? " (exibindo os primeiros 500)" : ""}.`}
        </div>
      )}

      {resultados.length > 0 && (
        <div className="overflow-auto border border-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Nome Beneficiário</th>
                <th className="px-3 py-2 text-left">Vigência</th>
                <th className="px-3 py-2 text-left">Reativação</th>
                <th className="px-3 py-2 text-left">Cancelamento</th>
                <th className="px-3 py-2 text-center">Status Hoje</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((b) => (
                <tr key={b.codigo} className="border-t border-border hover:bg-accent/40">
                  <td className="px-3 py-2 tabular-nums">{b.codigo}</td>
                  <td className="px-3 py-2">{b.nome}</td>
                  <td className="px-3 py-2 tabular-nums">{b.vigencia}</td>
                  <td className="px-3 py-2 tabular-nums">{b.reativacao ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{b.cancelamento ?? "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-semibold ${
                        b.status === 1
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                      title={b.status === 1 ? "Ativo" : "Cancelado"}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
