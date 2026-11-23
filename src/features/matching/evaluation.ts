/**
 * Offline evaluation of the job recommender (Research Objective 2, section 3.7.4).
 *
 * Ground truth is defined independently of the model: every benchmark job
 * (the 30 bundled sample postings) has an occupation family, and every sample
 * job-seeker has the families that suit their education, skills and
 * experience. A recommended job is "relevant" when its family is one of the
 * job-seeker's families. The labels are the researcher's judgement and are
 * listed here so a supervisor or expert can review and change them.
 *
 * Metrics, over open jobs only (closed jobs are never recommended):
 *   Precision@k  = relevant jobs in the top k / k
 *   R-Precision@k = relevant in top k / min(k, number of relevant jobs)
 *                   (fair when a job-seeker has fewer than k suitable jobs)
 *   Hit@1        = top recommendation is relevant (1 or 0)
 *   MRR          = 1 / rank of the first relevant job
 * Baseline: picking k open jobs at random, whose expected precision is
 * (relevant open jobs) / (open jobs).
 * Ceiling: the best Precision@k any ranking could reach, min(k, relevant) / k,
 * which is low for job-seekers with only one or two suitable jobs.
 */
import type { Job } from "@/db/schema";
import { type Candidate, candidateText } from "./candidates";
import { rankBySimilarity } from "./tfidf";

export type Family =
  | "customer-service"
  | "clerical"
  | "finance"
  | "creative-digital"
  | "software-it"
  | "retail"
  | "warehouse-logistics"
  | "manufacturing"
  | "food-beverage"
  | "hospitality-cleaning"
  | "care-education"
  | "security"
  | "agriculture"
  | "tailoring";

/** Occupation family of each benchmark job, by title. */
export const JOB_FAMILY: Record<string, Family> = {
  "Customer Service Executive": "customer-service",
  "Data Entry Clerk": "clerical",
  "Junior Graphic Designer": "creative-digital",
  "Retail Assistant": "retail",
  Cashier: "retail",
  "Warehouse Packer": "warehouse-logistics",
  "Production Operator": "manufacturing",
  "Quality Control Inspector": "manufacturing",
  Barista: "food-beverage",
  "Kitchen Helper": "food-beverage",
  "Administrative Assistant": "clerical",
  "Call Centre Agent": "customer-service",
  "IT Support Technician": "software-it",
  "Junior Web Developer": "software-it",
  "Accounts Clerk": "finance",
  "Housekeeping Attendant": "hospitality-cleaning",
  "Front Desk Receptionist": "customer-service",
  "Care Assistant": "care-education",
  "Pharmacy Assistant": "retail",
  "Laundry Operator": "hospitality-cleaning",
  "Security Monitoring Officer": "security",
  "Tailoring Assistant": "tailoring",
  "Agricultural Worker": "agriculture",
  "Assembly Line Worker": "manufacturing",
  "Social Media Assistant": "creative-digital",
  "Teacher Aide (Special Education)": "care-education",
  "Delivery Rider": "warehouse-logistics",
  "Bakery Assistant": "food-beverage",
  "Insurance Telesales Agent": "customer-service",
  "Library Assistant": "clerical",
};

/** Families that suit each sample job-seeker (researcher-defined). */
export const CANDIDATE_FAMILIES: Record<string, Family[]> = {
  "C-0001": ["clerical", "finance"], // office management diploma, admin clerk
  "C-0002": ["creative-digital"], // graphic design diploma, freelance design
  "C-0003": ["warehouse-logistics", "retail", "hospitality-cleaning"], // packing, stockroom, cleaning
  "C-0004": ["customer-service"], // business degree, telco call centre
  "C-0005": ["software-it"], // computer science degree, web projects
  "C-0006": ["food-beverage"], // SKM food preparation
  "C-0007": ["manufacturing"], // production operator, machine operation
  "C-0008": ["tailoring", "retail"], // home tailoring business
  "C-0009": ["finance", "clerical"], // accounting diploma, accounts assistant
  "C-0010": ["software-it"], // repairs laptops and phones
  "C-0011": ["hospitality-cleaning"], // hotel housekeeping internship
  "C-0012": ["agriculture"], // family paddy farm
  "C-0013": ["creative-digital"], // mass communication, writes a blog
  "C-0014": ["security"], // guard-house CCTV monitoring
  "C-0015": ["care-education"], // caregiving, part nursing diploma
  "C-0016": ["food-beverage"], // SKM bakery
};

