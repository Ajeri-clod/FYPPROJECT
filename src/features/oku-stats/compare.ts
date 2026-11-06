import type { DistrictSummary } from "./types";

/** Shape of src/data/dosm-labour.json (scripts/build_labour_stats.py). */
export interface DosmLabour {
  meta: {
    source: string;
    license: string;
    lfsYear: string;
    wagesMonth: string;
    downloadedOn: string;
  };
  districts: {
    name: string;
    workingAgeThousands: number;
    employedThousands: number;
    employmentRate: number;
    unemploymentRate: number;
    participationRate: number;
  }[];
  selangorMedianWage: number;
  wageTrend: { name: string; median: number }[];
}

/** JKM offices that DOSM reports together as the Petaling district. */
export const PETALING_OFFICES = ["Petaling Jaya", "Subang Jaya", "Shah Alam"];

export interface EmploymentComparison {
  district: string;
  /** Employed ÷ working-age registered OKU, %. */
  oku: number;
  /** Employed ÷ working-age population (DOSM LFS), %. */
  population: number;
  /** population − oku, percentage points. */
  gap: number;
}

/** OKU vs whole-population employment rate for each DOSM district, widest gap first. */
export function compareWithPopulation(
  okuDistricts: DistrictSummary[],
  dosm: DosmLabour,
): EmploymentComparison[] {
  const oku = new Map<string, { workingAge: number; employed: number }>();
  for (const d of okuDistricts) {
    const key = PETALING_OFFICES.includes(d.name) ? "Petaling" : d.name;
    const acc = oku.get(key) ?? { workingAge: 0, employed: 0 };
    acc.workingAge += d.workingAge;
    acc.employed += d.employed;
    oku.set(key, acc);
  }
  return dosm.districts
    .filter((d) => oku.get(d.name)?.workingAge)
    .map((d) => {
      const o = oku.get(d.name) as { workingAge: number; employed: number };
      const okuRate = Math.round((o.employed / o.workingAge) * 1000) / 10;
      return {
        district: d.name,
        oku: okuRate,
        population: d.employmentRate,
        gap: Math.round((d.employmentRate - okuRate) * 10) / 10,
      };
    })
    .sort((a, b) => b.gap - a.gap);
}
