import { describe, expect, it } from "vitest";
import { demoJobs } from "@/features/jobs/demo-data";
import { sampleCandidates } from "./candidates";
import {
  CANDIDATE_FAMILIES,
  evaluateRecommender,
  JOB_FAMILY,
} from "./evaluation";

const job = (id: string, title: string, skills: string, status = "open") => ({
  id,
  title,
  skills,
  description: "",
  status,
});

describe("evaluateRecommender", () => {
  it("computes precision, R-precision, hit@1, MRR, random baseline and ceiling", () => {
    const jobs = [
      job("1", "Data Entry Clerk", "data entry, typing, Microsoft Excel"),
      job("2", "Accounts Clerk", "bookkeeping, Microsoft Excel"),
      job("3", "Cashier", "cashiering, cash handling"),
      job("4", "Barista", "coffee, hygiene", "closed"), // closed: never counted
    ];
    const candidate = {
      id: "C-0009", // families: finance, clerical
      district: "Klang",
      disabilityCategory: "Physical",
      ageBand: "25–34",
      education: "Diploma",
      skills: "bookkeeping, Microsoft Excel, data entry",
      experience: "",
    };
    const r = evaluateRecommender(jobs, [candidate], 2);
    expect(r.jobsEvaluated).toBe(3);
    const c = r.perCandidate[0];
    expect(c.top.map((t) => t.relevant)).toEqual([true, true]);
    expect(c.precisionAtK).toBe(1);
    expect(c.rPrecisionAtK).toBe(1);
    expect(c.hitAt1).toBe(1);
    expect(c.reciprocalRank).toBe(1);
    expect(c.randomPrecision).toBeCloseTo(2 / 3);
    expect(c.bestPossiblePrecision).toBe(1);
  });

  it("skips job-seekers with no suitable open job instead of scoring them 0", () => {
    const r = evaluateRecommender(
      [job("1", "Cashier", "cashiering")],
      [{ ...sampleCandidates[11] }], // C-0012, agriculture
      5,
    );
    expect(r.candidatesSkipped).toEqual(["C-0012"]);
    expect(r.candidatesEvaluated).toBe(0);
  });

  it("labels every benchmark job and every sample job-seeker", () => {
    for (const j of demoJobs)
      expect(JOB_FAMILY[j.title], j.title).toBeDefined();
    for (const c of sampleCandidates)
      expect(CANDIDATE_FAMILIES[c.id], c.id).toBeDefined();
  });

  it("beats random recommendations on the benchmark", () => {
    const r = evaluateRecommender(demoJobs, sampleCandidates, 5);
    expect(r.meanPrecisionAtK).toBeGreaterThan(r.meanRandomPrecision * 3);
    expect(r.hitRateAt1).toBeGreaterThanOrEqual(0.9);
  });
});
