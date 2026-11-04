import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type Job, jobs, type NewJob } from "@/db/schema";
import { drizzleRepository } from "@/infra/data/drizzle-repository";
import { memoryRepository } from "@/infra/data/memory-repository";
import type { Repository } from "@/infra/data/repository";
import { hasDatabase } from "@/lib/backend";
import { requireUser } from "@/lib/require-user";
import { demoJobs } from "./demo-data";
import {
  type JobListParams,
  jobInputSchema,
  jobListParamsSchema,
  jobUpdateSchema,
} from "./schema";

/**
 * Job postings — Postgres via Drizzle when DATABASE_URL is set, otherwise the
 * in-memory adapter seeded with sample postings (zero-config `bun dev`).
 */
export const jobsRepository: Repository<Job, NewJob> = hasDatabase
  ? drizzleRepository(jobs, {
      searchColumns: [jobs.title, jobs.employer, jobs.skills],
      sortColumns: {
        title: jobs.title,
        employer: jobs.employer,
        district: jobs.district,
        salaryMax: jobs.salaryMax,
        createdAt: jobs.createdAt,
      },
      filterColumns: {
        status: jobs.status,
        district: jobs.district,
        industry: jobs.industry,
      },
      defaultSort: { column: jobs.createdAt, dir: "desc" },
      updatedAtKey: "updatedAt",
    })
  : memoryRepository<Job, NewJob>(demoJobs, {
      searchFields: ["title", "employer", "skills"],
      sortFields: ["title", "employer", "district", "salaryMax", "createdAt"],
      filterFields: ["status", "district", "industry"],
      defaultSort: { field: "createdAt", dir: "desc" },
      updatedAtKey: "updatedAt",
      createdAtKey: "createdAt",
    });

function toListParams(data: JobListParams) {
  const filters: Record<string, string> = {};
  if (data.status) filters.status = data.status;
  if (data.district) filters.district = data.district;
  if (data.industry) filters.industry = data.industry;
  return {
    page: data.page,
    pageSize: data.pageSize,
    search: data.search,
    sortBy: data.sortBy,
    sortDir: data.sortDir,
    filters: Object.keys(filters).length ? filters : undefined,
  };
}

export const listJobs = createServerFn({ method: "GET" })
  .validator((data: JobListParams) => jobListParamsSchema.parse(data))
  .handler(async ({ data }) => {
    await requireUser();
    return jobsRepository.list(toListParams(data));
  });

/** Every posting (used by the analytics + matching pages, which need the full set). */
export const listAllJobs = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireUser();
    const { rows } = await jobsRepository.list({ page: 1, pageSize: 10_000 });
    return rows;
  },
);

export const getJob = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().min(1).parse(id))
  .handler(async ({ data: id }) => {
    await requireUser();
    return jobsRepository.getOne(id);
  });

export const createJob = createServerFn({ method: "POST" })
  .validator((data: unknown) => jobInputSchema.parse(data))
  .handler(async ({ data }) => {
    await requireUser();
    return jobsRepository.create(data);
  });

export const updateJob = createServerFn({ method: "POST" })
  .validator((data: unknown) => jobUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    await requireUser();
    const { id, ...values } = data;
    return jobsRepository.update(id, values);
  });

export const deleteJob = createServerFn({ method: "POST" })
  .validator((id: string) => z.string().min(1).parse(id))
  .handler(async ({ data: id }) => {
    await requireUser();
    await jobsRepository.remove(id);
    return { id };
  });
