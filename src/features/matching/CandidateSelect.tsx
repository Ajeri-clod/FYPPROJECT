import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sampleCandidates } from "./candidates";

export const CUSTOM_PROFILE = "custom";

/** Picks a job-seeker profile (or a custom one typed in by the officer). */
export function CandidateSelect({
  value,
  onChange,
  allowCustom = false,
}: {
  value: string;
  onChange: (id: string) => void;
  allowCustom?: boolean;
}) {
  const items = [
    ...sampleCandidates.map((c) => ({
      value: c.id,
      label: `${c.id} · ${c.district} · ${c.education.split(" — ")[0]}`,
    })),
    ...(allowCustom
      ? [{ value: CUSTOM_PROFILE, label: "Custom profile…" }]
      : []),
  ];
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v && onChange(String(v))}
    >
      <SelectTrigger className="w-80 max-w-full" aria-label="Job-seeker">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
