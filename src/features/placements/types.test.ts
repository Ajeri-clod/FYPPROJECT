import { describe, expect, it } from "vitest";
import { type Breakdown, medianBand, pick, slice } from "./types";

const years = [2021, 2022, 2023, 2024, 2025];
const s = (v: number[]) => ({ total: v, mfj: v, dm: [0, 0, 0, 0, 0] });

describe("placements helpers", () => {
  it("picks one year or sums all", () => {
    expect(pick([1, 2, 3, 4, 5], years, "2024")).toBe(4);
    expect(pick([1, 2, 3, 4, 5], years, "all")).toBe(15);
    expect(pick([1, 2, 3, 4, 5], years, "2019")).toBe(0);
  });

  it("slices known categories and keeps under-review separate", () => {
    const b: Breakdown = {
      items: [
        { name: "A", ...s([1, 0, 0, 0, 2]) },
        { name: "B", ...s([0, 0, 0, 0, 5]) },
        { name: "C", ...s([0, 0, 0, 0, 0]) },
      ],
      underReview: s([0, 0, 0, 0, 3]),
    };
    expect(slice(b, years, "total", "2025")).toEqual({
      items: [
        { name: "B", count: 5 },
        { name: "A", count: 2 },
      ],
      known: 7,
      underReview: 3,
    });
  });

  it("finds the median salary band", () => {
    expect(
      medianBand([
        { name: "low", count: 10 },
        { name: "mid", count: 30 },
        { name: "high", count: 5 },
      ]),
    ).toBe("mid");
  });
});
