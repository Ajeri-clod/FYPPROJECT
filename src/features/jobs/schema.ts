import { z } from "zod";

export const jobStatuses = ["open", "closed"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;

export const industries = [
  "Retail & Wholesale",
  "Manufacturing",
  "Information & Communication",
  "Food & Beverage",
  "Logistics & Transport",
  "Administrative & Support Services",
  "Hospitality & Tourism",
  "Health & Social Work",
  "Finance & Insurance",
  "Public Administration",
  "Education",
] as const;

export const selangorDistricts = [
  "Gombak",
  "Hulu Langat",
  "Hulu Selangor",
  "Klang",
  "Kuala Langat",
  "Kuala Selangor",
  "Petaling Jaya",
  "Sabak Bernam",
  "Sepang",
  "Shah Alam",
  "Subang Jaya",
] as const;

const optionalSalary = z
  .union([z.number().int().min(0), z.nan(), z.null()])
  .optional()
  .transform((v) => (v == null || Number.isNaN(v) ? null : v));

export const jobInputSchema = z.object({
  title: z.string().trim().min(1, "Job title is required"),
  employer: z.string().trim().min(1, "Employer is required"),
  industry: z.string().min(1, "Industry is required"),
  district: z.string().min(1, "District is required"),
  employmentType: z.enum(employmentTypes),
  skills: z.string().trim().min(1, "List at least one required skill"),
  description: z.string().optional().default(""),
  accommodations: z.string().optional().default(""),
  salaryMin: optionalSalary,
  salaryMax: optionalSalary,
  status: z.enum(jobStatuses),
  source: z.string().optional().default("Manual entry"),
});
export type JobInput = z.input<typeof jobInputSchema>;

/** Client-side form validator (input types match the TanStack Form values). */
export const jobFormSchema = z.object({
  title: z.string().trim().min(1, "Job title is required"),
  employer: z.string().trim().min(1, "Employer is required"),
  industry: z.string().min(1, "Industry is required"),
  district: z.string().min(1, "District is required"),
  employmentType: z.enum(employmentTypes),
  skills: z.string().trim().min(1, "List at least one required skill"),
  description: z.string(),
  accommodations: z.string(),
  salaryMin: z.number().int().min(0).nullish(),
  salaryMax: z.number().int().min(0).nullish(),
  status: z.enum(jobStatuses),
  source: z.string(),
});
export type JobFormValues = z.infer<typeof jobFormSchema>;

export const jobUpdateSchema = jobInputSchema.extend({
  id: z.string().min(1),
});
export type JobUpdate = z.input<typeof jobUpdateSchema>;

export const jobListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  status: z.string().optional().default(""),
  district: z.string().optional().default(""),
  industry: z.string().optional().default(""),
});
export type JobListParams = z.infer<typeof jobListParamsSchema>;

/** Split the stored comma-separated skills string into clean, unique skills. */
export function parseSkills(skills: string | null | undefined): string[] {
  if (!skills) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of skills.split(/[,;\n]/)) {
    const skill = raw.trim();
    const key = skill.toLowerCase();
    if (skill && !seen.has(key)) {
      seen.add(key);
      out.push(skill);
    }
  }
  return out;
}
