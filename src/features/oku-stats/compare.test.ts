import { describe, expect, it } from "vitest";
import { compareWithPopulation, type DosmLabour } from "./compare";

const dosm = {
  meta: {
    source: "",
    license: "",
    lfsYear: "2024",
    wagesMonth: "2026-06",
    downloadedOn: "",
  },
  districts: [
    {
      name: "Petaling",
      workingAgeThousands: 1,
      employedThousands: 1,
      employmentRate: 78,
      unemploymentRate: 2,
      participationRate: 80,
    },
    {
      name: "Klang",
      workingAgeThousands: 1,
      employedThousands: 1,
      employmentRate: 78.2,
      unemploymentRate: 2,
      participationRate: 80,
    },
    {
      name: "Sepang",
      workingAgeThousands: 1,
      employedThousands: 1,
      employmentRate: 75,
      unemploymentRate: 2,
      participationRate: 80,
    },
  ],
  selangorMedianWage: 3245,
  wageTrend: [],
} satisfies DosmLabour;

const d = (name: string, workingAge: number, employed: number) => ({
  name,
  total: 0,
  workingAge,
  employed,
  rate: 0,
});

describe("compareWithPopulation", () => {
  it("merges the three Petaling offices and sorts by widest gap", () => {
    const rows = compareWithPopulation(
      [
        d("Petaling Jaya", 100, 20),
        d("Subang Jaya", 100, 30),
        d("Shah Alam", 200, 10),
        d("Klang", 100, 40),
      ],
      dosm,
    );
    expect(rows).toEqual([
      { district: "Petaling", oku: 15, population: 78, gap: 63 },
      { district: "Klang", oku: 40, population: 78.2, gap: 38.2 },
    ]); // Sepang has no OKU data here, so it is left out
  });
});
