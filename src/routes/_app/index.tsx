import {
  BriefcaseIcon,
  CalendarPlusIcon,
  UsersThreeIcon,
  WheelchairIcon,
} from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChartCard, LineChart, PieChart, StatCard } from "@/components/charts";
import { PageHeader } from "@/components/oku/PageHeader";
import { RankedBars } from "@/components/oku/RankedBars";
import { SourceNote } from "@/components/oku/SourceNote";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { okuOverviewQuery } from "@/features/oku-stats/queries";
import { formatNumber, formatPercent, percentOf } from "@/lib/oku-format";

export const Route = createFileRoute("/_app/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(okuOverviewQuery()),
  component: OverviewPage,
});

function OverviewPage() {
  const { data } = useSuspenseQuery(okuOverviewQuery());
  const { all, meta, districtSummary } = data;

  const years = all.registrationsByYear;
  const latest = years[years.length - 1];
  const previous = years[years.length - 2];
  const yoy = percentOf(latest.count - previous.count, previous.count);
  const employmentRate = percentOf(all.employedWorkingAge, all.workingAge);

  const statusSlices = all.employmentStatusWorkingAge.filter((s) => s.count);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="OKU registrations and employment across Selangor, at a glance. Drill into each module from the sidebar."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registered OKU"
          value={formatNumber(all.total)}
          icon={UsersThreeIcon}
          sub={`Approved by JKM, ${years[0].name}–${latest.name}`}
        />
        <StatCard
          label="Working age (15–64)"
          value={formatNumber(all.workingAge)}
          icon={WheelchairIcon}
          progress={percentOf(all.workingAge, all.total)}
          sub={`${formatPercent(percentOf(all.workingAge, all.total))} of registrations`}
        />
        <StatCard
          label="Employment rate"
          value={formatPercent(employmentRate)}
          icon={BriefcaseIcon}
          progress={employmentRate}
          sub={`${formatNumber(all.employedWorkingAge)} working-age OKU in work`}
        />
        <StatCard
          label={`New registrations ${latest.name}`}
          value={formatNumber(latest.count)}
          icon={CalendarPlusIcon}
          trend={{
            value: formatPercent(Math.abs(yoy)),
            up: yoy >= 0,
          }}
          sub={`vs ${formatNumber(previous.count)} in ${previous.name}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="New registrations per year" className="lg:col-span-2">
          <LineChart
            data={years}
            xKey="name"
            series={[{ key: "count", label: "Registrations" }]}
            height={420}
          />
        </ChartCard>
        <ChartCard title="Employment status (working age)">
          <PieChart
            data={statusSlices}
            nameKey="name"
            valueKey="count"
            height={200}
            showLabel={false}
          />
          <RankedBars
            className="mt-2"
            items={statusSlices.map((s) => ({
              label: s.name,
              value: percentOf(s.count, all.workingAge),
            }))}
            format={(v) => formatPercent(v)}
            max={100}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Registrations by disability category">
          <RankedBars
            items={all.category.map((c) => ({
              label: c.name,
              value: c.count,
            }))}
          />
        </ChartCard>
        <ChartCard
          title="Districts"
          className="lg:col-span-2"
          action={
            <Link
              to="/employment"
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Employment detail →
            </Link>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>District</TableHead>
                <TableHead className="text-right">Registered</TableHead>
                <TableHead className="text-right">Working age</TableHead>
                <TableHead className="text-right">Employed</TableHead>
                <TableHead className="text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {districtSummary.map((d) => (
                <TableRow key={d.name}>
                  <TableCell>
                    <Link
                      to="/profiles"
                      search={{ district: d.name }}
                      className="font-medium hover:underline"
                    >
                      {d.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(d.total)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(d.workingAge)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(d.employed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(d.rate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartCard>
      </div>

      <SourceNote>
        {meta.source}. {formatNumber(meta.records)} records, aggregated on{" "}
        {meta.generatedOn}. Employment rate = OKU aged{" "}
        {meta.workingAgeDefinition} working in the private sector, government or
        self-employed.
      </SourceNote>
    </div>
  );
}
