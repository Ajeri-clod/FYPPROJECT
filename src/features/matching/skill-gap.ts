import { parseSkills } from "@/features/jobs/schema";

const key = (skill: string) => skill.trim().toLowerCase();

export interface SkillCount {
  skill: string;
  count: number;
}

/** How many items list each skill (case-insensitive), most common first. */
export function countSkills(skillLists: string[]): SkillCount[] {
  const counts = new Map<string, SkillCount>();
  for (const list of skillLists) {
    for (const skill of parseSkills(list)) {
      const k = key(skill);
      const entry = counts.get(k);
      if (entry) entry.count += 1;
      else counts.set(k, { skill, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.skill.localeCompare(b.skill),
  );
}

export interface SkillGapRow {
  skill: string;
  /** % of open postings that require the skill. */
  demand: number;
  /** % of job-seekers who list the skill. */
  supply: number;
  /** demand − supply, in percentage points (positive = shortage). */
  gap: number;
}

/** Compare employer demand against job-seeker supply for every demanded skill. */
export function skillGapTable(
  jobSkills: string[],
  candidateSkills: string[],
): SkillGapRow[] {
  const supply = new Map(
    countSkills(candidateSkills).map((s) => [key(s.skill), s.count]),
  );
  return countSkills(jobSkills)
    .map(({ skill, count }) => {
      const demand = jobSkills.length ? (count / jobSkills.length) * 100 : 0;
      const sup = candidateSkills.length
        ? ((supply.get(key(skill)) ?? 0) / candidateSkills.length) * 100
        : 0;
      return { skill, demand, supply: sup, gap: demand - sup };
    })
    .sort((a, b) => b.gap - a.gap);
}

export interface CandidateGap {
  matched: string[];
  missing: string[];
  /** Matched ÷ required, as a percentage. */
  coverage: number;
}

/** Which of a job's required skills a candidate has, and which are missing. */
export function candidateSkillGap(
  candidateSkills: string,
  jobSkills: string,
): CandidateGap {
  const have = new Set(parseSkills(candidateSkills).map(key));
  const required = parseSkills(jobSkills);
  const matched = required.filter((s) => have.has(key(s)));
  const missing = required.filter((s) => !have.has(key(s)));
  return {
    matched,
    missing,
    coverage: required.length ? (matched.length / required.length) * 100 : 0,
  };
}
