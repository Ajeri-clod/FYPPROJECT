import { InfoIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

/** Footnote naming where a page's numbers come from. */
export function SourceNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <InfoIcon size={14} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Marks a page that still runs on sample data. */
export function SampleDataBadge() {
  return (
    <Badge
      variant="outline"
      className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
    >
      Sample data
    </Badge>
  );
}
