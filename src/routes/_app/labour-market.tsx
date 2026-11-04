import {
  BuildingsIcon,
  CurrencyCircleDollarIcon,
  HandHeartIcon,
  MegaphoneIcon,
} from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { BarChart, ChartCard, PieChart, StatCard } from "@/components/charts";
import { PageHeader } from "@/components/oku/PageHeader";
import { RankedBars } from "@/components/oku/RankedBars";
import { SampleDataBadge, SourceNote } from "@/components/oku/SourceNote";
import { Button } from "@/components/ui/button";
import { allJobsQuery } from "@/features/jobs/queries";
import { countSkills } from "@/features/matching/skill-gap";
import { formatNumber, formatPercent, percentOf } from "@/lib/oku-format";

export const Route = createFileRoute("/_app/labour-market")({
  loader: ({ context }) => context.queryClient.ensureQueryData(allJobsQuery()),
  component: LabourMarketPage,
});

function tally(values: string[]) {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function LabourMarketPage() {
  const { data: jobs } = useSuspenseQuery(allJobsQuery());

  const insights = useMemo(() => {
    const open = jobs.filter((j) => j.status === "open");
    const midpoints = open
      .filter((j) => j.salaryMin != null && j.salaryMax != null)
      .map((j) => ((j.salaryMin ?? 0) + (j.salaryMax ?? 0)) / 2);
    return {
      open,
      employers: new Set(open.map((j) => j.employer)).size,
      medianSalary: median(midpoints),
      withAccommodations: open.filter((j) => j.accommodations?.trim()).length,
      byIndustry: tally(open.map((j) => j.industry)),
      byDistrict: tally(open.map((j) => j.district)),
      byType: tally(open.map((j) => j.employmentType)),
      skills: countSkills(open.map((j) => j.skills)).slice(0, 12),
    };
  }, [jobs]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Labour Market Insights"
        description="What Selangor employers are hiring for: industries, locations, pay and the skills they ask for."
        actions={
          <>
            <SampleDataBadge />
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/jobs" />}
            >
              Manage postings
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open postings"
          value={formatNumber(insights.open.length)}
          icon={MegaphoneIcon}
          sub={`${formatNumber(jobs.length - insights.open.length)} closed`}
        />
        <StatCard
          label="Hiring employers"
          value={formatNumber(insights.employers)}
          icon={BuildingsIcon}
        />
        <StatCard
          label="Median monthly salary"
          value={`RM ${formatNumber(Math.round(insights.medianSalary))}`}
          icon={CurrencyCircleDollarIcon}
          sub="Mid-point of advertised range"
        />
        <StatCard
          label="Offer accommodations"
          value={formatPercent(
            percentOf(insights.withAccommodations, insights.open.length),
          )}
          icon={HandHeartIcon}
          progress={percentOf(
            insights.withAccommodations,
            insights.open.length,
          )}
          sub={`${insights.withAccommodations} postings list OKU-friendly support`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Most requested skills">
          <RankedBars
            items={insights.skills.map((s) => ({
              label: s.skill,
              value: s.count,
              caption: formatPercent(
                percentOf(s.count, insights.open.length),
                0,
              ),
            }))}
          />
        </ChartCard>
        <ChartCard title="Open postings by industry">
          <RankedBars
            items={insights.byIndustry.map((i) => ({
              label: i.name,
              value: i.count,
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Open postings by district" className="lg:col-span-2">
          <BarChart
            data={insights.byDistrict}
            xKey="name"
            bars={[{ key: "count", label: "Postings" }]}
            forceBars
            height={280}
          />
        </ChartCard>
        <ChartCard title="Employment type">
          <PieChart
            data={insights.byType}
            nameKey="name"
            valueKey="count"
            height={280}
          />
        </ChartCard>
      </div>

      <SourceNote>
        Built from the Job Postings list. It currently holds sample Selangor
        vacancies — load the scraped job-portal data (JobsMalaysia, Jobstreet,
        Hiredly) to replace them.
      </SourceNote>
    </div>
  );
}
