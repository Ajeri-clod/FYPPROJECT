import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/db/schema";
import { ActionMenu, type ChipColor, StatusChip } from "@/infra/ui";
import { formatSalaryRange } from "@/lib/oku-format";
import { type JobStatus, parseSkills } from "./schema";

const statusColorMap: Record<JobStatus, ChipColor> = {
  open: "success",
  closed: "default",
};

export interface JobTableContext {
  onEdit: (row: Job) => void;
  onDelete: (row: Job) => void;
}

export function createJobColumns(context: JobTableContext): ColumnDef<Job>[] {
  return [
    {
      accessorKey: "title",
      header: "Position",
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-medium">{info.row.original.title}</span>
          <span className="text-xs text-muted-foreground">
            {info.row.original.employer}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "district",
      header: "District",
    },
    {
      accessorKey: "industry",
      header: "Industry",
      enableSorting: false,
    },
    {
      accessorKey: "skills",
      header: "Required skills",
      enableSorting: false,
      cell: (info) => {
        const skills = parseSkills(info.getValue() as string);
        return (
          <div className="flex max-w-xs flex-wrap gap-1">
            {skills.slice(0, 3).map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
            {skills.length > 3 ? (
              <Badge variant="secondary">+{skills.length - 3}</Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "salaryMax",
      header: "Salary (RM)",
      cell: (info) => (
        <span className="tabular-nums">
          {formatSalaryRange(
            info.row.original.salaryMin,
            info.row.original.salaryMax,
          )}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: (info) => (
        <StatusChip
          status={info.getValue() as JobStatus}
          colorMap={statusColorMap}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex justify-end">
            <ActionMenu
              onEdit={() => context.onEdit(row)}
              onDelete={() => context.onDelete(row)}
            />
          </div>
        );
      },
    },
  ];
}
