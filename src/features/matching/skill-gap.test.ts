import { describe, expect, it } from "vitest";
import { candidateSkillGap, countSkills, skillGapTable } from "./skill-gap";

describe("countSkills", () => {
  it("counts case-insensitively and sorts by frequency", () => {
    expect(countSkills(["Excel, typing", "excel", "Sewing"])).toEqual([
      { skill: "Excel", count: 2 },
      { skill: "Sewing", count: 1 },
      { skill: "typing", count: 1 },
    ]);
  });
});

describe("skillGapTable", () => {
  it("puts the biggest shortage first", () => {
    const rows = skillGapTable(
      ["excel, typing", "excel"],
      ["typing", "typing"],
    );
    expect(rows[0]).toMatchObject({ skill: "excel", demand: 100, supply: 0 });
    expect(rows[1]).toMatchObject({ skill: "typing", demand: 50, supply: 100 });
  });
});

describe("candidateSkillGap", () => {
  it("splits required skills into matched and missing", () => {
    const gap = candidateSkillGap(
      "Excel, Typing",
      "excel, typing, filing, SQL",
    );
    expect(gap.matched).toEqual(["excel", "typing"]);
    expect(gap.missing).toEqual(["filing", "SQL"]);
    expect(gap.coverage).toBe(50);
  });
});
