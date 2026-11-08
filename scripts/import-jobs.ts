/**
 * Load scraped job postings into the dashboard.
 *
 *   bun run import-jobs scraper/output/jobs.csv
 *
 * Validates every row against the job-posting schema and writes
 * src/data/jobs-imported.json (git-ignored). When it has rows, the Job Postings list
 * (and Labour Market Insights, Recommendations, Skill-Gap) use them instead of
 * the sample postings. Run with `--clear` to go back to the sample data.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { industries, jobInputSchema } from "../src/features/jobs/schema";

const OUT = join(process.cwd(), "src", "data", "jobs-imported.json");

/** RFC 4180 CSV parser (quoted fields, embedded commas/newlines, "" escapes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  if (!header) return [];
  return body.map((cells) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), cells[i] ?? ""])),
  );
}

const toInt = (v: string | undefined) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function main() {
  const arg = process.argv[2];
  if (arg === "--clear") {
    if (existsSync(OUT)) rmSync(OUT);
    console.log(
      "Cleared imported jobs — the dashboard is back on sample data.",
    );
    return;
  }
  if (!arg) {
    console.error(
      "Usage: bun run import-jobs <path/to/jobs.csv>   (or --clear)",
    );
    process.exit(1);
  }

  const known = new Set<string>(industries);
  const rows = parseCsv(readFileSync(arg, "utf8"));
  const jobs = [];
  const skipped: string[] = [];

  for (const [index, r] of rows.entries()) {
    const parsed = jobInputSchema.safeParse({
      title: r.title,
      employer: r.employer || "Not stated",
      industry: known.has(r.industry) ? r.industry : "Other",
      district: r.district || "Not stated",
      employmentType: r.employmentType || "Full-time",
      skills: r.skills,
      description: r.description,
      accommodations: r.accommodations,
      salaryMin: toInt(r.salaryMin),
      salaryMax: toInt(r.salaryMax),
      status: "open",
      source: r.source || "Web",
      url: /^https?:\/\//.test(r.url ?? "") ? r.url : "",
    });
    if (!parsed.success) {
      skipped.push(
        `row ${index + 2} (${r.title || "untitled"}): ${parsed.error.issues[0]?.message}`,
      );
      continue;
    }
    const posted = /^\d{4}-\d{2}-\d{2}$/.test(r.datePosted ?? "")
      ? `${r.datePosted}T00:00:00Z`
      : new Date().toISOString();
    jobs.push({
      id: crypto.randomUUID(),
      ...parsed.data,
      createdAt: posted,
      updatedAt: posted,
    });
  }

  writeFileSync(OUT, `${JSON.stringify(jobs, null, 1)}\n`);
  console.log(`Imported ${jobs.length} of ${rows.length} rows into ${OUT}`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length}:`);
    for (const s of skipped.slice(0, 20)) console.log(`  - ${s}`);
  }
  console.log("Restart `bun run dev` (or the start file) to see them.");
}

if (import.meta.main) main();
