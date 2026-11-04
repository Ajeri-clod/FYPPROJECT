import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export interface DistrictSelectProps {
  districts: string[];
  /** Selected district; empty string = all of Selangor. */
  value: string;
  onChange: (district: string) => void;
}

/** District filter shared by the OKU pages (state lives in the URL). */
export function DistrictSelect({
  districts,
  value,
  onChange,
}: DistrictSelectProps) {
  const items = [
    { value: ALL, label: "All of Selangor" },
    ...districts.map((d) => ({ value: d, label: d })),
  ];
  return (
    <Select
      items={items}
      value={value || ALL}
      onValueChange={(v) => onChange(!v || v === ALL ? "" : String(v))}
    >
      <SelectTrigger className="w-52" aria-label="Filter by district">
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
