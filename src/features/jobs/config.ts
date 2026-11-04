import type { FilterConfig } from "@/infra/table";
import { industries, selangorDistricts } from "./schema";

export const jobFilters: FilterConfig[] = [
  {
    key: "status",
    label: "Filter by status",
    placeholder: "All statuses",
    options: [
      { key: "", label: "All statuses" },
      { key: "open", label: "Open" },
      { key: "closed", label: "Closed" },
    ],
  },
  {
    key: "district",
    label: "Filter by district",
    placeholder: "All districts",
    options: [
      { key: "", label: "All districts" },
      ...selangorDistricts.map((d) => ({ key: d, label: d })),
    ],
  },
  {
    key: "industry",
    label: "Filter by industry",
    placeholder: "All industries",
    options: [
      { key: "", label: "All industries" },
      ...industries.map((i) => ({ key: i, label: i })),
    ],
  },
];

export const jobTableConfig = {
  searchPlaceholder: "Search title, employer or skill…",
  pageSizeOptions: [10, 20, 50],
  defaultPageSize: 10,
  emptyMessage: "No job postings match these filters.",
};
