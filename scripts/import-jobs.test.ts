import { describe, expect, it } from "vitest";
import { parseCsv } from "./import-jobs";

describe("parseCsv", () => {
  it("handles BOM, quotes, embedded commas, newlines and escaped quotes", () => {
    const csv =
      "﻿title,skills,description\r\n" +
      'Clerk,"Excel, typing","Line one\nline ""two"""\r\n' +
      "Packer,packing,\r\n";
    expect(parseCsv(csv)).toEqual([
      {
        title: "Clerk",
        skills: "Excel, typing",
        description: 'Line one\nline "two"',
      },
      { title: "Packer", skills: "packing", description: "" },
    ]);
  });

  it("returns nothing for an empty file", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
