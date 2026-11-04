/** Formatting helpers for the OKU dashboard (Malaysian locale, RM). */

const numberFmt = new Intl.NumberFormat("en-MY");

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** Share of `part` in `whole` as a percentage (0 when whole is 0). */
export function percentOf(part: number, whole: number): number {
  return whole ? (part / whole) * 100 : 0;
}

export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min == null && max == null) return "Not stated";
  if (min != null && max != null) {
    return `${formatNumber(min)} – ${formatNumber(max)}`;
  }
  return formatNumber((min ?? max) as number);
}
