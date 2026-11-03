import type { BenchRefreshProgress } from "@/control/benchRefresh";

export default function BenchRefreshThermometer({ progress }: { progress: BenchRefreshProgress }) {
  const percent = progress.total ? Math.floor(progress.completed / progress.total * 100) : 0;
  const height = percent * 1.8;
  return <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-4" role="progressbar" aria-label="Atualização de todos os anos da ANS" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
    <svg viewBox="0 0 110 260" className="h-64 w-28 shrink-0" aria-hidden="true">
      <path d="M35 204V30a20 20 0 0 1 40 0v174a31 31 0 1 1-40 0Z" className="fill-card stroke-foreground/60" strokeWidth="3" />
      <rect x="45" y="30" width="20" height="180" rx="10" className="fill-muted" />
      <rect x="45" y={210 - height} width="20" height={height} rx="8" className="fill-primary transition-all duration-500 motion-reduce:transition-none" />
      <circle cx="55" cy="228" r="21" className="fill-primary" />
      {[0, 25, 50, 75, 100].map(value => <g key={value}><line x1="78" x2="85" y1={210 - value * 1.8} y2={210 - value * 1.8} className="stroke-muted-foreground" /><text x="89" y={214 - value * 1.8} fontSize="10" className="fill-muted-foreground">{value}</text></g>)}
    </svg>
    <p className="text-3xl font-semibold tabular-nums">{percent}%</p>
    <p className="text-sm font-medium" aria-live="polite">{progress.total ? `Atualizando ${progress.year ?? ""}${progress.quarter ? ` · ${progress.quarter}º trimestre` : ""}` : "Identificando os trimestres de todos os anos…"}</p>
    <p className="text-sm text-muted-foreground">{progress.completed} / {progress.total || "—"} arquivos atualizados</p>
  </div>;
}