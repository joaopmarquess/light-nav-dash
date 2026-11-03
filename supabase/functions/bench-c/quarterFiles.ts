/** Fixed official ANS filenames; never accept a caller-supplied URL. */
export function quarterFilename(year: number, quarter: number): string {
  return year === 2017 && quarter === 3 ? "3-Trimestre.zip" : `${quarter}T${year}.zip`;
}
export function availableQuarters(directory: string, year: number): number[] {
  const filenames = new Set([...directory.matchAll(/href=["']([^"']+)["']/gi)].map(match => match[1].split("/").pop()?.toLowerCase()));
  return [1, 2, 3, 4].filter(quarter => filenames.has(quarterFilename(year, quarter).toLowerCase()));
}