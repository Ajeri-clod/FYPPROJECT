import {
  BriefcaseIcon,
  HandshakeIcon,
  UserCircleDashedIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BarChart, ChartCard, PieChart, StatCard } from "@/components/charts";
import { DistrictSelect } from "@/components/oku/DistrictSelect";
import { PageHeader } from "@/components/oku/PageHeader";
import { RankedBars } from "@/components/oku/RankedBars";
import { SourceNote } from "@/components/oku/SourceNote";
import {
  okuAggregateQuery,
  okuOverviewQuery,
} from "@/features/oku-stats/queries";
import type { EmploymentRate } from "@/features/oku-stats/types";
import { formatNumber, formatPercent, percentOf } from "@/lib/oku-format";

const searchSchema = z.object({
  district: z.string().optional().default(""),
});

export const Route = createFileRoute("/_app/employment")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ district: search.district }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(okuOverviewQuery()),
      context.queryClient.ensureQueryData(okuAggregateQuery(deps.district)),
    ]),
  component: EmploymentPage,
});

function rateBars(rows: EmploymentRate[]) {
  return rows
    .filter((r) => r.workingAge > 0)
    .map((r) => ({
      label: r.name,
      value: r.rate,
      caption: `${formatNumber(r.employed)} of ${formatNumber(r.workingAge)}`,
    }));
}

function EmploymentPage() {
  const { district } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: overview } = useSuspenseQuery(okuOverviewQuery());
  const { data: agg } = useSuspenseQuery(okuAggregateQuery(district));

  const rate = percentOf(agg.employedWorkingAge, agg.workingAge);
  const selangorRate = percentOf(
    overview.all.employedWorkingAge,
    overview.all.workingAge,
  );
  const notWorking =
    agg.employmentStatusWorkingAge.find((s) => s.name === "Not working")
      ?.count ?? 0;
  const selfEmployed =
    agg.employmentStatus.find((s) => s.name === "Self-employed")?.count ?? 0;
  const statusSlices = agg.employmentStatusWorkingAge.filter((s) => s.count);
  const byDistrict = [...overview.districtSummary].sort(
    (a, b) => b.rate - a.rate,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employment Statistics"
        description={`Employment of working-age OKU (${overview.meta.workingAgeDefinition}) in ${district || "Selangor"}, by disability, age, gender and occupation.`}
        actions={
          <DistrictSelect
            districts={overview.districts}
            value={district}
            onChange={(d) => navigate({ search: { district: d } })}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Working-age OKU"
          value={formatNumber(agg.workingAge)}
          icon={UsersIcon}
          sub={`${formatPercent(percentOf(agg.workingAge, agg.total))} of registrations`}
        />
        <StatCard
          label="Employment rate"
          value={formatPercent(rate)}
          icon={BriefcaseIcon}
          progress={rate}
          trend={
            district
              ? {
                  value: `${Math.abs(rate - selangorRate).toFixed(1)} pts`,
                  up: rate >= selangorRate,
                }
              : undefined
          }
          sub={
            district
              ? `Selangor average ${formatPercent(selangorRate)}`
              : `${formatNumber(agg.employedWorkingAge)} in work`
          }
        />
        <StatCard
          label="Not working"
          value={formatNumber(notWorking)}
          icon={UserCircleDashedIcon}
          progress={percentOf(notWorking, agg.workingAge)}
          sub="Working-age OKU without a job — the target group for matching"
        />
        <StatCard
          label="Self-employed"
          value={formatNumber(selfEmployed)}
          icon={HandshakeIcon}
          sub="Entrepreneurs — candidates for TEKUN / SOCSO grants"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Employment status (working age)">
          <PieChart
            data={statusSlices}
            nameKey="name"
            valueKey="count"
            height={260}
            showLabel={false}
          />
          <RankedBars
            className="mt-2"
            items={statusSlices.map((s) => ({
              label: s.name,
              value: percentOf(s.count, agg.workingAge),
            }))}
            format={(v) => formatPercent(v)}
            max={100}
          />
        </ChartCard>
        <ChartCard
          title="Employment rate by disability category"
          className="lg:col-span-2"
        >
          <RankedBars
            items={rateBars(agg.employmentByCategory)}
            format={(v) => formatPercent(v)}
            max={100}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Employment rate by age group">
          <BarChart
            data={agg.employmentByAgeBand}
            xKey="name"
            bars={[{ key: "rate", label: "Employment rate (%)" }]}
            forceBars
            height={260}
          />
        </ChartCard>
        <ChartCard title="Employment rate by gender">
          <RankedBars
            items={rateBars(agg.employmentByGender)}
            format={(v) => formatPercent(v)}
            max={100}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Occupation of employed OKU">
          <RankedBars
            items={agg.occupation.map((o) => ({
              label: o.name,
              value: o.count,
            }))}
          />
        </ChartCard>
        <ChartCard title="Employment rate by district">
          <RankedBars
            items={byDistrict.map((d) => ({
              label: d.name,
              value: d.rate,
              caption: `${formatNumber(d.employed)} of ${formatNumber(d.workingAge)}`,
            }))}
            format={(v) => formatPercent(v)}
            max={100}
          />
        </ChartCard>
      </div>

      <SourceNote>
        {overview.meta.source}. Employed = private sector, government or
        self-employed. Occupation groups follow the JKM form (MASCO major groups
        and civil-service schemes).
      </SourceNote>
    </div>
  );
}
