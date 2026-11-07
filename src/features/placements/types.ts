/** Shape of src/data/perkeso-placements.json (scripts/build_perkeso_stats.py). */

export const PROGRAMMES = ["total", "mfj", "dm"] as const;
export type Programme = (typeof PROGRAMMES)[number];

/** Five yearly values, aligned with `years`. */
type Series = number[];

export interface Breakdown {
  items: ({ name: string } & Record<Programme, Series>)[];
  underReview: Record<Programme, Series>;
}

export interface PerkesoPlacements {
  meta: {
    source: string;
    builtOn: string;
    programmes: Record<Programme, string>;
    notProvided: string[];
  };
  years: number[];
  placements: Record<Programme, Series>;
  sector: Breakdown;
  occupation: Breakdown;
  salary: Breakdown;
  support: { programmes?: (number | null)[]; attendance?: (number | null)[] };
}

/** "all" = 2021–2025 combined, otherwise one year. */
export type YearFilter = "all" | `${number}`;

/** Sum a series for one year, or all years. */
export function pick(
  series: Series,
  years: number[],
  year: YearFilter,
): number {
  if (year === "all") return series.reduce((a, b) => a + b, 0);
  const i = years.indexOf(Number(year));
  return i >= 0 ? series[i] : 0;
}

/** Known categories for one programme/year, largest first, plus the under-review count. */
export function slice(
  breakdown: Breakdown,
  years: number[],
  programme: Programme,
  year: YearFilter,
  sort = true,
) {
  const items = breakdown.items
    .map((it) => ({ name: it.name, count: pick(it[programme], years, year) }))
    .filter((it) => it.count > 0);
  if (sort) items.sort((a, b) => b.count - a.count);
  const underReview = pick(breakdown.underReview[programme], years, year);
  const known = items.reduce((a, b) => a + b.count, 0);
  return { items, known, underReview };
}

/** Salary band containing the median placement (bands must be in ascending order). */
export function medianBand(items: { name: string; count: number }[]): string {
  const total = items.reduce((a, b) => a + b.count, 0);
  let run = 0;
  for (const it of items) {
    run += it.count;
    if (run >= total / 2) return it.name;
  }
  return "—";
}