/** The text the recommender compares for a job (shared with the dashboard). */
export function jobText(
  job: Pick<Job, "skills" | "title" | "description">,
): string {
  return `${job.skills}, ${job.title}, ${job.description ?? ""}`;
}

export interface CandidateResult {
  candidateId: string;
  relevantOpen: number;
  top: { title: string; score: number; relevant: boolean }[];
  precisionAtK: number;
  rPrecisionAtK: number;
  hitAt1: number;
  reciprocalRank: number;
  randomPrecision: number;
  bestPossiblePrecision: number;
}

export interface EvaluationReport {
  k: number;
  jobsEvaluated: number;
  candidatesEvaluated: number;
  candidatesSkipped: string[];
  meanPrecisionAtK: number;
  meanRPrecisionAtK: number;
  hitRateAt1: number;
  meanReciprocalRank: number;
  meanRandomPrecision: number;
  meanBestPossiblePrecision: number;
  perCandidate: CandidateResult[];
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export function evaluateRecommender(
  jobs: Pick<Job, "id" | "title" | "skills" | "description" | "status">[],
  candidates: Candidate[],
  k = 5,
): EvaluationReport {
  const open = jobs.filter((j) => j.status === "open" && JOB_FAMILY[j.title]);
  const perCandidate: CandidateResult[] = [];
  const skipped: string[] = [];

  for (const c of candidates) {
    const families = new Set(CANDIDATE_FAMILIES[c.id] ?? []);
    const isRelevant = (title: string) => families.has(JOB_FAMILY[title]);
    const relevantOpen = open.filter((j) => isRelevant(j.title)).length;
    if (relevantOpen === 0) {
      skipped.push(c.id); // no suitable open job exists, so precision is undefined
      continue;
    }
    const ranked = rankBySimilarity(
      candidateText(c),
      open.map((job) => ({ id: job.id, text: jobText(job), job })),
    );
    const top = ranked.slice(0, k).map((r) => ({
      title: r.item.job.title,
      score: Math.round(r.score * 1000) / 1000,
      relevant: isRelevant(r.item.job.title),
    }));
    const hits = top.filter((t) => t.relevant).length;
    const firstHit = ranked.findIndex((r) => isRelevant(r.item.job.title));
    perCandidate.push({
      candidateId: c.id,
      relevantOpen,
      top,
      precisionAtK: hits / k,
      rPrecisionAtK: hits / Math.min(k, relevantOpen),
      hitAt1: top[0]?.relevant ? 1 : 0,
      reciprocalRank: firstHit >= 0 ? 1 / (firstHit + 1) : 0,
      randomPrecision: relevantOpen / open.length,
      bestPossiblePrecision: Math.min(k, relevantOpen) / k,
    });
  }

  return {
    k,
    jobsEvaluated: open.length,
    candidatesEvaluated: perCandidate.length,
    candidatesSkipped: skipped,
    meanPrecisionAtK: mean(perCandidate.map((r) => r.precisionAtK)),
    meanRPrecisionAtK: mean(perCandidate.map((r) => r.rPrecisionAtK)),
    hitRateAt1: mean(perCandidate.map((r) => r.hitAt1)),
    meanReciprocalRank: mean(perCandidate.map((r) => r.reciprocalRank)),
    meanRandomPrecision: mean(perCandidate.map((r) => r.randomPrecision)),
    meanBestPossiblePrecision: mean(
      perCandidate.map((r) => r.bestPossiblePrecision),
    ),
    perCandidate,
  };
}
