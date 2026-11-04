import {
  BabyIcon,
  GenderIntersexIcon,
  PuzzlePieceIcon,
  UsersThreeIcon,
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
import { formatNumber, formatPercent, percentOf } from "@/lib/oku-format";

const searchSchema = z.object({
  district: z.string().optional().default(""),
});

export const Route = createFileRoute("/_app/profiles")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ district: search.district }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(okuOverviewQuery()),
      context.queryClient.ensureQueryData(okuAggregateQuery(deps.district)),
    ]),
  component: ProfilesPage,
});

function ProfilesPage() {
  const { district } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: overview } = useSuspenseQuery(okuOverviewQuery());
  const { data: agg } = useSuspenseQuery(okuAggregateQuery(district));

  const female = agg.gender.find((g) => g.name === "Female")?.count ?? 0;
  const children = agg.ageBands.find((b) => b.name === "0–14")?.count ?? 0;
  const topCategory = agg.category[0];
  const where = district || "Selangor";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="OKU Profiles"
        description={`Who is registered as OKU in ${where}: disability categories, age, gender and household background.`}
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
          label="Registered OKU"
          value={formatNumber(agg.total)}
          icon={UsersThreeIcon}
          sub={
            district
              ? `${formatPercent(percentOf(agg.total, overview.all.total))} of Selangor`
              : `${overview.districts.length} JKM district offices`
          }
        />
        <StatCard
          label="Most common category"
          value={topCategory.name}
          icon={PuzzlePieceIcon}
          progress={percentOf(topCategory.count, agg.total)}
          sub={`${formatPercent(percentOf(topCategory.count, agg.total))} of registrations`}
        />
        <StatCard
          label="Female"
          value={formatPercent(percentOf(female, agg.total))}
          icon={GenderIntersexIcon}
          progress={percentOf(female, agg.total)}
          sub={`${formatNumber(female)} women and girls`}
        />
        <StatCard
          label="Children (0–14)"
          value={formatPercent(percentOf(children, agg.total))}
          icon={BabyIcon}
          progress={percentOf(children, agg.total)}
          sub={`${formatNumber(children)} future job-seekers`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Disability category">
          <RankedBars
            items={agg.category.map((c) => ({
              label: c.name,
              value: c.count,
              caption: formatPercent(percentOf(c.count, agg.total)),
            }))}
          />
        </ChartCard>
        <ChartCard title="Top 10 sub-categories">
          <RankedBars
            items={agg.subCategory.map((c) => ({
              label: c.name,
              value: c.count,
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Age distribution" className="lg:col-span-2">
          <BarChart
            data={agg.ageBands}
            xKey="name"
            bars={[{ key: "count", label: "OKU" }]}
            forceBars
            height={280}
          />
        </ChartCard>
        <ChartCard title="Gender">
          <PieChart
            data={agg.gender}
            nameKey="name"
            valueKey="count"
            height={280}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Ethnicity">
          <RankedBars
            items={agg.ethnicity.map((c) => ({
              label: c.name,
              value: c.count,
              caption: formatPercent(percentOf(c.count, agg.total)),
            }))}
          />
        </ChartCard>
        <ChartCard title="Marital status">
          <RankedBars
            items={agg.marital
              .filter((c) => c.count)
              .map((c) => ({
                label: c.name,
                value: c.count,
                caption: formatPercent(percentOf(c.count, agg.total)),
              }))}
          />
        </ChartCard>
      </div>

      <SourceNote>
        {overview.meta.source}. Counts only — no individual records are stored
        in the dashboard.
      </SourceNote>
    </div>
  );
}
