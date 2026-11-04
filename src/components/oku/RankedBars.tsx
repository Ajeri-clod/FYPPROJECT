import { cn } from "@/lib/utils";

export interface RankedBarItem {
  label: string;
  value: number;
  /** Optional right-hand caption, e.g. "1,204 of 4,210". */
  caption?: string;
}

export interface RankedBarsProps {
  items: RankedBarItem[];
  /** Value formatter for the number at the end of each bar. */
  format?: (value: number) => string;
  /** Scale bars against this instead of the largest value (e.g. 100 for %). */
  max?: number;
  className?: string;
}

/**
 * Horizontal ranked bars in plain HTML — readable with long category names and
 * fully accessible to screen readers (each row is text, not an SVG shape).
 */
export function RankedBars({
  items,
  format = (v) => v.toLocaleString("en-MY"),
  max,
  className,
}: RankedBarsProps) {
  const scale = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {item.caption ? (
                <span className="mr-2 text-xs">{item.caption}</span>
              ) : null}
              <span className="font-medium text-foreground">
                {format(item.value)}
              </span>
            </span>
          </div>
          <div className="h-2 w-full bg-muted" aria-hidden>
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min(100, (item.value / scale) * 100)}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
