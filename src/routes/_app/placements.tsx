import {
  CalendarCheckIcon,
  ChalkboardTeacherIcon,
  MoneyIcon,
  UserCheckIcon,
} from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BarChart, ChartCard, LineChart, StatCard } from "@/components/charts";
import { PageHeader } from "@/components/oku/PageHeader";
import { RankedBars } from "@/components/oku/RankedBars";
import { SourceNote } from "@/components/oku/SourceNote";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { okuOverviewQuery } from "@/features/oku-stats/queries";
import { placementsQuery } from "@/features/placements/queries";
import {
  medianBand,
  PROGRAMMES,
  type Programme,
  pick,
  slice,
  type YearFilter,
} from "@/features/placements/types";
import { formatNumber, formatPercent, percentOf } from "@/lib/oku-format";

const searchSchema = z.object({
  // The router parses ?year=2024 as a number, so accept both and normalise.
  year: z.coerce
    .string()
    .regex(/^(all|\d{4})$/)
    .optional()
    .default("2025"),
  programme: z.enum(PROGRAMMES).optional().default("total"),
});

export const Route = createFileRoute("/_app/placements")({
  validateSearch: searchSchema,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(placementsQuery()),
      context.queryClient.ensureQueryData(okuOverviewQuery()),
    ]),
  component: PlacementsPage,
});

function FilterSelect({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v && onChange(String(v))}
    >
      <SelectTrigger className="w-60" aria-label={label}>
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

function reviewNote(underReview: number, total: number) {
  return underReview
    ? `${formatNumber(underReview)} placements (${formatPercent(percentOf(underReview, total), 0)}) still under review — not shown`
    : "All placements categorised";
}

function PlacementsPage() {
  const search = Route.useSearch();
  const year = search.year as YearFilter;
  const programme = search.programme as Programme;
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(placementsQuery());
  const { data: overview } = useSuspenseQuery(okuOverviewQuery());
  const { years, meta } = data;

  const total = pick(data.placements[programme], years, year);
  const yearIndex = years.indexOf(Number(year));
  const previous =
    yearIndex > 0 ? data.placements[programme][yearIndex - 1] : null;
  const change = previous ? percentOf(total - previous, previous) : null;

  const sectors = slice(data.sector, years, programme, year);
  const occupations = slice(data.occupation, years, programme, year);
  const salaries = slice(data.salary, years, programme, year, false);
  const salaryKnown = salaries.known;

  const trend = years.map((y, i) => ({
    year: String(y),
    mfj: data.placements.mfj[i],
    dm: data.placements.dm[i],
  }));

  // Support programmes are MYFutureJobs-only and start in 2023.
  const supportYears = years
    .map((y, i) => ({
      year: y,
      programmes: data.support.programmes?.[i] ?? null,
      attendance: data.support.attendance?.[i] ?? null,
      placed: data.placements.mfj[i],
    }))
    .filter((s) => s.attendance);
  const latestSupport = supportYears[supportYears.length - 1];

  const where = year === "all" ? "2021–2025" : year;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="OKU Job Placements"
        description={`OKU placed into jobs in Selangor by PERKESO, ${where}: which sectors and jobs they went to, and what they earn.`}
        actions={
          <>
            <FilterSelect
              label="Programme"
              value={programme}
              onChange={(p) =>
                navigate({
                  search: (s) => ({ ...s, programme: p as Programme }),
                })
              }
              items={PROGRAMMES.map((p) => ({
                value: p,
                label: meta.programmes[p],
              }))}
            />
            <FilterSelect
              label="Year"
              value={year}
              onChange={(y) => navigate({ search: (s) => ({ ...s, year: y }) })}
              items={[
                ...[...years].reverse().map((y) => ({
                  value: String(y),
                  label: String(y),
                })),
                { value: "all", label: "2021–2025 combined" },
              ]}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Placements ${where}`}
          value={formatNumber(total)}
          icon={UserCheckIcon}
          trend={
            change != null
              ? { value: formatPercent(Math.abs(change)), up: change >= 0 }
              : undefined
          }
          sub={
            previous != null
              ? `vs ${formatNumber(previous)} in ${years[yearIndex - 1]}`
              : meta.programmes[programme]
          }
        />
        <StatCard
          label="Median salary band"
          value={salaryKnown ? medianBand(salaries.items) : "—"}
          icon={MoneyIcon}
          sub={`Selangor median wage: RM ${formatNumber(overview.labour.selangorMedianWage)}`}
        />
        <StatCard
          label="Top sector"
          value={sectors.items[0]?.name ?? "—"}
          icon={CalendarCheckIcon}
          sub={
            sectors.items[0]
              ? `${formatPercent(percentOf(sectors.items[0].count, sectors.known), 0)} of placements with a known sector`
              : undefined
          }
        />
        <StatCard
          label={`Support events ${latestSupport?.year ?? ""}`}
          value={
            latestSupport ? formatNumber(latestSupport.programmes ?? 0) : "—"
          }
          icon={ChalkboardTeacherIcon}
          sub={
            latestSupport
              ? `${formatNumber(latestSupport.attendance ?? 0)} attendees at OKU career fairs & weekly interviews`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Placements per year" className="lg:col-span-2">
          <LineChart
            data={trend}
            xKey="year"
            series={[
              { key: "dm", label: meta.programmes.dm },
              { key: "mfj", label: meta.programmes.mfj },
            ]}
            showLegend
            height={300}
          />
        </ChartCard>
        <ChartCard title="Career fairs → jobs (MYFutureJobs)">
          <ul className="flex flex-col gap-4 text-sm">
            {supportYears.map((s) => (
              <li key={s.year} className="flex flex-col gap-0.5">
                <span className="font-medium">{s.year}</span>
                <span className="text-muted-foreground">
                  {formatNumber(s.programmes ?? 0)} events ·{" "}
                  {formatNumber(s.attendance ?? 0)} attendees ·{" "}
                  {formatNumber(s.placed)} placed (
                  {formatPercent(percentOf(s.placed, s.attendance ?? 0))} of
                  attendees)
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Placements include all MYFutureJobs OKU placements that year, not
            only event attendees.
          </p>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sector of the job">
          <RankedBars
            items={sectors.items.slice(0, 12).map((s) => ({
              label: s.name,
              value: s.count,
              caption: formatPercent(percentOf(s.count, sectors.known), 0),
            }))}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            {reviewNote(sectors.underReview, total)}
          </p>
        </ChartCard>
        <ChartCard title="Type of job (MASCO)">
          <RankedBars
            items={occupations.items.map((s) => ({
              label: s.name,
              value: s.count,
              caption: formatPercent(percentOf(s.count, occupations.known), 0),
            }))}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            {reviewNote(occupations.underReview, total)}
          </p>
        </ChartCard>
      </div>

      <ChartCard title="Monthly salary of placed OKU">
        <BarChart
          data={salaries.items}
          xKey="name"
          bars={[{ key: "count", label: "Placements" }]}
          forceBars
          height={300}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          {reviewNote(salaries.underReview, total)}
        </p>
      </ChartCard>

      <SourceNote>
        {meta.source}. Aggregate counts only. Disability Management placements
        are mostly still under review for sector, job type and salary, so those
        charts are dominated by MYFutureJobs placements. Not provided yet:{" "}
        {meta.notProvided.join("; ")}. Under-review counts are computed as total
        minus known categories (the source double-counts MYFutureJobs 2023
        sectors).
      </SourceNote>
    </div>
  );
}
