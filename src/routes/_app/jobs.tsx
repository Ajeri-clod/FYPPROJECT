import { PlusIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FormError,
  NumberField,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from "@/components/form";
import { PageHeader } from "@/components/oku/PageHeader";
import { SampleDataBadge } from "@/components/oku/SourceNote";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Job } from "@/db/schema";
import { createJobColumns } from "@/features/jobs/columns";
import { jobFilters, jobTableConfig } from "@/features/jobs/config";
import {
  jobsListQuery,
  useCreateJob,
  useDeleteJob,
  useUpdateJob,
} from "@/features/jobs/queries";
import {
  employmentTypes,
  industries,
  type JobFormValues,
  jobFormSchema,
  jobInputSchema,
  jobListParamsSchema,
  jobStatuses,
  selangorDistricts,
} from "@/features/jobs/schema";
import { DataTable, useTableSearch } from "@/infra/table";
import { errorMessage } from "@/lib/toast";

export const Route = createFileRoute("/_app/jobs")({
  validateSearch: jobListParamsSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(jobsListQuery(deps)),
  component: JobsPage,
});

type DialogState = { mode: "create" | "edit"; row?: Job } | null;

function JobsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const table = useTableSearch(search, navigate);
  const [dialog, setDialog] = useState<DialogState>(null);

  const query = useQuery({
    ...jobsListQuery(search),
    placeholderData: keepPreviousData,
  });
  const remove = useDeleteJob();
  const confirm = useConfirm();

  const columns = useMemo(
    () =>
      createJobColumns({
        onEdit: (row) => setDialog({ mode: "edit", row }),
        onDelete: async (row) => {
          const ok = await confirm({
            title: `Delete "${row.title}" at ${row.employer}?`,
            description:
              "The posting is removed from labour-market insights and job matching.",
            confirmLabel: "Delete",
            destructive: true,
          });
          if (ok) remove.mutate(row.id);
        },
      }),
    [remove, confirm],
  );

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title="Job Postings"
        description="Vacancies in Selangor from online job portals and partner employers. Open postings feed Labour Market Insights and Job Recommendations."
        actions={<SampleDataBadge />}
      />

      <DataTable
        columns={columns}
        data={query.data?.rows ?? []}
        total={query.data?.total ?? 0}
        isLoading={query.isLoading || query.isFetching}
        searchValue={search.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={jobTableConfig.searchPlaceholder}
        filters={jobFilters}
        filterValues={{
          status: search.status,
          district: search.district,
          industry: search.industry,
        }}
        onFilterChange={table.setFilter}
        onRefresh={() => query.refetch()}
        sorting={table.sorting}
        onSortingChange={table.onSortingChange}
        page={search.page}
        pageSize={search.pageSize}
        pageSizeOptions={jobTableConfig.pageSizeOptions}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        emptyMessage={jobTableConfig.emptyMessage}
        toolbarActions={
          <Button onClick={() => setDialog({ mode: "create" })}>
            <PlusIcon size={16} />
            Add posting
          </Button>
        }
      />

      <JobFormDialog
        open={dialog !== null}
        mode={dialog?.mode ?? "create"}
        row={dialog?.row}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      />
    </div>
  );
}

const EMPTY_FORM: JobFormValues = {
  title: "",
  employer: "",
  industry: "",
  district: "",
  employmentType: "Full-time",
  skills: "",
  description: "",
  accommodations: "",
  salaryMin: null,
  salaryMax: null,
  status: "open",
  source: "Manual entry",
};

const toOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));
const statusOptions = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] satisfies { value: (typeof jobStatuses)[number]; label: string }[];

function toForm(row?: Job): JobFormValues {
  if (!row) return { ...EMPTY_FORM };
  return {
    title: row.title,
    employer: row.employer,
    industry: row.industry,
    district: row.district,
    employmentType: row.employmentType as JobFormValues["employmentType"],
    skills: row.skills,
    description: row.description ?? "",
    accommodations: row.accommodations ?? "",
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    status: row.status as JobFormValues["status"],
    source: row.source,
  };
}

function JobFormDialog({
  open,
  mode,
  row,
  onOpenChange,
}: {
  open: boolean;
  mode: "create" | "edit";
  row?: Job;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit job posting" : "New job posting"}
          </DialogTitle>
          <DialogDescription>
            Required skills drive the TF-IDF job matching — list them separated
            by commas.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <JobForm
            key={row?.id ?? "new"}
            mode={mode}
            row={row}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function JobForm({
  mode,
  row,
  onDone,
}: {
  mode: "create" | "edit";
  row?: Job;
  onDone: () => void;
}) {
  const create = useCreateJob();
  const update = useUpdateJob();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: toForm(row),
    validators: { onChange: jobFormSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const payload = jobInputSchema.parse(value);
      try {
        if (mode === "edit" && row) {
          await update.mutateAsync({ id: row.id, ...payload });
        } else {
          await create.mutateAsync(payload);
        }
        onDone();
      } catch (err) {
        setServerError(errorMessage(err));
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <FormError message={serverError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField form={form} name="title" label="Job title" required />
        <TextField form={form} name="employer" label="Employer" required />
        <SelectField
          form={form}
          name="industry"
          label="Industry"
          placeholder="Select industry"
          options={toOptions(industries)}
          required
        />
        <SelectField
          form={form}
          name="district"
          label="District"
          placeholder="Select district"
          options={toOptions(selangorDistricts)}
          required
        />
        <SelectField
          form={form}
          name="employmentType"
          label="Employment type"
          options={toOptions(employmentTypes)}
        />
        <SelectField
          form={form}
          name="status"
          label="Status"
          options={statusOptions}
        />
        <NumberField
          form={form}
          name="salaryMin"
          label="Salary from (RM / month)"
          min={0}
          step={50}
        />
        <NumberField
          form={form}
          name="salaryMax"
          label="Salary to (RM / month)"
          min={0}
          step={50}
        />
      </div>

      <TextareaField
        form={form}
        name="skills"
        label="Required skills"
        description="Comma-separated, e.g. customer service, Microsoft Excel, Bahasa Malaysia"
        rows={2}
        required
      />
      <TextareaField
        form={form}
        name="description"
        label="Job description"
        rows={3}
      />
      <TextareaField
        form={form}
        name="accommodations"
        label="Workplace accommodations"
        description="Ramp / lift access, screen-reader support, sign language, job coach…"
        rows={2}
      />
      <TextField form={form} name="source" label="Source" />

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <SubmitButton form={form}>Save posting</SubmitButton>
      </DialogFooter>
    </form>
  );
}
