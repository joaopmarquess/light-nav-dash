import { MESES } from "./types";

type Props = {
  anos: number[];
  ano: number | null;
  mes: number | null;
  trimestre: number | null;
  onAno: (v: number | null) => void;
  onMes: (v: number | null) => void;
  onTrim: (v: number | null) => void;
  extra?: React.ReactNode;
};

export default function FiltersBar({ anos, ano, mes, trimestre, onAno, onMes, onTrim, extra }: Props) {
  const sel =
    "h-9 rounded-md border border-border bg-background text-sm text-foreground px-2 focus:outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <label className="text-[11px] text-muted-foreground mb-1">Ano</label>
        <select
          className={sel}
          value={ano ?? ""}
          onChange={(e) => onAno(e.target.value ? Number(e.target.value) : null)}
        >
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-[11px] text-muted-foreground mb-1">Mês</label>
        <select
          className={sel}
          value={mes ?? ""}
          onChange={(e) => onMes(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Todos</option>
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-[11px] text-muted-foreground mb-1">Trimestre</label>
        <select
          className={sel}
          value={trimestre ?? ""}
          onChange={(e) => onTrim(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Todos</option>
          <option value={1}>1º Tri</option>
          <option value={2}>2º Tri</option>
          <option value={3}>3º Tri</option>
          <option value={4}>4º Tri</option>
        </select>
      </div>
      {extra}
    </div>
  );
}
