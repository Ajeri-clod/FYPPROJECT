import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toastError, toastSuccess } from "@/lib/toast";
import type { JobInput, JobListParams, JobUpdate } from "./schema";
import {
  createJob,
  deleteJob,
  listAllJobs,
  listJobs,
  updateJob,
} from "./server";

export const jobsKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobsKeys.all, "list"] as const,
  list: (params: JobListParams) => [...jobsKeys.lists(), params] as const,
  everything: () => [...jobsKeys.all, "everything"] as const,
};

export function jobsListQuery(params: JobListParams) {
  return queryOptions({
    queryKey: jobsKeys.list(params),
    queryFn: () => listJobs({ data: params }),
  });
}

export function allJobsQuery() {
  return queryOptions({
    queryKey: jobsKeys.everything(),
    queryFn: () => listAllJobs(),
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JobInput) => createJob({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all });
      toastSuccess("Job posting added");
    },
    onError: (err) => toastError(err, "Failed to add job posting"),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JobUpdate) => updateJob({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all });
      toastSuccess("Job posting updated");
    },
    onError: (err) => toastError(err, "Failed to update job posting"),
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJob({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.all });
      toastSuccess("Job posting deleted");
    },
    onError: (err) => toastError(err, "Failed to delete job posting"),
  });
}
