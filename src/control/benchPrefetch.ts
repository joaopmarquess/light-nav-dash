type Preparation = {
  stopped: () => boolean;
  periods: (year: number) => Promise<{ quarters: number[] }>;
  quarter: (year: number, quarter: number) => Promise<unknown>;
};
/** Keep historical work sequential and stop advancing when the foreground changes. */
export async function prepareBenchYears(years: number[], tasks: Preparation): Promise<void> {
  for (const year of years) {
    if (tasks.stopped()) return;
    try {
      const period = await tasks.periods(year);
      for (const quarter of [...period.quarters].sort((a, b) => a - b)) {
        if (tasks.stopped()) return;
        await tasks.quarter(year, quarter);
      }
    } catch { /* A historical failure must not block the active screen or subsequent years. */ }
  }
}