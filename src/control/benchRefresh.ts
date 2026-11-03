export type BenchRefreshProgress = { completed: number; total: number; year?: number; quarter?: number };
type RefreshTasks = {
  periods: (year: number) => Promise<{ quarters: number[] }>;
  quarter: (year: number, quarter: number) => Promise<unknown>;
  progress: (progress: BenchRefreshProgress) => void;
  stopped: () => boolean;
};

/** Discover every menu year before counting and refresh each official file sequentially. */
export async function refreshBenchYears(years: number[], tasks: RefreshTasks): Promise<void> {
  const jobs: { year: number; quarter: number }[] = [];
  const failures: string[] = [];
  tasks.progress({ completed: 0, total: 0 });
  for (const year of [...new Set(years)]) {
    if (tasks.stopped()) throw new Error("Atualização interrompida.");
    try {
      const period = await tasks.periods(year);
      jobs.push(...[...new Set(period.quarters)].sort((a, b) => a - b).map(quarter => ({ year, quarter })));
    } catch { failures.push(`${year}: períodos indisponíveis`); }
  }
  let completed = 0;
  // Discovery failures remain part of the denominator: partial success never displays 100%.
  const total = jobs.length + failures.length;
  tasks.progress({ completed, total });
  for (const job of jobs) {
    if (tasks.stopped()) throw new Error("Atualização interrompida.");
    tasks.progress({ completed, total, ...job });
    try { await tasks.quarter(job.year, job.quarter); completed++; }
    catch { failures.push(`${job.year}/${job.quarter}º tri`); }
    tasks.progress({ completed, total, ...job });
  }
  if (failures.length) throw new Error(`Atualização incompleta. Não foi possível atualizar: ${failures.join(", ")}. Tente novamente.`);
  if (!jobs.length) throw new Error("Nenhum trimestre disponível para atualização.");
}