import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  fitTfidf,
  rankBySimilarity,
  tokenize,
} from "./tfidf";

describe("tokenize", () => {
  it("keeps words and whole multi-word skill phrases", () => {
    expect(tokenize("Customer Service, Excel")).toEqual([
      "customer",
      "service",
      "customer service",
      "excel",
    ]);
  });

  it("drops stop words and single characters", () => {
    expect(tokenize("basic knowledge of a computer")).toEqual([
      "knowledge",
      "computer",
      "knowledge computer",
    ]);
  });
});

describe("fitTfidf", () => {
  it("weights rare terms above common ones (smooth idf)", () => {
    const model = fitTfidf(["excel typing", "excel sewing", "excel cooking"]);
    expect(model.idf.get("excel")).toBeCloseTo(1);
    expect(model.idf.get("sewing")).toBeCloseTo(Math.log(4 / 2) + 1);
  });

  it("produces l2-normalised vectors", () => {
    const model = fitTfidf(["excel typing", "sewing"]);
    const v = model.vectorize("excel typing");
    const norm = Math.sqrt([...v.values()].reduce((s, w) => s + w * w, 0));
    expect(norm).toBeCloseTo(1);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors and 0 for disjoint ones", () => {
    const model = fitTfidf(["excel typing", "sewing baking"]);
    const a = model.vectorize("excel typing");
    expect(cosineSimilarity(a, a)).toBeCloseTo(1);
    expect(cosineSimilarity(a, model.vectorize("sewing baking"))).toBe(0);
  });
});

describe("rankBySimilarity", () => {
  it("ranks the job sharing the most skills first and explains why", () => {
    const ranked = rankBySimilarity("data entry, Microsoft Excel, typing", [
      { id: "cook", text: "food preparation, hygiene" },
      { id: "clerk", text: "data entry, Microsoft Excel, record keeping" },
      { id: "cashier", text: "cashiering, typing" },
    ]);
    expect(ranked.map((r) => r.item.id)).toEqual(["clerk", "cashier", "cook"]);
    expect(ranked[0].sharedTerms).toContain("data entry");
    expect(ranked[2].score).toBe(0);
  });

  it("returns nothing for an empty job list", () => {
    expect(rankBySimilarity("excel", [])).toEqual([]);
  });
});
